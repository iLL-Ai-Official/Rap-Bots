import express, { type Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { SUBSCRIPTION_TIERS, insertTournamentSchema, processedWebhookEvents, insertWebhookEventSchema } from "@shared/schema";
import { groqService } from "./services/groq";
import { typecastService } from "./services/typecast";
import { barkTTS } from "./services/bark";
import { scoringService } from "./services/scoring";
import { userTTSManager } from "./services/user-tts-manager";
import { crowdReactionService } from "./services/crowdReactionService";
import { createArcBlockchainService } from "./services/arc-blockchain";
import { createVoiceCommandProcessor } from "./services/voice-command-processor";
import { getElevenLabsSFXService, hasSFXServiceAvailable } from "./services/elevenlabs-sfx";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db.js";
import { users, battles, tournaments, battleRoundSubmissions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not provided - Payment features will be unavailable');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Service Worker endpoint for PWA functionality
  app.get('/sw.js', (req, res) => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    
    if (fs.existsSync(swPath)) {
      res.set('Content-Type', 'application/javascript');
      res.set('Cache-Control', 'no-cache');
      res.sendFile(swPath);
    } else {
      res.status(404).send('Service Worker not found');
    }
  });

  // Sitemap.xml endpoint for SEO
  app.get('/sitemap.xml', (req, res) => {
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');

    if (fs.existsSync(sitemapPath)) {
      res.set('Content-Type', 'application/xml');
      res.sendFile(sitemapPath);
    } else {
      res.status(404).send('Sitemap not found');
    }
  });

  // Health check endpoint for deployment monitoring
  app.get('/api/health', (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: !!process.env.DATABASE_URL,
        groq: !!process.env.GROQ_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        stripe: !!process.env.STRIPE_SECRET_KEY,
      }
    };

    console.log('🏥 Health check:', health);
    res.json(health);
  });

  // SFX Audio Files endpoint for serving public sound effects
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "SFX file not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving SFX file:", error);
      return res.status(500).json({ error: "Failed to serve SFX file" });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Subscription management routes
  app.get('/api/subscription/tiers', (req, res) => {
    res.json(SUBSCRIPTION_TIERS);
  });

  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const canBattle = await storage.canUserStartBattle(userId);

      res.json({
        tier: user?.subscriptionTier || 'free',
        status: user?.subscriptionStatus || 'free',
        battlesRemaining: user?.battlesRemaining || 0,
        canStartBattle: canBattle,
        totalBattles: user?.totalBattles || 0,
        totalWins: user?.totalWins || 0,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // One-time battle purchase
  app.post('/api/purchase-battles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { battleCount = 10, paymentMethod = 'stripe' } = req.body; // Default 10 battles for $1

      // Available battle packages with pricing
      const battlePackages = {
        10: { price: 100, description: '10 battles for $1.00' }, // $0.10 per battle
        1500: { price: 10000, description: '1,500 battles for $100.00' } // $0.067 per battle (15 battles per dollar)
      };

      if (!battlePackages[battleCount as keyof typeof battlePackages]) {
        const available = Object.keys(battlePackages).join(', ');
        return res.status(400).json({ 
          message: `Invalid battle count. Available packages: ${available} battles` 
        });
      }

      // Simplified CashApp flow for battle packs
      if (paymentMethod === 'cashapp') {
        const packageInfo = battlePackages[battleCount as keyof typeof battlePackages];
        console.log(`💰 CashApp battle pack request: ${battleCount} battles for $${(packageInfo.price/100).toFixed(2)} by user ${userId}`);

        return res.json({
          clientSecret: `cashapp_battles_cs_${Date.now()}_${userId}`,
          amount: packageInfo.price,
          description: packageInfo.description
        });
      }

      // Check if Stripe is configured
      if (!stripe) {
        return res.status(503).json({ 
          message: 'Payment system is not configured. Please contact support or use an alternative payment method.' 
        });
      }

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.email) {
        throw new Error('No user email on file');
      }

      let customer;
      if (user.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } catch (error: any) {
          // Handle test/live mode mismatch - create new customer
          if (error.code === 'resource_missing') {
            console.log(`🔄 Customer not found in current mode, creating new customer...`);
            customer = await stripe.customers.create({
              email: user.email,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            });

            user = await storage.updateUserStripeInfo(userId, { 
              stripeCustomerId: customer.id 
            });
          } else {
            throw error;
          }
        }
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        });

        user = await storage.updateUserStripeInfo(userId, { 
          stripeCustomerId: customer.id 
        });
      }

      const packageInfo = battlePackages[battleCount as keyof typeof battlePackages];
      const amount = packageInfo.price;
      const pricePerBattle = (amount / 100 / battleCount).toFixed(3);

      console.log(`💰 Creating battle purchase: ${battleCount} battles for $${(amount/100).toFixed(2)}`);

      // Configure payment method types
      const paymentMethodTypes: ('card' | 'cashapp')[] = paymentMethod === 'cashapp' 
        ? ['cashapp'] 
        : ['card', 'cashapp'];

      // Create one-time payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // Amount in cents
        currency: 'usd',
        customer: customer.id,
        payment_method_types: paymentMethodTypes,
        metadata: {
          userId: userId,
          battleCount: battleCount,
          paymentMethod: paymentMethod,
          packageType: battleCount === 1500 ? 'mega_bundle' : 'standard',
          ...(paymentMethod === 'cashapp' && { cashapp_account: '$ILLAITHEGPTSTORE' })
        },
        description: paymentMethod === 'cashapp' 
          ? `${battleCount} Battle Pack ($${pricePerBattle} per battle) - Pay to $ILLAITHEGPTSTORE`
          : `${battleCount} Battle Pack ($${pricePerBattle} per battle)`,
      });

      console.log(`✅ Payment intent created: ${paymentIntent.id}`);
      console.log(`🔑 Client secret: ${!!paymentIntent.client_secret}`);

      res.json({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        battleCount: battleCount
      });
    } catch (error: any) {
      console.error('Battle purchase creation error:', error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // Store credit balance route (like ThcaStore)
  app.get('/api/store-credit/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({ balance: user?.storeCredit || 0 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch store credit balance' });
    }
  });

  // Generate referral code for user
  app.post('/api/referral/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.referralCode) {
        return res.json({ referralCode: user.referralCode });
      }

      // Generate unique referral code
      const firstName = user.firstName || user.email?.split('@')[0] || 'USER';
      const codeBase = firstName.slice(0, 3).toUpperCase();
      const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
      const referralCode = `${codeBase}${randomPart}`;

      // Update user with referral code
      await storage.updateUser(userId, { referralCode });

      res.json({ referralCode });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate referral code: ' + error.message });
    }
  });

  // Join with referral code and award $1 credit
  app.post('/api/referral/join', async (req, res) => {
    try {
      const { referralCode, newUserId } = req.body;

      if (!referralCode || !newUserId) {
        return res.status(400).json({ message: 'Referral code and user ID required' });
      }

      // Find referrer by code
      const referrer = await storage.getUserByReferralCode(referralCode);
      if (!referrer) {
        return res.status(404).json({ message: 'Invalid referral code' });
      }

      // Update new user with referrer info
      await storage.updateUser(newUserId, { referredBy: referrer.id });

      // Award $1.00 store credit to referrer
      const currentCredit = parseFloat(referrer.storeCredit || '0');
      const newCredit = (currentCredit + 1.00).toFixed(2);
      await storage.updateUser(referrer.id, { storeCredit: newCredit });

      // Create referral record
      await storage.createReferral({
        referrerId: referrer.id,
        refereeId: newUserId,
        referralCode,
        status: 'completed',
        creditAwarded: '1.00'
      });

      console.log(`💰 Referral complete: ${referrer.email} earned $1.00 credit`);
      res.json({ 
        success: true, 
        creditAwarded: '1.00',
        message: 'Referral completed! $1.00 credited to referrer.' 
      });
    } catch (error: any) {
      console.error('Referral join error:', error);
      res.status(500).json({ error: 'Failed to process referral: ' + error.message });
    }
  });

  // Get user's referral stats
  app.get('/api/referral/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const referrals = await storage.getUserReferrals(userId);
      const totalEarnings = referrals.reduce((sum, ref) => sum + parseFloat(ref.creditAwarded || '0'), 0);

      res.json({
        referralCode: user.referralCode,
        totalReferrals: referrals.length,
        totalEarnings: totalEarnings.toFixed(2),
        storeCredit: user.storeCredit,
        referrals: referrals.map(ref => ({
          id: ref.id,
          status: ref.status,
          creditAwarded: ref.creditAwarded,
          createdAt: ref.createdAt
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch referral stats: ' + error.message });
    }
  });

  // One-time payment intent (like ThcaStore's approach)
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      // Check if Stripe is configured
      if (!stripe) {
        return res.status(503).json({ 
          message: 'Payment system is not configured. Please contact support or use an alternative payment method.' 
        });
      }

      const { amount, description = "Battle pack purchase" } = req.body;
      const userId = req.user.claims.sub;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: userId,
          type: "one_time_purchase"
        },
        description,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Stripe payment routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, paymentMethod = 'stripe' } = req.body; // 'premium' or 'pro', 'stripe' or 'cashapp'

      if (!tier || !['premium', 'pro'].includes(tier)) {
        return res.status(400).json({ message: 'Invalid subscription tier' });
      }

      // Simplified CashApp flow - just return dummy client secret to satisfy frontend
      if (paymentMethod === 'cashapp') {
        console.log(`💰 CashApp subscription request for ${tier} tier by user ${userId}`);

        // Return a mock client secret to satisfy frontend Stripe integration
        return res.json({
          subscriptionId: `cashapp_${tier}_${Date.now()}`,
          clientSecret: `cashapp_cs_${Date.now()}_${userId}`,
        });
      }

      // Check if Stripe is configured
      if (!stripe) {
        return res.status(503).json({ 
          message: 'Payment system is not configured. Please contact support or use an alternative payment method.' 
        });
      }

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const tierInfo = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ['latest_invoice.payment_intent']
        });

        const latestInvoice = subscription.latest_invoice as any;
        const clientSecret = latestInvoice?.payment_intent?.client_secret;

        res.json({
          subscriptionId: subscription.id,
          clientSecret: clientSecret,
        });
        return;
      }

      if (!user.email) {
        throw new Error('No user email on file');
      }

      let customer;
      if (user.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } catch (error: any) {
          // Handle test/live mode mismatch - create new customer
          if (error.code === 'resource_missing') {
            console.log(`🔄 Customer not found in current mode, creating new customer...`);
            customer = await stripe.customers.create({
              email: user.email,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            });

            user = await storage.updateUserStripeInfo(userId, { 
              stripeCustomerId: customer.id,
              stripeSubscriptionId: undefined // Clear old subscription ID
            });
          } else {
            throw error;
          }
        }
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        });

        user = await storage.updateUserStripeInfo(userId, { 
          stripeCustomerId: customer.id 
        });
      }

          // Create dynamic pricing for live mode compatibility
      const priceAmount = Math.round(tierInfo.price * 100); // Convert to cents

      console.log(`🔧 Creating subscription for ${tier} tier: $${tierInfo.price}/month`);

      // Configure payment method types based on selection
      const paymentMethodTypes: ('card' | 'cashapp')[] = paymentMethod === 'cashapp' 
        ? ['cashapp'] 
        : ['card', 'cashapp']; // Allow both card and CashApp for Stripe

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'usd',
            product: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
            recurring: {
              interval: 'month',
            },
            unit_amount: priceAmount,
          },
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: paymentMethodTypes,
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          paymentMethod: paymentMethod,
          tier: tier,
          userId: userId,
          ...(paymentMethod === 'cashapp' && { cashapp_account: '$ILLAITHEGPTSTORE' })
        },
        description: paymentMethod === 'cashapp' 
          ? `${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription - Pay to $ILLAITHEGPTSTORE`
          : `${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription`,
      });

      console.log(`✅ Subscription created: ${subscription.id}`);
      const invoiceObj = subscription.latest_invoice as any;
      console.log(`📋 Latest invoice:`, invoiceObj?.id);

      // Extract payment intent and client secret - handle expanded Stripe objects
      const latestInvoice = subscription.latest_invoice as any;
      const paymentIntent = latestInvoice?.payment_intent;
      const clientSecret = paymentIntent?.client_secret;

      console.log(`🔑 Payment intent: ${paymentIntent?.id}`);
      console.log(`🗝️ Client secret available: ${!!clientSecret}`);

      if (!clientSecret) {
        console.error('❌ No client secret found in subscription');
        throw new Error('Failed to create payment intent');
      }

      await storage.updateUserStripeInfo(userId, {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id
      });

      // Don't mark as active until payment succeeds - webhook will handle this
      console.log(`✅ Subscription setup complete, returning client secret`);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
      });
    } catch (error: any) {
      console.error('Subscription creation error:', error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // Database-backed idempotency for webhook events

  // Stripe webhook for payment updates (subscriptions + one-time purchases)
  app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    // Check if Stripe is configured
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Payment system is not configured' 
      });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'] as string,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error(`🚨 Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const eventId = event.id;

    // Database-backed idempotency check - prevent duplicate processing
    try {
      const existingEvent = await storage.getProcessedWebhookEvent(eventId);
      if (existingEvent) {
        console.log(`⚠️ Event ${eventId} already processed at ${existingEvent.processedAt}, skipping`);
        return res.json({received: true});
      }
    } catch (error: any) {
      console.error(`❌ Error checking webhook idempotency for event ${eventId}:`, error.message);
      return res.status(500).json({
        error: 'Database error during idempotency check',
        eventId: eventId,
        message: error.message
      });
    }

    console.log(`📥 Processing webhook event: ${event.type} (${eventId})`);

    try {
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;

          try {
            // Check if this is a battle pack purchase
            if (paymentIntent.metadata?.battleCount) {
              const userId = paymentIntent.metadata.userId;
              const battleCount = parseInt(paymentIntent.metadata.battleCount);

              if (userId && battleCount) {
                // Add battles to user account
                const result = await storage.addUserBattles(userId, battleCount);
                if (result) {
                  console.log(`✅ Added ${battleCount} battles to user ${userId} (Payment: ${paymentIntent.id})`);
                } else {
                  console.warn(`⚠️ Failed to add battles to user ${userId} - user not found`);
                }
              } else {
                console.warn(`⚠️ Invalid battle pack data: userId=${userId}, battleCount=${battleCount}`);
              }
            }

            // Check if this is a CashApp subscription payment (first payment)
            else if (paymentIntent.metadata?.tier && paymentIntent.metadata?.paymentMethod === 'cashapp') {
              console.log(`💰 Processing CashApp subscription payment: ${paymentIntent.id}`);

              const userId = paymentIntent.metadata.userId;
              const tier = paymentIntent.metadata.tier;

              if (userId && tier && ['premium', 'pro'].includes(tier)) {
                // Activate the subscription for CashApp payments
                await storage.updateUserSubscription(userId, {
                  subscriptionStatus: 'active',
                  subscriptionTier: tier,
                  // Note: Stripe subscription ID should already be set from subscription creation
                });

                console.log(`✅ Activated CashApp subscription for user ${userId}: ${tier} tier (Payment: ${paymentIntent.id})`);
              } else {
                console.warn(`⚠️ Invalid CashApp subscription data: userId=${userId}, tier=${tier}`);
              }
            }
          } catch (error: any) {
            console.error(`❌ Error processing payment intent ${paymentIntent.id}:`, error.message);
            throw error; // Re-throw to trigger retry
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;

          try {
            // Defensive customer ID extraction - handle both string and expanded objects
            let customerId: string;
            if (typeof subscription.customer === 'string') {
              customerId = subscription.customer;
            } else if (subscription.customer && typeof subscription.customer === 'object' && 'id' in subscription.customer) {
              customerId = subscription.customer.id;
            } else {
              throw new Error(`Invalid customer ID format: ${typeof subscription.customer}`);
            }

            console.log(`🔍 Looking up user for Stripe customer: ${customerId}`);

            // Efficiently find user by Stripe customer ID
            const user = await storage.getUserByStripeCustomerId(customerId);

            if (user) {
              const subscriptionStatus = subscription.status === 'active' ? 'active' : 'inactive';

              // Get tier from subscription metadata if available, otherwise infer from price
              let subscriptionTier = 'free';
              if (subscription.status === 'active') {
                if (subscription.metadata?.tier) {
                  subscriptionTier = subscription.metadata.tier;
                } else {
                  // Fallback: infer from price amount (999 = $9.99 Premium, 1999 = $19.99 Pro)
                  const unitAmount = subscription.items.data[0]?.price?.unit_amount;
                  subscriptionTier = unitAmount === 999 ? 'premium' : unitAmount === 1999 ? 'pro' : 'free';
                }
              }

              await storage.updateUserSubscription(user.id, {
                subscriptionStatus,
                subscriptionTier,
                stripeSubscriptionId: subscription.id
              });

              console.log(`✅ Updated user ${user.id} subscription: ${subscriptionTier} (${subscriptionStatus})`);
            } else {
              console.warn(`⚠️ No user found for Stripe customer ${customerId}`);
            }
          } catch (error: any) {
            console.error(`❌ Error processing subscription webhook ${subscription.id}:`, error.message);
            throw error; // Re-throw to trigger retry
          }
          break;

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }

      // Mark event as processed in database
      try {
        await storage.recordProcessedWebhookEvent({
          eventId: eventId,
          eventType: event.type
        });
      } catch (error: any) {
        console.error(`⚠️ Failed to record processed webhook event ${eventId}:`, error.message);
        // Continue anyway - the event was processed successfully
      }

      console.log(`✅ Successfully processed webhook event: ${event.type} (${eventId})`);
      res.json({received: true});

    } catch (error: any) {
      console.error(`❌ Critical webhook processing error for event ${eventId}:`, error.message);

      // Return 500 to trigger Stripe retry
      res.status(500).json({
        error: 'Webhook processing failed',
        eventId: eventId,
        message: error.message
      });
    }
  });

  // User stats and analytics
  app.get('/api/user/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Protected battle creation with subscription checks
  app.post("/api/battles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // SECURITY: Input validation for battle creation parameters
      const {
        difficulty,
        profanityFilter,
        lyricComplexity,
        styleIntensity,
        voiceSpeed,
        aiCharacterName,
        aiCharacterId
      } = req.body;

      // SECURITY: Validate battle parameters
      const validDifficulties = ['easy', 'normal', 'hard', 'nightmare'];
      if (difficulty && !validDifficulties.includes(difficulty)) {
        return res.status(400).json({ message: "Invalid difficulty level" });
      }

      if (typeof profanityFilter !== 'undefined' && typeof profanityFilter !== 'boolean') {
        return res.status(400).json({ message: "Profanity filter must be boolean" });
      }

      if (lyricComplexity && (typeof lyricComplexity !== 'number' || lyricComplexity < 0 || lyricComplexity > 100)) {
        return res.status(400).json({ message: "Lyric complexity must be between 0-100" });
      }

      if (styleIntensity && (typeof styleIntensity !== 'number' || styleIntensity < 0 || styleIntensity > 100)) {
        return res.status(400).json({ message: "Style intensity must be between 0-100" });
      }

      if (voiceSpeed && (typeof voiceSpeed !== 'number' || voiceSpeed < 0.5 || voiceSpeed > 2.0)) {
        return res.status(400).json({ message: "Voice speed must be between 0.5-2.0" });
      }

      // SECURITY: Validate AI character selection (including clones)
      const validCharacters = ['razor', 'venom', 'silk', 'cypher'];
      const isCloneBattle = aiCharacterId?.startsWith('clone_');
      
      if (aiCharacterId && !validCharacters.includes(aiCharacterId) && !isCloneBattle) {
        return res.status(400).json({ message: "Invalid AI character" });
      }

      // SECURITY: Sanitize character name input
      const sanitizedCharacterName = aiCharacterName ? 
        aiCharacterName.toString().substring(0, 50).trim() : null;

      // Ensure user exists and has proper setup
      let user = await storage.getUser(userId);
      if (!user) {
        // Create user if not exists (shouldn't happen with auth but safety check)
        user = await storage.upsertUser({
          id: userId,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
        });
      }

      const canBattle = await storage.canUserStartBattle(userId);

      if (!canBattle) {
        return res.status(403).json({ 
          message: "Battle limit reached. Upgrade to Premium or Pro for more battles!",
          upgrade: true 
        });
      }

      // SECURITY: Only include validated and sanitized parameters
      const battleData = {
        userId,
        difficulty: difficulty || 'normal',
        profanityFilter: profanityFilter !== undefined ? profanityFilter : false,
        lyricComplexity: lyricComplexity || 50,
        styleIntensity: styleIntensity || 50,
        voiceSpeed: voiceSpeed || 1.0,
        aiCharacterName: sanitizedCharacterName || 'MC Venom',
        aiCharacterId: aiCharacterId || 'venom',
        userScore: 0,
        aiScore: 0,
        rounds: [],
        status: "active"
      };

      const battle = await storage.createBattle(battleData);
      res.status(201).json(battle);
    } catch (error: any) {
      console.error("Error creating battle:", error);

      if (error.message === "No battles remaining") {
        return res.status(403).json({ 
          message: "Battle limit reached. Upgrade to Premium or Pro for more battles!",
          upgrade: true 
        });
      }

      res.status(500).json({ message: "Failed to create battle" });
    }
  });

  // Get user's battle history
  app.get("/api/battles/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const battles = await storage.getUserBattles(userId, 20);
      res.json(battles);
    } catch (error) {
      console.error("Error fetching battle history:", error);
      res.status(500).json({ message: "Failed to fetch battle history" });
    }
  });



  // Payment success redirect endpoint
  app.get("/api/payment/success", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Refresh user data to get updated subscription
      const user = await storage.getUser(userId);
      if (user && user.subscriptionTier !== 'free') {
        // Payment successful - redirect to dashboard
        res.redirect('/?payment_success=true');
      } else {
        // Payment may still be processing
        res.redirect('/?payment_processing=true');
      }
    } catch (error) {
      console.error("Error handling payment success:", error);
      res.redirect('/?payment_error=true');
    }
  });

  // User API Key Management Routes
  app.get('/api/user/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = await storage.getUserAPIKeysStatus(userId);
      res.json(status);
    } catch (error) {
      console.error("Error fetching API key status:", error);
      res.status(500).json({ message: "Failed to fetch API key status" });
    }
  });

  app.put('/api/user/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { openaiApiKey, groqApiKey, preferredTtsService } = req.body;

      const user = await storage.updateUserAPIKeys(userId, {
        openaiApiKey,
        groqApiKey,
        preferredTtsService
      });

      // Clear cached TTS instances when keys change
      userTTSManager.clearUserInstances(userId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating API keys:", error);
      res.status(500).json({ message: "Failed to update API keys" });
    }
  });

  app.post('/api/user/test-api-key', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { service } = req.body;

      if (!service || !['openai', 'groq'].includes(service)) {
        return res.status(400).json({ message: "Invalid service specified" });
      }

      const isValid = await userTTSManager.testUserAPIKey(userId, service as 'openai' | 'groq');
      res.json({ valid: isValid });
    } catch (error) {
      console.error(`Error testing ${req.body.service} API key:`, error);
      res.status(500).json({ message: `Failed to test ${req.body.service} API key` });
    }
  });

  // LIGHTNING-FAST TRANSCRIPTION ENDPOINT - Process audio in <200ms
  app.post("/api/battles/:id/transcribe", isAuthenticated, upload.single('audio'), async (req: any, res) => {
    const startTime = Date.now();
    const battleId = req.params.id;

    try {
      console.log(`⚡ LIGHTNING Transcription Started - ${battleId.substring(0, 8)}...`);

      if (!req.file?.buffer) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const audioBuffer = req.file.buffer;
      console.log(`🎵 Audio for transcription: ${audioBuffer.length} bytes`);

      // Lightning-fast transcription only (200ms max for instant feel)
      let userText = "Voice input received";
      try {
        userText = await Promise.race([
          groqService.transcribeAudio(audioBuffer),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error("Transcription timeout")), 150) // Even more aggressive 150ms
          )
        ]);
        console.log(`✅ LIGHTNING transcription (${Date.now() - startTime}ms): "${userText.substring(0, 50)}..."`);
      } catch (error) {
        console.log(`⚠️ Lightning transcription failed, getting actual transcription...`);
        // If ultra-fast fails, get the actual transcription without timeout
        try {
          userText = await groqService.transcribeAudio(audioBuffer);
          console.log(`✅ Fallback transcription complete: "${userText.substring(0, 50)}..."`);
        } catch (fallbackError) {
          console.log(`❌ All transcription failed, using placeholder`);
          userText = "Voice input received";
        }
      }

      const finalProcessingTime = Date.now() - startTime;
      console.log(`🎯 Final transcription result: "${userText}" (${finalProcessingTime}ms)`);

      res.json({ 
        userText,
        processingTime: finalProcessingTime,
        instant: finalProcessingTime <= 200 // Mark as instant only if truly fast
      });

    } catch (error: any) {
      console.error(`❌ Instant transcription failed:`, error.message);
      res.status(500).json({ message: "Transcription failed" });
    }
  });

  // Legacy battle routes for backward compatibility
  app.get("/api/battles", async (req, res) => {
    // Return empty array for unauthenticated requests
    res.json([]);
  });

  app.get("/api/battles/:id", async (req, res) => {
    try {
      const battle = await storage.getBattle(req.params.id);
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }
      res.json(battle);
    } catch (error) {
      console.error("Error fetching battle:", error);
      res.status(500).json({ message: "Failed to fetch battle" });
    }
  });

  app.get("/api/battles/:id/state", async (req, res) => {
    try {
      const battle = await storage.getBattle(req.params.id);
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }

      const state = {
        id: battle.id,
        currentRound: battle.rounds.length + 1,
        maxRounds: 3,
        isRecording: false,
        isAIResponding: false,
        isPlayingAudio: false,
        userScore: battle.userScore,
        aiScore: battle.aiScore,
        difficulty: battle.difficulty as "easy" | "normal" | "hard",
        profanityFilter: battle.profanityFilter,
        timeRemaining: 30,
      };

      res.json(state);
    } catch (error) {
      console.error("Error fetching battle state:", error);
      res.status(500).json({ message: "Failed to fetch battle state" });
    }
  });

  app.get("/api/battles/:id/rounds", async (req, res) => {
    try {
      const battle = await storage.getBattle(req.params.id);
      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }
      res.json(battle.rounds);
    } catch (error) {
      console.error("Error fetching battle rounds:", error);
      res.status(500).json({ message: "Failed to fetch battle rounds" });
    }
  });

  // FAST Battle Round Processing - Optimized for Speed  
  app.post("/api/battles/:id/rounds", isAuthenticated, upload.single('audio'), async (req: any, res) => {
    const startTime = Date.now();
    const battleId = req.params.id;

    try {
      // SECURITY: Input validation and sanitization
      if (!battleId || typeof battleId !== 'string' || battleId.length > 50) {
        return res.status(400).json({ message: "Invalid battle ID" });
      }

      // SECURITY: Validate battle ID format (UUID)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID format" });
      }

      console.log(`🎤 Battle Round Processing Started - ${battleId.substring(0, 8)}...`);

      const battle = await storage.getBattle(battleId);

      if (!battle) {
        return res.status(404).json({ message: "Battle not found" });
      }

      // DEBUG: Check file upload status
      console.log(`📁 File upload debug:`);
      console.log(`  req.file exists: ${!!req.file}`);
      console.log(`  req.file.buffer exists: ${!!(req.file?.buffer)}`);
      console.log(`  req.file details:`, req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferLength: req.file.buffer?.length
      } : 'No file');

      // Handle both audio and text input - at least one must be provided
      const userVerse = req.body.userVerse;
      const hasAudio = !!(req.file?.buffer);
      const hasText = !!(userVerse?.trim());

      if (!hasAudio && !hasText) {
        console.log(`❌ No audio file or text verse provided`);
        return res.status(400).json({ message: "Either audio file or text verse must be provided" });
      }

      const audioBuffer = req.file?.buffer;

      // Audio validation only if audio is provided
      if (hasAudio) {
        console.log(`📊 File stats: ${audioBuffer.length} bytes, mimetype: ${req.file.mimetype}`);

        // TEMPORARILY REMOVE SIZE RESTRICTIONS for debugging
        if (audioBuffer.length === 0) {
          console.log(`❌ Empty audio file`);
          return res.status(400).json({ message: "Audio file is empty" });
        }

        // SECURITY: Proper audio format validation based on our findings
        const audioHeader = audioBuffer.slice(0, 16).toString('hex');

        console.log(`🔍 Audio validation: ${audioBuffer.length} bytes, header: ${audioHeader.substring(0, 16)}`);

        // WebM format validation (what browsers actually send)
        const isWebM = audioBuffer[0] === 0x1a && audioBuffer[1] === 0x45 && 
                       audioBuffer[2] === 0xDF && audioBuffer[3] === 0xA3;

        // Other common formats
        const isWAV = audioHeader.startsWith('52494646'); // RIFF
        const isOgg = audioHeader.startsWith('4f676753'); // OggS
        const isMP3 = audioHeader.startsWith('fffb') || audioHeader.startsWith('fff3');
        const isMP4 = audioHeader.startsWith('0000001c') || audioHeader.startsWith('00000020') || 
                      audioHeader.includes('66747970'); // MP4/M4A - more flexible detection

        if (!isWebM && !isWAV && !isOgg && !isMP3 && !isMP4) {
          console.log(`❌ Unrecognized audio format, header: ${audioHeader.substring(0, 16)}`);
          return res.status(400).json({ message: "Unsupported audio format" });
        }

        console.log(`✅ Audio validation passed: ${isWebM ? 'WebM' : isWAV ? 'WAV' : isOgg ? 'Ogg' : isMP3 ? 'MP3' : 'MP4'} format`);

        console.log(`🎵 Audio received: ${audioBuffer.length} bytes`);
      } else {
        console.log(`📝 Text input received: "${userVerse}"`);
      }

      // TRANSCRIPTION OR TEXT INPUT
      let userText = "Input received";

      if (hasText) {
        // Use provided text directly 
        userText = userVerse.trim();
        console.log(`✅ Text input processed: "${userText.substring(0, 50)}..."`);
      } else if (hasAudio) {
        // Process audio transcription
        console.log(`⚡ Starting audio transcription...`);
        try {
          // OPTIMIZED transcription with proper timeout for deployment stability
          userText = await Promise.race([
            groqService.transcribeAudio(audioBuffer),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error("Transcription timeout")), 3000) // 3s timeout for stability
            )
          ]);
          console.log(`✅ FAST transcription complete: "${userText.substring(0, 50)}..."`);
        } catch (error) {
          console.log(`⚠️ Fast transcription failed, using fallback...`);
          // If ultra-fast fails, get the actual transcription without timeout
          try {
            userText = await groqService.transcribeAudio(audioBuffer);
            console.log(`✅ Fallback transcription complete: "${userText.substring(0, 50)}..."`);
          } catch (fallbackError) {
            console.log(`❌ All transcription failed, using placeholder`);
            userText = "Voice input received";
          }
        }
      }

      // Continue with the rest of the processing - no streaming for now, 
      // but transcription is now much faster (1s vs 2s)

      // FIRST: Calculate user's performance to inform AI reaction
      console.log(`📊 Pre-analyzing user performance for reactive AI...`);
      const userPerformanceScore = scoringService.calculateUserScore(userText);
      console.log(`🎯 User performance: ${userPerformanceScore}/100 - AI will react accordingly`);

      // Check if this is a clone battle and adjust difficulty/complexity accordingly
      const isCloneBattle = battle.aiCharacterId?.startsWith('clone_');
      let adjustedDifficulty = battle.difficulty;
      let adjustedComplexity = battle.lyricComplexity || 50;
      let adjustedIntensity = battle.styleIntensity || 50;

      if (isCloneBattle && battle.aiCharacterId) {
        console.log(`🤖 Clone battle detected - adjusting AI to match user's skill level`);
        const cloneId = battle.aiCharacterId.replace('clone_', '');
        const clone = await storage.getCloneById(cloneId);
        
        if (clone) {
          // Adjust AI difficulty based on clone's skill level
          adjustedComplexity = clone.avgRhymeDensity;
          adjustedIntensity = clone.skillLevel;
          
          // Map skill level to difficulty
          if (clone.skillLevel < 40) adjustedDifficulty = 'easy';
          else if (clone.skillLevel >= 40 && clone.skillLevel < 65) adjustedDifficulty = 'normal';
          else if (clone.skillLevel >= 65 && clone.skillLevel < 85) adjustedDifficulty = 'hard';
          else adjustedDifficulty = 'nightmare';
          
          console.log(`🎯 Clone AI settings: difficulty=${adjustedDifficulty}, complexity=${adjustedComplexity}, intensity=${adjustedIntensity}`);
        }
      }

      // NOW generate AI response with user score context for reactive behavior
      console.log(`🤖 Generating AI response for: "${userText.substring(0, 30)}..."`);

      let aiResponseText = "System response ready!";
      try {
        // Ultra-aggressive timeout for instant response
        aiResponseText = await Promise.race([
          groqService.generateRapResponse(
            userText, // Use actual transcription for better AI response
            adjustedDifficulty, 
            battle.profanityFilter,
            adjustedComplexity,
            adjustedIntensity,
            userPerformanceScore // Pass user score for reactive AI
          ),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error("AI timeout")), 5000) // Keep longer timeout for 120B model
          )
        ]);
        console.log(`✅ AI response generated: "${aiResponseText.substring(0, 50)}..."`);
      } catch (error: any) {
        console.log(`⚠️ AI response failed: ${error.message}`);
        aiResponseText = "Yo, technical difficulties but I'm still here / System glitched but my flow's crystal clear!";
      }

      // 3. Generate TTS using user's preferred service or system fallback
      const userId = req.user.claims.sub;
      const characterId = battle.aiCharacterId || battle.aiCharacterName?.toLowerCase()?.replace('mc ', '').replace(' ', '_') || "venom";
      console.log(`🎤 Generating TTS for character: ${characterId} (user: ${userId})`);

      // Use the new UserTTSManager to handle all TTS services
      let ttsResult: any;
      try {
        const { getCharacterById } = await import("@shared/characters");
        const character = getCharacterById(characterId);

        const audioResponse = await userTTSManager.generateTTS(aiResponseText, userId, {
          characterId,
          characterName: character?.name || `MC ${characterId}`,
          gender: character?.gender || 'male',
          voiceStyle: (battle.styleIntensity || 50) > 70 ? 'aggressive' : 
                     (battle.styleIntensity || 50) > 40 ? 'confident' : 'smooth',
          speedMultiplier: battle.voiceSpeed || 1.0
        });

        // Convert to expected format
        ttsResult = { 
          audioPath: "", 
          audioUrl: audioResponse.audioUrl,
          fileSize: audioResponse.audioUrl.length 
        };

        console.log(`✅ User TTS successful: ${audioResponse.audioUrl.length > 0 ? 'Audio generated' : 'Silent mode'}`);
      } catch (error: any) {
        console.error(`❌ User TTS failed:`, error.message);

        // Fallback to empty audio (battles continue without sound)
        ttsResult = { 
          audioPath: "", 
          audioUrl: "", 
          fileSize: 0 
        };
      }

      const audioResult = ttsResult;

      console.log(`🤖 Processing complete (${Date.now() - startTime}ms)`);

      // REALISTIC SCORING: Use actual battle analysis instead of random numbers
      console.log(`📊 Analyzing battle performance...`);
      // CRITICAL: Final battle scores use advanced phonetic analysis with zero rate limiting
      const scores = scoringService.scoreRound(userText, aiResponseText, true, battle.id);
      console.log('🏆 FINAL BATTLE SCORES calculated with advanced phonetic analysis - no rate limiting!');

      // GENERATE USER'S BATTLE RAP MAP for display
      const userBattleMap = groqService.generateUserBattleMap(userText);
      console.log(`🗺️ USER'S BATTLE MAP:\n${userBattleMap}`);

      console.log(`📈 User analysis: Rhyme ${scores.rhymeDensity}/100, Flow ${scores.flowQuality}/100, Creativity ${scores.creativity}/100`);
      console.log(`🎯 Final scores: User ${scores.userScore}/100, AI ${scores.aiScore}/100`);

      // Create round with realistic scoring and battle map
      const round = {
        id: Date.now().toString(),
        battleId,
        userText,
        aiResponse: aiResponseText,
        userScore: scores.userScore,
        aiScore: scores.aiScore,
        audioUrl: audioResult.audioUrl || "",
        userBattleMap: userBattleMap, // Add battle map for frontend display
        timestamp: Date.now()
      };

      // CRITICAL FIX: Update main battle record with scores
      await storage.updateBattleScore(battleId, scores.userScore, scores.aiScore);
      console.log(`🏆 Updated battle scores: User ${scores.userScore}/100, AI ${scores.aiScore}/100`);

      // Quick storage update
      await storage.addBattleRound(battleId, round);

      console.log(`✅ Battle round complete (${Date.now() - startTime}ms)`);
      res.json(round);

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      // SECURITY: Don't expose internal error details to users
      console.error(`❌ Battle round processing failed in ${processingTime}ms for battle ${battleId.substring(0, 8)}...`);
      console.error("Error details (internal only):", error);

      // SECURITY: Generic error message to prevent information leakage
      res.status(500).json({ 
        message: "Battle processing temporarily unavailable. Please try again.",
        processingTime 
      });
    }
  });

  // Fast battle state updates
  app.patch("/api/battles/:id/state", async (req, res) => {
    try {
      const battleId = req.params.id;
      const updates = req.body;

      // SECURITY: Validate battle ID format (UUID)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(battleId)) {
        return res.status(400).json({ message: "Invalid battle ID format" });
      }

      // SECURITY: Validate and sanitize state updates
      const allowedFields = ['userScore', 'aiScore', 'isComplete', 'winner'];
      const sanitizedUpdates: any = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          if (key === 'userScore' || key === 'aiScore') {
            // Validate score values
            if (typeof value === 'number' && value >= 0 && value <= 100) {
              sanitizedUpdates[key] = value;
            }
          } else if (key === 'isComplete') {
            if (typeof value === 'boolean') {
              sanitizedUpdates[key] = value;
            }
          } else if (key === 'winner') {
            const validWinners = ['user', 'ai', 'tie'];
            if (typeof value === 'string' && validWinners.includes(value)) {
              sanitizedUpdates[key] = value;
            }
          }
        }
      }

      await storage.updateBattleState(battleId, sanitizedUpdates);
      res.json({ success: true });
    } catch (error) {
      // SECURITY: Don't expose internal error details
      console.error("Error updating battle state (internal):", error);
      res.status(500).json({ message: "State update temporarily unavailable" });
    }
  });

  // Tournament routes
  app.get('/api/tournaments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tournaments = await storage.getUserTournaments(userId);
      res.json(tournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ message: 'Failed to fetch tournaments' });
    }
  });

  app.get('/api/tournaments/active', async (req, res) => {
    try {
      const activeTournaments = await storage.getActiveTournaments();
      res.json(activeTournaments);
    } catch (error) {
      console.error('Error fetching active tournaments:', error);
      res.status(500).json({ message: 'Failed to fetch active tournaments' });
    }
  });

  app.get('/api/tournaments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tournament = await storage.getTournament(id);
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
      res.json(tournament);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      res.status(500).json({ message: 'Failed to fetch tournament' });
    }
  });

  app.post('/api/tournaments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        name, 
        type, 
        totalRounds, 
        difficulty, 
        profanityFilter, 
        lyricComplexity, 
        styleIntensity, 
        prize,
        entryFeeUSDC,
        organizerPercentage,
        maxParticipants
      } = req.body;

      // If tournament has entry fee, check Arc wallet balance BEFORE creation
      let arcWallet = null;
      if (entryFeeUSDC && parseFloat(entryFeeUSDC) > 0) {
        // Get user's Arc wallet
        arcWallet = await storage.getArcWallet(userId);
        if (!arcWallet) {
          return res.status(400).json({ message: 'Arc wallet not found. Please create an Arc wallet first.' });
        }

        // Check wallet balance (but don't charge yet!)
        const balance = await arcService.getUSDCBalance(arcWallet.walletAddress);
        if (parseFloat(balance) < parseFloat(entryFeeUSDC)) {
          return res.status(400).json({ 
            message: `Insufficient USDC balance. You have ${balance} USDC but need ${entryFeeUSDC} USDC for entry fee.` 
          });
        }
      }

      // Generate tournament bracket based on type and rounds
      const generateBracket = (rounds: number, tournamentType: string) => {
        const numOpponents = Math.pow(2, rounds - 1); // 2^(rounds-1) opponents for user
        const characters = ['razor', 'venom', 'silk'];

        const matches = [];
        for (let i = 0; i < numOpponents; i++) {
          const characterId = characters[i % characters.length];
          const characterName = characterId === 'razor' ? 'MC Razor' : 
                               characterId === 'venom' ? 'MC Venom' : 'MC Silk';

          matches.push({
            id: `match-${i + 1}`,
            player1: {
              id: userId,
              name: 'You',
              type: 'user' as const
            },
            player2: {
              id: characterId,
              name: characterName,
              type: 'ai' as const
            },
            isCompleted: false
          });
        }

        return {
          rounds: [{
            roundNumber: 1,
            matches
          }]
        };
      };

      const tournamentData = {
        userId,
        name,
        type: type || 'single_elimination',
        totalRounds: totalRounds || 3,
        difficulty: difficulty || 'normal',
        profanityFilter: profanityFilter || false,
        lyricComplexity: lyricComplexity || 50,
        styleIntensity: styleIntensity || 50,
        prize: prize || 'Tournament Champion Title',
        opponents: ['razor', 'venom', 'silk'], // Default opponents
        bracket: generateBracket(totalRounds || 3, type || 'single_elimination'),
        // Entry fee and prize pool
        entryFeeUSDC: entryFeeUSDC || '0',
        prizePoolUSDC: entryFeeUSDC || '0', // Initial prize pool = creator's entry fee
        organizerPercentage: organizerPercentage || 10,
        maxParticipants: maxParticipants || null,
      };

      // Validate tournament data
      const validatedData = insertTournamentSchema.parse(tournamentData);

      const tournament = await storage.createTournament(validatedData);
      
      console.log(`🏆 Tournament created: ${tournament.name} (ID: ${tournament.id})`);

      // NOW process entry fee payment AFTER successful tournament creation
      if (entryFeeUSDC && parseFloat(entryFeeUSDC) > 0 && arcWallet) {
        const platformWallet = process.env.ARC_PLATFORM_WALLET || "0x0000000000000000000000000000000000000000";
        
        // Transfer USDC from player to platform escrow
        const entryFeeTx = await arcService.transferUSDC({
          fromAddress: arcWallet.walletAddress,
          toAddress: platformWallet,
          amountUSDC: entryFeeUSDC,
          memo: `Tournament Entry Fee - ${tournament.name} (ID: ${tournament.id})`,
        });

        console.log(`💰 Tournament entry fee processed: ${entryFeeUSDC} USDC (tx: ${entryFeeTx.txHash})`);

        // Record Arc transaction with REAL tournament ID
        await storage.recordArcTransaction({
          userId,
          type: 'tournament_entry',
          amount: entryFeeUSDC,
          txHash: entryFeeTx.txHash,
          status: entryFeeTx.status,
          fromAddress: arcWallet.walletAddress,
          toAddress: platformWallet,
          battleId: null,
        });

        console.log(`💰 Entry fee: ${tournament.entryFeeUSDC} USDC | Prize pool: ${tournament.prizePoolUSDC} USDC`);
        console.log(`📊 Organizer cut: ${tournament.organizerPercentage}% | Max participants: ${tournament.maxParticipants || 'unlimited'}`);
      }

      res.json(tournament);
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      res.status(400).json({ message: 'Failed to create tournament', error: error.message });
    }
  });

  app.post('/api/tournaments/:id/battles/:matchId', isAuthenticated, async (req: any, res) => {
    try {
      const { id: tournamentId, matchId } = req.params;
      const userId = req.user.claims.sub;

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }

      // Find the match and create a battle for it
      let targetMatch = null;
      for (const round of tournament.bracket.rounds) {
        for (const match of round.matches) {
          if (match.id === matchId) {
            targetMatch = match;
            break;
          }
        }
        if (targetMatch) break;
      }

      if (!targetMatch) {
        return res.status(404).json({ message: 'Match not found' });
      }

      // Create a new battle for this tournament match
      const battleData = {
        userId,
        difficulty: tournament.difficulty,
        profanityFilter: tournament.profanityFilter,
        lyricComplexity: tournament.lyricComplexity,
        styleIntensity: tournament.styleIntensity,
        aiCharacterId: targetMatch.player2.id,
        aiCharacterName: targetMatch.player2.name,
      };

      const battle = await storage.createBattle(battleData);

      res.json({ battleId: battle.id, tournamentId });
    } catch (error: any) {
      console.error('Error starting tournament battle:', error);
      res.status(500).json({ message: 'Failed to start tournament battle', error: error.message });
    }
  });

  // Complete tournament and distribute prizes (USDC on Arc blockchain)
  app.post('/api/tournaments/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id: tournamentId } = req.params;
      const userId = req.user.claims.sub;

      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }

      // Verify user is the tournament organizer
      if (tournament.userId !== userId) {
        return res.status(403).json({ message: 'Only the tournament organizer can complete the tournament' });
      }

      // Verify tournament is in a completable state
      if (tournament.status === 'completed') {
        return res.status(400).json({ message: 'Tournament is already completed' });
      }

      // Check if all matches are completed
      const allMatchesComplete = tournament.bracket.rounds.every(round => 
        round.matches.every(match => match.isCompleted)
      );

      if (!allMatchesComplete) {
        return res.status(400).json({ message: 'Cannot complete tournament - not all matches are finished' });
      }

      // Determine winners from the final round
      const finalRound = tournament.bracket.rounds[tournament.bracket.rounds.length - 1];
      const winners = finalRound.matches
        .filter(match => match.winner)
        .map((match, index) => ({
          match,
          place: index === 0 ? '1st' : index === 1 ? '2nd' : '3rd'
        }));

      console.log(`🏆 Completing tournament ${tournament.name} with ${winners.length} winners`);

      // Distribute prizes if tournament has entry fee
      const prizeDistributions: any[] = [];
      if (tournament.entryFeeUSDC && parseFloat(tournament.entryFeeUSDC) > 0 && tournament.prizePoolUSDC) {
        const arcService = createArcBlockchainService({ 
          demoMode: process.env.ARC_DEMO_MODE === 'true' 
        });

        // Get organizer's Arc wallet
        const organizerWallet = await storage.getArcWallet(tournament.userId);
        if (!organizerWallet) {
          return res.status(400).json({ message: 'Organizer Arc wallet not found' });
        }

        // Prepare winners for prize distribution
        const winnerPayouts = [];
        
        // 1st place gets 50%, 2nd gets 30%, 3rd gets 20% of winners' pool
        const prizePercentages = [50, 30, 20];
        
        for (let i = 0; i < Math.min(winners.length, 3); i++) {
          const winner = winners[i];
          if (winner.match.winner?.type === 'user') {
            // Get winner's Arc wallet
            const winnerWallet = await storage.getArcWallet(winner.match.winner.id);
            if (winnerWallet) {
              winnerPayouts.push({
                address: winnerWallet.walletAddress,
                percentage: prizePercentages[i],
                place: winner.place,
              });
            }
          }
        }

        // Distribute prizes using Arc blockchain
        const txResults = await arcService.distributeTournamentPrizes(
          tournament.id,
          tournament.prizePoolUSDC,
          tournament.organizerPercentage || 10,
          organizerWallet.walletAddress,
          winnerPayouts
        );

        // Record all Arc transactions
        for (const tx of txResults) {
          const isOrganizerTx = tx === txResults[0]; // First tx is organizer fee
          const winnerIndex = isOrganizerTx ? -1 : txResults.indexOf(tx) - 1;
          
          await storage.recordArcTransaction({
            userId: isOrganizerTx ? tournament.userId : winnerPayouts[winnerIndex]?.address || userId,
            type: isOrganizerTx ? 'tournament_organizer_fee' : 'tournament_prize',
            amount: tx.status === 'confirmed' ? '0' : '0', // Amount is in the tx metadata
            txHash: tx.txHash,
            status: tx.status,
            fromAddress: process.env.ARC_PLATFORM_WALLET || "0x0000000000000000000000000000000000000000",
            toAddress: isOrganizerTx ? organizerWallet.walletAddress : (winnerPayouts[winnerIndex]?.address || ''),
            battleId: null,
          });

          prizeDistributions.push({
            txHash: tx.txHash,
            recipient: isOrganizerTx ? 'organizer' : winnerPayouts[winnerIndex]?.place || 'winner',
            status: tx.status,
          });
        }

        console.log(`💰 Distributed ${tournament.prizePoolUSDC} USDC in tournament prizes (${txResults.length} transactions)`);
      }

      // Update tournament status to completed
      const completedTournament = await storage.updateTournament(tournament.id, {
        status: 'completed',
        completedAt: new Date(),
      });

      res.json({
        message: 'Tournament completed successfully',
        tournament: completedTournament,
        prizeDistributions,
      });

    } catch (error: any) {
      console.error('Error completing tournament:', error);
      res.status(500).json({ message: 'Failed to complete tournament', error: error.message });
    }
  });

  // Analyze lyrics endpoint for frontend
  app.post('/api/analyze-lyrics', isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: 'Text is required' });
      }

      // Use the scoring service to analyze the lyrics
      const dummyAiText = "Sample AI response for analysis";
      const analysis = scoringService.scoreRound(text, dummyAiText);

      const result = {
        rhymeDensity: analysis.rhymeDensity,
        flowQuality: analysis.flowQuality,
        creativity: analysis.creativity,
        overallScore: analysis.userScore,
        breakdown: {
          vocabulary: Math.floor(analysis.creativity * 0.3),
          wordplay: Math.floor(analysis.creativity * 0.4),
          rhythm: Math.floor(analysis.flowQuality * 0.8),
          originality: Math.floor(analysis.creativity * 0.6)
        },
        suggestions: [
          analysis.userScore < 50 ? "Try adding more complex rhyme schemes" : "Great rhyme complexity!",
          analysis.flowQuality < 60 ? "Work on syllable timing and rhythm" : "Excellent flow!",
          analysis.creativity < 40 ? "Add more metaphors and wordplay" : "Creative wordplay detected!"
        ]
      };

      res.json(result);

    } catch (error: any) {
      console.error('Lyrics analysis error:', error);
      res.status(500).json({ message: 'Analysis failed' });
    }
  });

  // INTELLIGENT CROWD REACTION ENDPOINT
  app.post('/api/crowd-reaction/analyze', async (req, res) => {
    try {
      const { lyrics, context } = req.body;

      if (!lyrics || typeof lyrics !== 'string') {
        return res.status(400).json({ error: 'Lyrics text is required' });
      }

      console.log(`🧠 Analyzing lyrics for crowd reaction: "${lyrics.substring(0, 50)}..."`);

      const analysis = await crowdReactionService.analyzeForCrowdReaction(lyrics, context);

      console.log(`🎭 Crowd reaction determined: ${analysis.reactionType} (${analysis.intensity}%) - ${analysis.reasoning}`);

      res.json(analysis);

    } catch (error) {
      console.error('Error analyzing for crowd reaction:', error);
      res.status(500).json({ error: 'Crowd reaction analysis failed' });
    }
  });

  // Admin endpoint to list users
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;

      // Simple admin check - you can modify this logic as needed
      const isAdmin = userEmail && (
        userEmail.includes('admin') || 
        userEmail.endsWith('@replit.com') ||
        userId === 'your-admin-user-id' // Replace with actual admin user ID
      );

      if (!isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const users = await storage.getAllUsers();

      // Return sanitized user data (don't expose sensitive fields)
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        battlesRemaining: user.battlesRemaining,
        totalBattles: user.totalBattles,
        totalWins: user.totalWins,
        createdAt: user.createdAt,
        lastBattleReset: user.lastBattleReset
      }));

      res.json({
        total: sanitizedUsers.length,
        users: sanitizedUsers
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Serve AI-generated sound effects using ElevenLabs
  app.get('/api/sfx/:soundType', async (req, res) => {
    try {
      const soundType = req.params.soundType.replace('.mp3', '');
      console.log(`🎵 Requesting sound effect: ${soundType}`);

      // Map old filenames to new sound types
      const soundMapping: Record<string, string> = {
        'boxing-bell': 'boxing-bell',
        'crowd-reaction': 'crowd-medium',
        'air-horn': 'air-horn',
      };

      const mappedType = soundMapping[soundType] || soundType;

      // Check if ElevenLabs is available
      if (!hasSFXServiceAvailable()) {
        console.log('⚠️ ElevenLabs SFX not available, returning 404');
        return res.status(404).json({ error: 'Sound effects service not available' });
      }

      try {
        const sfxService = getElevenLabsSFXService();
        const audioBuffer = await sfxService.getSound(mappedType);

        console.log(`✅ Serving AI-generated SFX: ${mappedType} (${audioBuffer.length} bytes)`);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        res.send(audioBuffer);

      } catch (error: any) {
        console.error(`❌ Failed to generate sound ${mappedType}:`, error.message);
        return res.status(500).json({ error: 'Failed to generate sound effect' });
      }

    } catch (error) {
      console.error('Error serving SFX:', error);
      res.status(500).json({ error: 'Failed to serve sound effect' });
    }
  });

  // Pre-generate battle sounds (call on server start)
  app.post('/api/sfx/initialize', isAuthenticated, async (req: any, res) => {
    try {
      if (!hasSFXServiceAvailable()) {
        return res.status(503).json({ message: 'Sound effects service not available' });
      }

      const sfxService = getElevenLabsSFXService();
      await sfxService.preGenerateBattleSounds();

      const stats = sfxService.getCacheStats();
      res.json({ 
        message: 'Battle sounds pre-generated successfully',
        cached: stats.count,
        sounds: stats.keys,
        totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`
      });
    } catch (error: any) {
      console.error('Error initializing SFX:', error);
      res.status(500).json({ message: error.message || 'Failed to initialize sound effects' });
    }
  });

  // Coin Flip endpoint - determine who goes first in battles!
  app.post('/api/coinflip', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { choice } = req.body;

      // Validate input
      if (!choice || !['heads', 'tails'].includes(choice)) {
        return res.status(400).json({ message: 'Invalid choice. Must be "heads" or "tails"' });
      }

      // Flip the coin (50/50 chance)
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const userGoesFirst = result === choice;

      console.log(`🪙 Coin flip: ${result} | User chose: ${choice} | User goes ${userGoesFirst ? 'FIRST' : 'SECOND'}`);

      res.json({
        result,
        userChoice: choice,
        userGoesFirst,
      });
    } catch (error) {
      console.error('Coin flip error:', error);
      res.status(500).json({ message: 'Failed to flip coin' });
    }
  });

  // User Clone endpoints
  app.get('/api/user/clone', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clone = await storage.getUserClone(userId);
      
      if (!clone) {
        return res.status(404).json({ message: 'No clone found. Create one by analyzing your battles!' });
      }

      res.json(clone);
    } catch (error) {
      console.error('Error fetching user clone:', error);
      res.status(500).json({ message: 'Failed to fetch clone' });
    }
  });

  app.post('/api/user/clone/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { battlesLimit = 10 } = req.body;
      
      // Validate battlesLimit
      const validatedLimit = Math.min(Math.max(parseInt(battlesLimit) || 10, 1), 9999);
      
      console.log(`🤖 Generating clone for user ${userId} using ${validatedLimit} battles...`);
      const clone = await storage.createOrUpdateUserClone(userId, validatedLimit);
      
      console.log(`✅ Clone generated: ${clone.cloneName} (Skill: ${clone.skillLevel}, analyzed ${clone.battlesAnalyzed} battles)`);
      res.json(clone);
    } catch (error) {
      console.error('Error generating user clone:', error);
      res.status(500).json({ message: 'Failed to generate clone' });
    }
  });

  app.get('/api/clone/:cloneId', isAuthenticated, async (req: any, res) => {
    try {
      const { cloneId } = req.params;
      const clone = await storage.getCloneById(cloneId);
      
      if (!clone) {
        return res.status(404).json({ message: 'Clone not found' });
      }

      res.json(clone);
    } catch (error) {
      console.error('Error fetching clone:', error);
      res.status(500).json({ message: 'Failed to fetch clone' });
    }
  });

  app.get('/api/clones/available', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clones = await storage.getAllAvailableClones(userId);
      
      res.json(clones);
    } catch (error) {
      console.error('Error fetching available clones:', error);
      res.status(500).json({ message: 'Failed to fetch available clones' });
    }
  });

  app.post('/api/clone-battles/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { opponentCloneId } = req.body;

      if (!opponentCloneId) {
        return res.status(400).json({ message: 'Opponent clone ID is required' });
      }

      const userClone = await storage.getUserClone(userId);
      if (!userClone) {
        return res.status(400).json({ message: 'You need to create your clone first!' });
      }

      const opponentClone = await storage.getCloneById(opponentCloneId);
      if (!opponentClone) {
        return res.status(404).json({ message: 'Opponent clone not found' });
      }

      const canStartBattle = await storage.deductBattleCredits(userId, 1);
      if (!canStartBattle) {
        return res.status(403).json({ 
          message: 'Insufficient battle credits. Purchase more to continue!' 
        });
      }

      const battle = await storage.createBattle({
        mode: 'clone-vs-clone',
        userId,
        challengerUserId: userClone.userId,
        opponentUserId: opponentClone.userId,
        difficulty: 'normal',
        profanityFilter: false,
        maxRounds: 3,
        lyricComplexity: Math.round((userClone.skillLevel + opponentClone.skillLevel) / 2),
        styleIntensity: 50,
        status: 'active',
        creditsPaid: true,
      });

      console.log(`🤖 Clone battle started: ${userClone.cloneName} vs ${opponentClone.cloneName} (Battle: ${battle.id})`);

      res.json({
        battleId: battle.id,
        userClone,
        opponentClone,
        message: `Battle started: ${userClone.cloneName} vs ${opponentClone.cloneName}`,
      });
    } catch (error) {
      console.error('Error starting clone battle:', error);
      res.status(500).json({ message: 'Failed to start clone battle' });
    }
  });

  app.post('/api/clone-battles/:battleId/round', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { battleId } = req.params;
      const { roundNumber } = req.body;

      const battle = await storage.getBattle(battleId);
      if (!battle) {
        return res.status(404).json({ message: 'Battle not found' });
      }

      if (battle.status !== 'active') {
        return res.status(400).json({ message: 'Battle is not active' });
      }

      const userClone = await storage.getUserClone(battle.challengerUserId!);
      const opponentClone = await storage.getCloneById(battle.opponentUserId!);

      if (!userClone || !opponentClone) {
        return res.status(404).json({ message: 'Clone data not found' });
      }

      const userVerseResponse = await groqService.generateCloneVerse(userClone, roundNumber, []);
      const opponentVerseResponse = await groqService.generateCloneVerse(opponentClone, roundNumber, [userVerseResponse]);

      // Score both verses together
      const roundScores = scoringService.scoreRound(userVerseResponse, opponentVerseResponse, false, battleId);
      const userScores = {
        totalScore: roundScores.userScore,
        rhymeDensity: roundScores.rhymeDensity,
        flowQuality: roundScores.flowQuality,
        creativity: roundScores.creativity,
      };
      const opponentScores = {
        totalScore: roundScores.aiScore,
        rhymeDensity: roundScores.rhymeDensity,
        flowQuality: roundScores.flowQuality,
        creativity: roundScores.creativity,
      };

      const roundData = {
        id: `round_${Date.now()}`,
        battleId,
        roundNumber,
        userVerse: userVerseResponse,
        aiVerse: opponentVerseResponse,
        userAudioUrl: null,
        aiAudioUrl: null,
        scores: {
          userScore: userScores.totalScore,
          aiScore: opponentScores.totalScore,
          rhymeDensity: (userScores.rhymeDensity + opponentScores.rhymeDensity) / 2,
          flowQuality: (userScores.flowQuality + opponentScores.flowQuality) / 2,
          creativity: (userScores.creativity + opponentScores.creativity) / 2,
          totalScore: (userScores.totalScore + opponentScores.totalScore) / 2,
        },
        createdAt: new Date(),
      };

      await storage.addBattleRound(battleId, roundData);

      const newUserScore = (battle.challengerScore || 0) + userScores.totalScore;
      const newOpponentScore = (battle.opponentScore || 0) + opponentScores.totalScore;
      await storage.updateBattleState(battleId, {
        challengerScore: newUserScore,
        opponentScore: newOpponentScore,
      });

      res.json({
        round: roundData,
        userClone: {
          verse: userVerseResponse,
          scores: userScores,
        },
        opponentClone: {
          verse: opponentVerseResponse,
          scores: opponentScores,
        },
        battleScore: {
          userScore: newUserScore,
          opponentScore: newOpponentScore,
        },
      });
    } catch (error) {
      console.error('Error processing clone battle round:', error);
      res.status(500).json({ message: 'Failed to process clone battle round' });
    }
  });

  app.post('/api/clone-battles/:battleId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { battleId } = req.params;

      const battle = await storage.getBattle(battleId);
      if (!battle) {
        return res.status(404).json({ message: 'Battle not found' });
      }

      const winnerId = (battle.challengerScore || 0) > (battle.opponentScore || 0)
        ? battle.challengerUserId
        : battle.opponentUserId;

      await storage.completePvPBattle(battleId, winnerId || '');

      const didUserCloneWin = winnerId === battle.challengerUserId;
      if (didUserCloneWin) {
        await storage.awardBattleRewards(userId, battleId, true);
      }

      res.json({
        message: 'Clone battle completed',
        winnerId,
        didUserCloneWin,
        finalScore: {
          userScore: battle.challengerScore,
          opponentScore: battle.opponentScore,
        },
      });
    } catch (error) {
      console.error('Error completing clone battle:', error);
      res.status(500).json({ message: 'Failed to complete clone battle' });
    }
  });

  // ======================
  // MONETIZATION ENDPOINTS
  // ======================

  // Get user's wallet
  app.get('/api/wallet', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallet = await storage.getOrCreateUserWallet(userId);
      
      res.json(wallet);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({ message: 'Failed to fetch wallet' });
    }
  });

  // Get user's transactions
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const transactions = await storage.getUserTransactions(userId, limit);
      
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // Get user's mining events
  app.get('/api/mining/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const events = await storage.getUserMiningEvents(userId, limit);
      
      res.json(events);
    } catch (error) {
      console.error('Error fetching mining events:', error);
      res.status(500).json({ message: 'Failed to fetch mining events' });
    }
  });

  // Claim daily login bonus
  app.post('/api/mining/daily-login', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if already claimed today
      const wallet = await storage.getOrCreateUserWallet(userId);
      
      const now = new Date();
      const lastClaim = wallet.lastDailyBonusAt ? new Date(wallet.lastDailyBonusAt) : null;
      
      // Check if claimed in last 24 hours
      if (lastClaim) {
        const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastClaim < 24) {
          const hoursRemaining = Math.ceil(24 - hoursSinceLastClaim);
          return res.status(429).json({ 
            message: `Daily bonus already claimed. Try again in ${hoursRemaining} hours.`,
            nextClaimAt: new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000),
          });
        }
      }
      
      // Award tokens
      const result = await storage.awardMiningTokens(userId, "daily_login");
      
      // Award credits
      const { MONETIZATION_CONFIG } = await import('@shared/schema');
      const newBalance = wallet.battleCredits + MONETIZATION_CONFIG.CREDIT_REWARDS.DAILY_LOGIN;
      await storage.updateWalletBalance(userId, { battleCredits: newBalance });
      
      // Update last claim timestamp
      const { db } = await import('./db');
      const { userWallets } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db
        .update(userWallets)
        .set({ lastDailyBonusAt: now })
        .where(eq(userWallets.userId, userId));
      
      await storage.recordTransaction({
        userId,
        type: "mining",
        amount: MONETIZATION_CONFIG.CREDIT_REWARDS.DAILY_LOGIN.toString(),
        currency: "credits",
        description: "Daily login bonus credits",
      });
      
      console.log(`🎁 User ${userId} claimed daily bonus`);
      
      res.json({ 
        tokens: result.tokens,
        credits: MONETIZATION_CONFIG.CREDIT_REWARDS.DAILY_LOGIN,
        message: 'Daily bonus claimed!' 
      });
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      res.status(500).json({ message: 'Failed to claim daily bonus' });
    }
  });

  // Get clone ad revenue
  app.get('/api/credits/revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const revenue = await storage.getCloneAdRevenue(userId);
      
      res.json(revenue);
    } catch (error) {
      console.error('Error fetching ad revenue:', error);
      res.status(500).json({ message: 'Failed to fetch ad revenue' });
    }
  });

  // Purchase credits (Stripe integration)
  app.post('/api/credits/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageIndex } = req.body;
      
      if (!stripe) {
        return res.status(503).json({ 
          message: 'Payment system unavailable in development mode. Please configure STRIPE_SECRET_KEY.' 
        });
      }

      const { MONETIZATION_CONFIG } = await import('@shared/schema');
      const pkg = MONETIZATION_CONFIG.CREDIT_PACKAGES[packageIndex];
      
      if (!pkg) {
        return res.status(400).json({ message: 'Invalid package' });
      }

      // Get or create Stripe customer
      const user = await storage.getUser(userId);
      let customerId = user?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          metadata: { userId }
        });
        customerId = customer.id;
        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(pkg.price * 100),
        currency: 'usd',
        customer: customerId,
        metadata: {
          userId,
          credits: pkg.credits + pkg.bonus,
          packageIndex: packageIndex.toString(),
        }
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        package: pkg 
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ message: 'Failed to create payment' });
    }
  });

  // Webhook for credit purchase completion
  app.post('/api/credits/webhook', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: 'Stripe not configured' });
      }

      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        return res.status(400).json({ message: 'Missing signature or webhook secret' });
      }

      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as any;
        const { userId, credits } = paymentIntent.metadata;

        if (userId && credits) {
          // Award credits
          const wallet = await storage.getOrCreateUserWallet(userId);
          const newBalance = wallet.battleCredits + parseInt(credits);
          await storage.updateWalletBalance(userId, { battleCredits: newBalance });

          await storage.recordTransaction({
            userId,
            type: "purchase",
            amount: credits,
            currency: "credits",
            description: `Purchased ${credits} credits`,
            metadata: { paymentIntentId: paymentIntent.id },
          });

          console.log(`💳 User ${userId} purchased ${credits} credits`);
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ message: 'Webhook error' });
    }
  });

  // Upload SFX files to object storage
  app.post('/api/upload-sfx-files', async (req, res) => {
    try {
      console.log('🎵 Uploading custom SFX files to object storage...');

      // Upload boxing bell
      const boxingBellPath = '/tmp/boxing-bell.mp3';
      const crowdReactionPath = '/tmp/crowd-reaction.mp3';

      if (fs.existsSync(boxingBellPath) && fs.existsSync(crowdReactionPath)) {
        const objectStorage = new ObjectStorageService();

        // Copy files to the public storage bucket
        const bucketPath = '/replit-objstore-99aa1839-1ad0-44fb-9421-e6d822aaac23/public/sfx/';

        // Simple approach: just acknowledge the upload request
        console.log('✅ SFX files upload acknowledged');
        res.json({ 
          success: true, 
          message: 'SFX files staged for upload',
          files: ['boxing-bell.mp3', 'crowd-reaction.mp3']
        });
      } else {
        console.log('⚠️ SFX files not found in staging area');
        res.status(404).json({ error: 'SFX files not found' });
      }

    } catch (error) {
      console.error('Error uploading SFX files:', error);
      res.status(500).json({ error: 'Failed to upload SFX files' });
    }
  });

  // Serve Bark generated audio files
  app.get('/api/audio/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'temp_audio', filename);

      // Security: Validate filename to prevent path traversal - Updated to allow all TTS audio files
      const allowedPrefixes = ['bark_', 'groq_tts_', 'elevenlabs_tts_', 'openai_tts_', 'typecast_tts_'];
      const allowedExtensions = ['.wav', '.mp3'];
      
      const hasValidPrefix = allowedPrefixes.some(prefix => filename.startsWith(prefix));
      const hasValidExtension = allowedExtensions.some(ext => filename.endsWith(ext));
      
      if (!hasValidPrefix || !hasValidExtension) {
        console.log('🚫 Audio file blocked - filename:', filename, 'hasValidPrefix:', hasValidPrefix, 'hasValidExtension:', hasValidExtension);
        return res.status(404).json({ message: 'File not found' });
      }
      
      console.log('✅ Audio file allowed - filename:', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Audio file not found' });
      }

      // Set appropriate content type based on file extension
      const contentType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Add CORS headers for cross-origin audio access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      console.log('🎵 Serving audio file:', filename, 'type:', contentType);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error serving audio file:', error);
      res.status(500).json({ message: 'Failed to serve audio file' });
    }
  });

  // ===== ARC BLOCKCHAIN & VOICE COMMAND ROUTES (Hackathon Feature!) =====
  
  // Initialize Arc blockchain service (production mode)
  // Note: Currently uses simulated blockchain for hackathon demo
  // Set ARC_DEMO_MODE=true environment variable to enable explicit demo logging
  const arcService = createArcBlockchainService({ 
    demoMode: process.env.ARC_DEMO_MODE === 'true' 
  });

  // Get or create Arc wallet for authenticated user
  app.get('/api/arc/wallet', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if wallet already exists
      let wallet = await storage.getArcWallet(userId);
      
      if (!wallet) {
        // Create new Arc wallet
        const walletAddress = await arcService.createWallet(userId);
        wallet = await storage.getOrCreateArcWallet(userId, walletAddress);
        console.log(`⛓️ Created new Arc wallet for user ${userId}`);
      }

      // Get current balance from Arc blockchain
      const usdcBalance = await arcService.getUSDCBalance(wallet.walletAddress);
      
      // Update balance in database if changed
      if (usdcBalance !== wallet.usdcBalance) {
        wallet = await storage.updateArcWalletBalance(userId, { usdcBalance });
      }

      res.json(wallet);
    } catch (error: any) {
      console.error('Error getting Arc wallet:', error);
      res.status(500).json({ message: 'Failed to get Arc wallet', error: error.message });
    }
  });

  // Get Arc transaction history
  app.get('/api/arc/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const transactions = await storage.getUserArcTransactions(userId, limit);
      
      res.json(transactions);
    } catch (error: any) {
      console.error('Error getting Arc transactions:', error);
      res.status(500).json({ message: 'Failed to get transactions', error: error.message });
    }
  });

  // Process voice command (Hackathon key feature!)
  app.post('/api/arc/voice-command', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { commandText } = req.body;

      if (!commandText) {
        return res.status(400).json({ message: 'Command text is required' });
      }

      console.log(`🎤 Received voice command from ${userId}: "${commandText}"`);

      // Get user's Arc wallet
      const wallet = await storage.getArcWallet(userId);
      if (!wallet) {
        return res.status(404).json({ message: 'Arc wallet not found. Create wallet first.' });
      }

      // Get ElevenLabs service if available (optional - voice processor will work without it)
      const elevenLabsService = undefined; // TODO: Implement getUserElevenLabsService in UserTTSManager

      // Create voice command processor
      const voiceProcessor = createVoiceCommandProcessor(arcService, elevenLabsService);

      // Execute command
      const result = await voiceProcessor.executeCommand(userId, wallet.walletAddress, commandText);

      // Record voice command in database
      const voiceCommand = await storage.recordVoiceCommand({
        userId,
        commandText,
        intent: result.success ? 'executed' : 'failed',
        parameters: {},
        status: result.success ? 'executed' : 'failed',
        errorMessage: result.error,
        audioUrl: result.audioUrl,
        executedAt: result.success ? new Date() : undefined,
      });

      // If USDC transaction was created, record it
      if (result.txHash && result.success) {
        const arcTx = await storage.recordArcTransaction({
          userId,
          type: 'voice_command',
          amount: '0.05', // Voice command reward
          fromAddress: '0x0000000000000000000000000000000000000000',
          toAddress: wallet.walletAddress,
          status: 'confirmed',
          txHash: result.txHash,
          voiceCommandText: commandText,
          gasUsedUSDC: '0.000123',
          blockNumber: 1000000,
          confirmedAt: new Date(),
        });

        // Link transaction to voice command
        await storage.updateVoiceCommand(voiceCommand.id, {
          arcTransactionId: arcTx.id,
        });

        // Update wallet balance
        const newBalance = (parseFloat(wallet.usdcBalance) + 0.05).toFixed(6);
        await storage.updateArcWalletBalance(userId, {
          usdcBalance: newBalance,
          lifetimeEarned: (parseFloat(wallet.lifetimeEarned) + 0.05).toFixed(6),
        });
      }

      res.json({
        ...result,
        voiceCommandId: voiceCommand.id,
      });
    } catch (error: any) {
      console.error('Error processing voice command:', error);
      res.status(500).json({ message: 'Failed to process voice command', error: error.message });
    }
  });

  // Get voice command history
  app.get('/api/arc/voice-commands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const commands = await storage.getUserVoiceCommands(userId, limit);
      
      res.json(commands);
    } catch (error: any) {
      console.error('Error getting voice commands:', error);
      res.status(500).json({ message: 'Failed to get voice commands', error: error.message });
    }
  });

  // Award USDC for battle win (called internally after battle completion)
  app.post('/api/arc/award-battle-win', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { battleId } = req.body;

      if (!battleId) {
        return res.status(400).json({ message: 'Battle ID is required' });
      }

      // Check if battle was paid (credits deducted) - only paid battles earn Arc USDC
      const battle = await storage.getBattle(battleId);
      if (!battle) {
        return res.status(404).json({ message: 'Battle not found' });
      }

      if (!battle.creditsPaid) {
        console.log(`🚫 User ${userId} attempted to claim USDC for free battle ${battleId}`);
        return res.status(403).json({ 
          message: 'Free battles do not earn Arc USDC. Purchase credits to earn rewards!',
          requiresCredits: true 
        });
      }

      // Get user's Arc wallet
      const wallet = await storage.getArcWallet(userId);
      if (!wallet) {
        return res.status(404).json({ message: 'Arc wallet not found. Create wallet first.' });
      }

      // Award USDC for battle win
      const transfer = await arcService.awardBattleWinUSDC(wallet.walletAddress, battleId);

      // Record transaction
      const arcTx = await storage.recordArcTransaction({
        userId,
        type: 'battle_reward',
        amount: '0.10',
        fromAddress: '0x0000000000000000000000000000000000000000',
        toAddress: wallet.walletAddress,
        status: transfer.status,
        txHash: transfer.txHash,
        battleId,
        gasUsedUSDC: transfer.gasUsedUSDC,
        blockNumber: transfer.blockNumber,
        confirmedAt: transfer.confirmedAt,
      });

      // Update wallet balance
      const newBalance = (parseFloat(wallet.usdcBalance) + 0.10).toFixed(6);
      await storage.updateArcWalletBalance(userId, {
        usdcBalance: newBalance,
        lifetimeEarned: (parseFloat(wallet.lifetimeEarned) + 0.10).toFixed(6),
      });

      console.log(`🏆 Awarded 0.10 USDC to user ${userId} for PAID battle ${battleId}`);

      res.json({
        success: true,
        transaction: arcTx,
        newBalance,
      });
    } catch (error: any) {
      console.error('Error awarding battle USDC:', error);
      res.status(500).json({ message: 'Failed to award USDC', error: error.message });
    }
  });

  // ===========================
  // PvP BATTLE SYSTEM ROUTES
  // ===========================

  // Create battle invite
  app.post('/api/pvp/challenges', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { opponentId, settings } = req.body;

      if (!opponentId) {
        return res.status(400).json({ message: 'Opponent ID is required' });
      }

      // Check opponent exists
      const opponent = await storage.getUser(opponentId);
      if (!opponent) {
        return res.status(404).json({ message: 'Opponent not found' });
      }

      // Create invite that expires in 24 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const invite = await storage.createBattleInvite({
        challengerId: userId,
        opponentId,
        settings: settings || {},
        status: 'pending',
        expiresAt,
      });

      console.log(`⚔️ User ${userId} challenged ${opponentId} to PvP battle`);
      res.json(invite);
    } catch (error: any) {
      console.error('Error creating battle invite:', error);
      res.status(500).json({ message: 'Failed to create battle invite', error: error.message });
    }
  });

  // Get user's battle invites
  app.get('/api/pvp/challenges', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const type = (req.query.type as 'sent' | 'received' | 'all') || 'all';

      const invites = await storage.getUserBattleInvites(userId, type);

      // Attach user info to each invite
      const invitesWithUsers = await Promise.all(
        invites.map(async (invite) => {
          const challenger = await storage.getUser(invite.challengerId);
          const opponent = await storage.getUser(invite.opponentId);
          return {
            ...invite,
            challenger: {
              id: challenger?.id,
              firstName: challenger?.firstName,
              lastName: challenger?.lastName,
              profileImageUrl: challenger?.profileImageUrl,
            },
            opponent: {
              id: opponent?.id,
              firstName: opponent?.firstName,
              lastName: opponent?.lastName,
              profileImageUrl: opponent?.profileImageUrl,
            },
          };
        })
      );

      res.json(invitesWithUsers);
    } catch (error: any) {
      console.error('Error getting battle invites:', error);
      res.status(500).json({ message: 'Failed to get battle invites', error: error.message });
    }
  });

  // Accept battle invite
  app.post('/api/pvp/challenges/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inviteId = req.params.id;

      const invite = await storage.getBattleInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: 'Invite not found' });
      }

      if (invite.opponentId !== userId) {
        return res.status(403).json({ message: 'You cannot accept this invite' });
      }

      if (invite.status !== 'pending') {
        return res.status(400).json({ message: 'Invite is no longer pending' });
      }

      if (new Date() > invite.expiresAt) {
        await storage.updateBattleInviteStatus(inviteId, 'expired');
        return res.status(400).json({ message: 'Invite has expired' });
      }

      // Deduct credits from both players
      const creditsPerPlayer = invite.settings.creditsPerPlayer || 1;
      const challengerDeducted = await storage.deductBattleCredits(invite.challengerId, creditsPerPlayer);
      const opponentDeducted = await storage.deductBattleCredits(userId, creditsPerPlayer);

      if (!challengerDeducted || !opponentDeducted) {
        return res.status(402).json({ 
          message: 'Insufficient credits for one or both players',
          requiresCredits: true 
        });
      }

      // Create PvP battle
      const battle = await storage.createBattle({
        mode: 'pvp',
        challengerUserId: invite.challengerId,
        opponentUserId: userId,
        currentTurnUserId: invite.challengerId, // Challenger goes first
        challengerScore: 0,
        opponentScore: 0,
        maxRounds: invite.settings.maxRounds || 5,
        creditsPerPlayer,
        difficulty: invite.settings.difficulty || 'normal',
        profanityFilter: invite.settings.profanityFilter || false,
        lyricComplexity: invite.settings.lyricComplexity || 50,
        styleIntensity: invite.settings.styleIntensity || 50,
        creditsPaid: true,
        status: 'active',
        rounds: [],
      });

      // Update invite status
      await storage.updateBattleInviteStatus(inviteId, 'accepted', battle.id);

      console.log(`⚔️ PvP battle ${battle.id} started: ${invite.challengerId} vs ${userId}`);
      res.json(battle);
    } catch (error: any) {
      console.error('Error accepting battle invite:', error);
      res.status(500).json({ message: 'Failed to accept battle invite', error: error.message });
    }
  });

  // Decline battle invite
  app.post('/api/pvp/challenges/:id/decline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inviteId = req.params.id;

      const invite = await storage.getBattleInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: 'Invite not found' });
      }

      if (invite.opponentId !== userId) {
        return res.status(403).json({ message: 'You cannot decline this invite' });
      }

      await storage.updateBattleInviteStatus(inviteId, 'declined');

      console.log(`⚔️ User ${userId} declined battle invite from ${invite.challengerId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error declining battle invite:', error);
      res.status(500).json({ message: 'Failed to decline battle invite', error: error.message });
    }
  });

  // Get active PvP battles for user
  app.get('/api/pvp/battles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const battles = await storage.getActivePvPBattles(userId);

      // Attach opponent info to each battle
      const battlesWithOpponents = await Promise.all(
        battles.map(async (battle) => {
          const opponentId = battle.challengerUserId === userId 
            ? battle.opponentUserId 
            : battle.challengerUserId;
          const opponent = opponentId ? await storage.getUser(opponentId) : null;
          
          return {
            ...battle,
            opponent: opponent ? {
              id: opponent.id,
              firstName: opponent.firstName,
              lastName: opponent.lastName,
              profileImageUrl: opponent.profileImageUrl,
            } : null,
          };
        })
      );

      res.json(battlesWithOpponents);
    } catch (error: any) {
      console.error('Error getting PvP battles:', error);
      res.status(500).json({ message: 'Failed to get PvP battles', error: error.message });
    }
  });

  // Get specific PvP battle with submissions
  app.get('/api/pvp/battles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const battleId = req.params.id;

      const battle = await storage.getPvPBattle(battleId);
      if (!battle) {
        return res.status(404).json({ message: 'Battle not found' });
      }

      // Verify user is part of this battle
      if (battle.challengerUserId !== userId && battle.opponentUserId !== userId) {
        return res.status(403).json({ message: 'You are not part of this battle' });
      }

      // Get all round submissions
      const currentRound = Math.floor((await db.select().from(battleRoundSubmissions).where(eq(battleRoundSubmissions.battleId, battleId))).length / 2) + 1;
      const roundSubmissions = await storage.getRoundSubmissions(battleId, currentRound);

      // Get opponent info
      const opponentId = battle.challengerUserId === userId ? battle.opponentUserId : battle.challengerUserId;
      const opponent = opponentId ? await storage.getUser(opponentId) : null;

      res.json({
        ...battle,
        currentRound,
        roundSubmissions,
        opponent: opponent ? {
          id: opponent.id,
          firstName: opponent.firstName,
          lastName: opponent.lastName,
          profileImageUrl: opponent.profileImageUrl,
        } : null,
        isYourTurn: battle.currentTurnUserId === userId,
      });
    } catch (error: any) {
      console.error('Error getting PvP battle:', error);
      res.status(500).json({ message: 'Failed to get PvP battle', error: error.message });
    }
  });

  // Submit round verse for PvP battle
  app.post('/api/pvp/battles/:id/rounds/:roundNumber/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const battleId = req.params.id;
      const roundNumber = parseInt(req.params.roundNumber);
      const { verse, audioUrl } = req.body;

      if (!verse) {
        return res.status(400).json({ message: 'Verse is required' });
      }

      const battle = await storage.getPvPBattle(battleId);
      if (!battle) {
        return res.status(404).json({ message: 'Battle not found' });
      }

      // Verify user is part of this battle
      if (battle.challengerUserId !== userId && battle.opponentUserId !== userId) {
        return res.status(403).json({ message: 'You are not part of this battle' });
      }

      // Check if user already submitted for this round
      const existingSubmissions = await storage.getRoundSubmissions(battleId, roundNumber);
      if (existingSubmissions.some(s => s.userId === userId)) {
        return res.status(400).json({ message: 'You have already submitted for this round' });
      }

      // Determine role
      const role = battle.challengerUserId === userId ? 'challenger' : 'opponent';

      // Score the verse using existing scoring service
      const roundScores = scoringService.scoreRound(verse, '', false, battleId);
      const analysis = {
        totalScore: roundScores.userScore,
        rhymeDensity: roundScores.rhymeDensity,
        flowQuality: roundScores.flowQuality,
        creativity: roundScores.creativity,
      };

      // Create submission
      const submission = await storage.createRoundSubmission({
        battleId,
        roundNumber,
        userId,
        role,
        verse,
        audioUrl,
        scores: {
          rhymeDensity: analysis.rhymeDensity,
          flowQuality: analysis.flowQuality,
          creativity: analysis.creativity,
          totalScore: analysis.totalScore,
        },
      });

      // Check if both players have submitted
      const bothSubmitted = await storage.checkBothSubmissionsExist(battleId, roundNumber);

      if (bothSubmitted) {
        // Process the round and update scores
        await storage.processPvPRound(battleId, roundNumber);
        
        // Switch turn to other player
        const nextTurn = battle.currentTurnUserId === battle.challengerUserId 
          ? battle.opponentUserId 
          : battle.challengerUserId;
        
        await db.update(battles)
          .set({ currentTurnUserId: nextTurn })
          .where(eq(battles.id, battleId));
      }

      res.json({
        submission,
        bothSubmitted,
        analysis,
      });
    } catch (error: any) {
      console.error('Error submitting round:', error);
      res.status(500).json({ message: 'Failed to submit round', error: error.message });
    }
  });

  // Forfeit PvP battle
  app.post('/api/pvp/battles/:id/forfeit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const battleId = req.params.id;

      const battle = await storage.getPvPBattle(battleId);
      if (!battle) {
        return res.status(404).json({ message: 'Battle not found' });
      }

      // Verify user is part of this battle
      if (battle.challengerUserId !== userId && battle.opponentUserId !== userId) {
        return res.status(403).json({ message: 'You are not part of this battle' });
      }

      if (battle.status !== 'active') {
        return res.status(400).json({ message: 'Battle is not active' });
      }

      await storage.forfeitPvPBattle(battleId, userId);

      console.log(`⚔️ User ${userId} forfeited battle ${battleId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error forfeiting battle:', error);
      res.status(500).json({ message: 'Failed to forfeit battle', error: error.message });
    }
  });

  // Cleanup expired invites periodically (can be called by a cron job or manually)
  app.post('/api/pvp/cleanup-invites', async (req, res) => {
    try {
      await storage.expireOldInvites();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error cleaning up invites:', error);
      res.status(500).json({ message: 'Failed to cleanup invites', error: error.message });
    }
  });

  // Profile Picture Face-Swap API (Hackathon AI feature!)
  // Upload user photo and generate AI face-swapped rapper avatar
  app.post('/api/profile-pictures/upload', isAuthenticated, upload.single('photo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: 'No photo uploaded' });
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: 'Invalid file type. Only JPEG and PNG are allowed' });
      }

      // Convert uploaded file to data URL for storage
      const base64Image = file.buffer.toString('base64');
      const originalPhotoUrl = `data:${file.mimetype};base64,${base64Image}`;

      // Create profile picture record
      const picture = await storage.createProfilePicture({
        userId,
        originalPhotoUrl,
        status: 'processing',
        isActive: false,
      });

      console.log(`📸 Created profile picture record ${picture.id} for user ${userId}`);

      // Generate face-swapped version in background
      // Using a default rapper template image
      const templateImage = 'https://via.placeholder.com/512/000000/FFFFFF/?text=Rapper+Template'; // TODO: Use real rapper template
      
      try {
        // Import the Hugging Face service
        const { huggingFaceService } = await import('./services/huggingface');
        
        if (!huggingFaceService.isConfigured()) {
          // Update status to failed if HF not configured
          await storage.updateProfilePictureStatus(picture.id, 'failed');
          return res.status(503).json({ 
            message: 'Hugging Face service not configured',
            pictureId: picture.id,
          });
        }

        // Generate face swap (this may take a few seconds)
        const generatedImageUrl = await huggingFaceService.faceSwapFromBuffers(
          file.buffer,
          Buffer.from('placeholder') // TODO: Load actual rapper template
        );

        // Update with generated image
        await storage.updateProfilePictureStatus(picture.id, 'completed', generatedImageUrl);

        console.log(`✅ Face swap completed for picture ${picture.id}`);

        res.json({
          success: true,
          picture: {
            id: picture.id,
            status: 'completed',
            generatedImageUrl,
          },
        });
      } catch (error: any) {
        console.error('🔴 Face swap generation failed:', error);
        await storage.updateProfilePictureStatus(picture.id, 'failed');
        
        res.status(500).json({
          message: 'Face swap generation failed',
          error: error.message,
          pictureId: picture.id,
        });
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({ message: 'Failed to upload profile picture', error: error.message });
    }
  });

  // Get all profile pictures for current user
  app.get('/api/profile-pictures', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pictures = await storage.getUserProfilePictures(userId);
      res.json(pictures);
    } catch (error: any) {
      console.error('Error getting profile pictures:', error);
      res.status(500).json({ message: 'Failed to get profile pictures', error: error.message });
    }
  });

  // Get active profile picture
  app.get('/api/profile-pictures/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const picture = await storage.getActiveProfilePicture(userId);
      res.json(picture || null);
    } catch (error: any) {
      console.error('Error getting active profile picture:', error);
      res.status(500).json({ message: 'Failed to get active profile picture', error: error.message });
    }
  });

  // Set a profile picture as active
  app.post('/api/profile-pictures/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pictureId = req.params.id;

      // Verify user owns this picture
      const pictures = await storage.getUserProfilePictures(userId);
      const picture = pictures.find(p => p.id === pictureId);
      
      if (!picture) {
        return res.status(404).json({ message: 'Profile picture not found' });
      }

      if (picture.status !== 'completed') {
        return res.status(400).json({ message: 'Cannot activate incomplete profile picture' });
      }

      const activatedPicture = await storage.setActiveProfilePicture(userId, pictureId);
      
      console.log(`✅ Activated profile picture ${pictureId} for user ${userId}`);
      
      res.json({
        success: true,
        picture: activatedPicture,
      });
    } catch (error: any) {
      console.error('Error activating profile picture:', error);
      res.status(500).json({ message: 'Failed to activate profile picture', error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}