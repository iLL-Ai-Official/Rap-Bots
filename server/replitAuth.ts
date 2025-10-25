import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Removed REPLIT_DOMAINS check for local development

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
  // Skip authentication setup if REPL_ID is not provided (local development)
  if (!process.env.REPL_ID) {
    console.log('⚠️ REPL_ID not provided - authentication disabled for local development');
    app.set("trust proxy", 1);
    app.use(getSession());
    return;
  }

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

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

  // Clean up REPLIT_DOMAINS: trim whitespace and drop empty entries
  const domains = process.env.REPLIT_DOMAINS!
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
  for (const domain of domains) {
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

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // If REPL_ID is not set, skip authentication for local development
  if (!process.env.REPL_ID) {
    console.log('⚠️ Authentication disabled for local development');
    return next();
  }

  try {
    if (typeof req.isAuthenticated !== 'function') {
      console.log('Passport not initialized');
      return res.status(401).json({ message: "Authentication not configured" });
    }

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
