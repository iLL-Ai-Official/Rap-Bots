import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import express, { type Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import LocalStrategy from 'passport-local';

// Determine auth mode: prefer Replit OIDC when REPLIT_DOMAINS is set.
const hasReplit = !!process.env.REPLIT_DOMAINS;
const authProvider = process.env.AUTH_PROVIDER || (hasReplit ? 'replit' : 'local');

if (!hasReplit && process.env.NODE_ENV === 'production' && authProvider !== 'local') {
  console.error("❌ REPLIT_DOMAINS missing in production and AUTH_PROVIDER is not 'local' - authentication will fail");
  console.error("💡 Set REPLIT_DOMAINS for Replit OIDC, or set AUTH_PROVIDER=local and provide secure credentials for production.");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days for better persistence
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: Math.floor(sessionTtl / 1000), // Convert to seconds for PostgreSQL
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    store: sessionStore,
    resave: true, // Force session save to avoid expiration
    saveUninitialized: true, // Save empty sessions
    rolling: true, // Extend session on activity
    cookie: {
      httpOnly: true,
      secure: false, // Allow non-HTTPS for development
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Ensure new users get proper free tier setup
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    subscriptionTier: "free",
    subscriptionStatus: "free", 
    battlesRemaining: 3,
    lastBattleReset: new Date(),
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  // If AUTH_PROVIDER is set to 'local' or REPLIT_DOMAINS is not present, configure a local strategy
  if (!hasReplit || authProvider === 'local') {
    // Local strategy: username -> user id. Password is ignored in dev by default.
    passport.use(new LocalStrategy.Strategy(async (username: string, password: string, done: any) => {
      try {
        const id = username;
        // Upsert a minimal user record
        await storage.upsertUser({
          id,
          email: `${username}@local`,
          firstName: username,
          lastName: '',
          profileImageUrl: '',
          subscriptionTier: 'free',
          subscriptionStatus: 'free',
          battlesRemaining: 3,
          lastBattleReset: new Date(),
        });
        const user: any = { id };
        // set minimal claims for downstream checks
        user.claims = { sub: id };
        user.expires_at = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365; // 1 year
        return done(null, user);
      } catch (err) {
        return done(err as any);
      }
    }));

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    // JSON login endpoint for local auth
    app.post('/api/login', express.json(), (req, res, next) => {
      passport.authenticate('local', (err: any, user: any) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        req.login(user, (err2: any) => {
          if (err2) return next(err2);
          res.json({ ok: true, user });
        });
      })(req, res, next);
    });

    app.get('/api/logout', (req, res) => {
      req.logout(() => res.json({ ok: true }));
    });
  } else {
    // Replit OIDC provider
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    app.get("/api/login", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      console.log('User not authenticated via Passport');
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as any;
    if (!user || !user.claims) {
      console.log('No user or claims found in session');
      return res.status(401).json({ message: "Unauthorized" });
    }

    // For Pro users with unlimited access, be very lenient
    const userId = user.claims.sub;
    if (userId) {
      try {
        const dbUser = await storage.getUser(userId);
        if (dbUser && dbUser.subscriptionTier === 'pro') {
          // Pro user - always allow access, skip all token checks
          return next();
        }
      } catch (dbError) {
        console.error('Database error checking user:', dbError);
        // Continue with token validation
      }
    }

    // For non-Pro users, check token expiration with generous buffer
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = user.expires_at || user.claims?.exp;
    const bufferTime = 300; // 5 minute buffer
    
    if (!expiresAt || now <= (expiresAt + bufferTime)) {
      return next();
    }

    // Try to refresh token if expired
    const refreshToken = user.refresh_token;
    if (refreshToken) {
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        console.log('Token refreshed successfully');
        return next();
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }

    console.log('Authentication failed - token expired and refresh failed');
    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};