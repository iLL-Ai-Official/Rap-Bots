import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real, decimal, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from 'drizzle-orm';

// Define RoundScores interface first
export interface RoundScores {
  userScore: number;
  aiScore: number;
  rhymeDensity: number;
  flowQuality: number;
  creativity: number;
  totalScore: number;
}

// Battles table with user authentication
export const battles = pgTable("battles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  userScore: integer("user_score").notNull().default(0),
  aiScore: integer("ai_score").notNull().default(0),
  difficulty: text("difficulty").notNull().default("normal"),
  profanityFilter: boolean("profanity_filter").notNull().default(false),
  aiCharacterId: text("ai_character_id"),
  aiCharacterName: text("ai_character_name"),
  aiVoiceId: text("ai_voice_id"),
  lyricComplexity: integer("lyric_complexity").default(50), // 0-100 complexity level
  styleIntensity: integer("style_intensity").default(50), // 0-100 style intensity level
  voiceSpeed: real("voice_speed").default(1.0), // 0.5-2.0 voice speed multiplier
  rounds: jsonb("rounds").$type<Array<{
    id: string;
    battleId: string;
    roundNumber: number;
    userVerse: string | null;
    aiVerse: string;
    userAudioUrl: string | null;
    aiAudioUrl: string | null;
    scores: RoundScores;
    createdAt: Date;
  }>>().notNull().default([]),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const battleRounds = pgTable("battle_rounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  battleId: varchar("battle_id").references(() => battles.id).notNull(),
  roundNumber: integer("round_number").notNull(),
  userVerse: text("user_verse"),
  aiVerse: text("ai_verse").notNull(),
  userAudioUrl: text("user_audio_url"),
  aiAudioUrl: text("ai_audio_url"),
  userBattleMap: text("user_battle_map"), // Professional battle rap mapping for display
  scores: jsonb("scores").$type<RoundScores>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBattleSchema = createInsertSchema(battles).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertBattleRoundSchema = createInsertSchema(battleRounds).omit({
  id: true,
  createdAt: true,
});

export type InsertBattle = z.infer<typeof insertBattleSchema>;
export type Battle = typeof battles.$inferSelect;
export type InsertBattleRound = z.infer<typeof insertBattleRoundSchema>;
export type BattleRound = typeof battleRounds.$inferSelect;

export interface BattleState {
  id: string;
  currentRound: number;
  maxRounds: number;
  isRecording: boolean;
  isAIResponding: boolean;
  isPlayingAudio: boolean;
  userScore: number;
  aiScore: number;
  difficulty: "easy" | "normal" | "hard";
  profanityFilter: boolean;
  timeRemaining: number;
}

export interface AudioRecording {
  blob: Blob;
  duration: number;
  transcript?: string;
}

export interface GroqTranscriptionResponse {
  text: string;
}

export interface GroqResponseData {
  id: string;
  object: string;
  status: string;
  output: Array<{
    type: string;
    content: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

export interface TypecastTTSResponse {
  audioUrl: string;
  duration: number;
}

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication and subscriptions
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id").unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("free"), // free, active, cancelled, past_due
  subscriptionTier: varchar("subscription_tier").default("free"), // free, premium, pro
  battlesRemaining: integer("battles_remaining").default(3), // Daily free battles
  lastBattleReset: timestamp("last_battle_reset").defaultNow(),
  storeCredit: decimal("store_credit", { precision: 10, scale: 2 }).notNull().default("0.00"), // Store credit balance
  referralCode: varchar("referral_code"), // User's unique referral code
  referredBy: varchar("referred_by"), // Who referred this user
  totalBattles: integer("total_battles").default(0),
  totalWins: integer("total_wins").default(0),
  // User-managed API keys for enhanced TTS services
  openaiApiKey: varchar("openai_api_key"), // User's encrypted OpenAI API key
  groqApiKey: varchar("groq_api_key"), // User's encrypted Groq API key
  elevenlabsApiKey: varchar("elevenlabs_api_key"), // User's encrypted ElevenLabs API key
  preferredTtsService: varchar("preferred_tts_service").default("elevenlabs"), // "openai", "groq", "elevenlabs", "system"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for Stripe webhook performance
  index("idx_users_stripe_customer_id").on(table.stripeCustomerId),
]);



// Relations
export const userRelations = relations(users, ({ many }) => ({
  battles: many(battles),
}));

export const battleRelations = relations(battles, ({ one }) => ({
  user: one(users, { fields: [battles.userId], references: [users.id] }),
}));

// Type definitions
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Tournament system
export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull().default("single_elimination"), // single_elimination, double_elimination
  status: varchar("status").notNull().default("active"), // active, completed, abandoned
  currentRound: integer("current_round").notNull().default(1),
  totalRounds: integer("total_rounds").notNull(),
  difficulty: varchar("difficulty").notNull().default("normal"),
  profanityFilter: boolean("profanity_filter").notNull().default(false),
  lyricComplexity: integer("lyric_complexity").default(50),
  styleIntensity: integer("style_intensity").default(50),
  prize: varchar("prize"), // What player gets for winning
  opponents: jsonb("opponents").$type<string[]>().notNull().default([]), // Array of character IDs
  bracket: jsonb("bracket").$type<TournamentBracket>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const tournamentBattles = pgTable("tournament_battles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").references(() => tournaments.id).notNull(),
  battleId: varchar("battle_id").references(() => battles.id).notNull(),
  round: integer("round").notNull(),
  position: integer("position").notNull(), // Position in the bracket
  isCompleted: boolean("is_completed").notNull().default(false),
  winnerId: varchar("winner_id"), // user ID or character ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Referral system table
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").references(() => users.id).notNull(), // User who made the referral
  refereeId: varchar("referee_id").references(() => users.id), // User who was referred
  referralCode: varchar("referral_code").notNull(), // The referral code used
  status: varchar("status").notNull().default("pending"), // pending, completed, rewarded
  creditAwarded: decimal("credit_awarded", { precision: 10, scale: 2 }).default("0.00"), // Amount of credit given
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"), // When the referral was completed
});

export interface TournamentBracket {
  rounds: TournamentRound[];
}

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
}

export interface TournamentMatch {
  id: string;
  player1: TournamentPlayer;
  player2: TournamentPlayer;
  winner?: TournamentPlayer;
  battleId?: string;
  isCompleted: boolean;
}

export interface TournamentPlayer {
  id: string;
  name: string;
  type: 'user' | 'ai';
  avatar?: string;
}

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
}).extend({
  bracket: z.object({
    rounds: z.array(z.object({
      roundNumber: z.number(),
      matches: z.array(z.object({
        id: z.string(),
        player1: z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(['user', 'ai']),
          avatar: z.string().optional()
        }),
        player2: z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(['user', 'ai']),
          avatar: z.string().optional()
        }),
        winner: z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(['user', 'ai']),
          avatar: z.string().optional()
        }).optional(),
        battleId: z.string().optional(),
        isCompleted: z.boolean()
      }))
    }))
  })
});

export const insertTournamentBattleSchema = createInsertSchema(tournamentBattles).omit({
  id: true,
  createdAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournamentBattle = z.infer<typeof insertTournamentBattleSchema>;
export type TournamentBattle = typeof tournamentBattles.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// Subscription tiers and pricing
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    battlesPerDay: 3,
    features: ["3 battles per day", "Basic AI opponents", "Standard voices"]
  },
  premium: {
    name: "Premium",
    price: 9.99,
    battlesPerDay: 25,
    features: ["25 battles per day", "Advanced AI opponents", "Premium voices", "Battle analysis", "No ads"]
  },
  pro: {
    name: "Pro",
    price: 19.99,
    battlesPerDay: -1, // unlimited
    features: ["Unlimited battles", "All AI opponents", "Custom voices", "Advanced analytics", "Priority support", "Tournament mode"]
  }
} as const;

// Webhook idempotency tracking
export const processedWebhookEvents = pgTable("processed_webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").unique().notNull(), // Stripe event ID
  eventType: varchar("event_type").notNull(), // e.g., payment_intent.succeeded
  processedAt: timestamp("processed_at").notNull().defaultNow(),
}, (table) => [
  index("idx_webhook_events_event_id").on(table.eventId),
  index("idx_webhook_events_processed_at").on(table.processedAt),
]);

export const insertWebhookEventSchema = createInsertSchema(processedWebhookEvents).omit({
  id: true,
  processedAt: true,
});

export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect;

// User Clones table - Bot clones of users that match their skill level
export const userClones = pgTable("user_clones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  cloneName: varchar("clone_name").notNull(), // e.g., "Shadow User" or custom name
  skillLevel: integer("skill_level").notNull().default(50), // 0-100, based on user's average performance
  avgRhymeDensity: integer("avg_rhyme_density").notNull().default(50), // Average rhyme density score
  avgFlowQuality: integer("avg_flow_quality").notNull().default(50), // Average flow quality score
  avgCreativity: integer("avg_creativity").notNull().default(50), // Average creativity score
  battlesAnalyzed: integer("battles_analyzed").notNull().default(0), // Number of user battles used for analysis
  style: text("style").notNull().default("balanced"), // User's battle style
  voiceId: text("voice_id"), // Voice ID for TTS (can use similar voice to user's preferred)
  isActive: boolean("is_active").notNull().default(true), // Whether clone is active/available
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserCloneSchema = createInsertSchema(userClones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserClone = z.infer<typeof insertUserCloneSchema>;
export type UserClone = typeof userClones.$inferSelect;

// Relations for user clones
export const userCloneRelations = relations(userClones, ({ one }) => ({
  user: one(users, { fields: [userClones.userId], references: [users.id] }),
}));

// ====================
// MONETIZATION SYSTEM
// ====================

// User Wallet - Tracks credits and tokens
export const userWallets = pgTable("user_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  battleCredits: integer("battle_credits").notNull().default(10), // Credits to spend on battles
  tokens: decimal("tokens", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Mined/earned tokens
  lifetimeEarned: decimal("lifetime_earned", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Total earned
  lifetimeSpent: decimal("lifetime_spent", { precision: 18, scale: 8 }).notNull().default("0.00000000"), // Total spent
  cloneAdRevenue: decimal("clone_ad_revenue", { precision: 10, scale: 2 }).notNull().default("0.00"), // Revenue from clone battles
  totalAdImpressions: integer("total_ad_impressions").notNull().default(0),
  lastDailyBonusAt: timestamp("last_daily_bonus_at"), // Last time daily bonus was claimed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_user_wallets_user_id").on(table.userId),
]);

// Transaction history for all credit/token movements
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // mining, battle_cost, battle_win, ad_revenue, purchase, withdrawal, clone_revenue
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  currency: varchar("currency").notNull().default("credits"), // credits, tokens, usd
  description: text("description"),
  battleId: varchar("battle_id").references(() => battles.id),
  relatedUserId: varchar("related_user_id").references(() => users.id), // For clone revenue - who battled the clone
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_transactions_user_id").on(table.userId),
  index("idx_transactions_type").on(table.type),
  index("idx_transactions_created_at").on(table.createdAt),
]);

// Mining events - Track when users mine tokens
export const miningEvents = pgTable("mining_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tokensEarned: decimal("tokens_earned", { precision: 18, scale: 8 }).notNull(),
  activityType: varchar("activity_type").notNull(), // battle_complete, daily_login, referral, clone_battled
  battleId: varchar("battle_id").references(() => battles.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_mining_events_user_id").on(table.userId),
  index("idx_mining_events_created_at").on(table.createdAt),
]);

// Ad impressions - Track ads shown and revenue generated
export const adImpressions = pgTable("ad_impressions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  battleId: varchar("battle_id").references(() => battles.id).notNull(),
  viewerId: varchar("viewer_id").references(() => users.id).notNull(), // User who saw the ad
  cloneOwnerId: varchar("clone_owner_id").references(() => users.id).notNull(), // User who owns the clone
  adProvider: varchar("ad_provider").notNull().default("system"), // system, google_ads, etc.
  revenueGenerated: decimal("revenue_generated", { precision: 10, scale: 4 }).notNull().default("0.0000"),
  revenueShare: decimal("revenue_share", { precision: 10, scale: 4 }).notNull().default("0.0000"), // Owner's share
  metadata: jsonb("metadata").$type<{
    adId?: string;
    adType?: string;
    impressionId?: string;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_ad_impressions_clone_owner").on(table.cloneOwnerId),
  index("idx_ad_impressions_battle_id").on(table.battleId),
  index("idx_ad_impressions_created_at").on(table.createdAt),
]);

// Arc Blockchain Wallets - USDC on Circle's Arc L1
export const arcWallets = pgTable("arc_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(), // Ethereum-compatible address
  usdcBalance: decimal("usdc_balance", { precision: 18, scale: 6 }).notNull().default("0.000000"), // USDC balance
  lifetimeEarned: decimal("lifetime_earned", { precision: 18, scale: 6 }).notNull().default("0.000000"), // Total USDC earned
  lifetimeWithdrawn: decimal("lifetime_withdrawn", { precision: 18, scale: 6 }).notNull().default("0.000000"), // Total USDC withdrawn
  lastSyncedAt: timestamp("last_synced_at"), // Last time balance was synced from blockchain
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_arc_wallets_user_id").on(table.userId),
  index("idx_arc_wallets_address").on(table.walletAddress),
]);

// Arc Blockchain Transactions - USDC payments on Arc L1
export const arcTransactions = pgTable("arc_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  txHash: varchar("tx_hash", { length: 66 }).unique(), // Blockchain transaction hash
  type: varchar("type").notNull(), // battle_reward, prize_payout, withdrawal, deposit, voice_command
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  fromAddress: varchar("from_address", { length: 42 }),
  toAddress: varchar("to_address", { length: 42 }),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, failed
  battleId: varchar("battle_id").references(() => battles.id),
  voiceCommandText: text("voice_command_text"), // Original voice command that triggered this transaction
  gasUsedUSDC: decimal("gas_used_usdc", { precision: 10, scale: 6 }), // Gas cost in USDC (Arc native gas)
  blockNumber: integer("block_number"),
  confirmedAt: timestamp("confirmed_at"),
  metadata: jsonb("metadata").$type<{
    circleTransferId?: string;
    errorMessage?: string;
    retryCount?: number;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_arc_tx_user_id").on(table.userId),
  index("idx_arc_tx_hash").on(table.txHash),
  index("idx_arc_tx_status").on(table.status),
  index("idx_arc_tx_created_at").on(table.createdAt),
]);

// Voice Command History - Track voice-to-blockchain commands for hackathon demo
export const voiceCommands = pgTable("voice_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  commandText: text("command_text").notNull(), // Transcribed voice command
  intent: varchar("intent").notNull(), // send_usdc, check_balance, battle_payout, withdraw, etc.
  parameters: jsonb("parameters").$type<{
    amount?: string;
    recipient?: string;
    battleId?: string;
    [key: string]: any;
  }>(),
  arcTransactionId: varchar("arc_transaction_id").references(() => arcTransactions.id),
  status: varchar("status").notNull().default("processing"), // processing, executed, failed, cancelled
  errorMessage: text("error_message"),
  audioUrl: text("audio_url"), // ElevenLabs audio confirmation URL
  createdAt: timestamp("created_at").notNull().defaultNow(),
  executedAt: timestamp("executed_at"),
}, (table) => [
  index("idx_voice_commands_user_id").on(table.userId),
  index("idx_voice_commands_created_at").on(table.createdAt),
]);

// Insert schemas
export const insertUserWalletSchema = createInsertSchema(userWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertMiningEventSchema = createInsertSchema(miningEvents).omit({
  id: true,
  createdAt: true,
});

export const insertAdImpressionSchema = createInsertSchema(adImpressions).omit({
  id: true,
  createdAt: true,
});

export const insertArcWalletSchema = createInsertSchema(arcWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArcTransactionSchema = createInsertSchema(arcTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertVoiceCommandSchema = createInsertSchema(voiceCommands).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;
export type UserWallet = typeof userWallets.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertMiningEvent = z.infer<typeof insertMiningEventSchema>;
export type MiningEvent = typeof miningEvents.$inferSelect;
export type InsertAdImpression = z.infer<typeof insertAdImpressionSchema>;
export type AdImpression = typeof adImpressions.$inferSelect;
export type InsertArcWallet = z.infer<typeof insertArcWalletSchema>;
export type ArcWallet = typeof arcWallets.$inferSelect;
export type InsertArcTransaction = z.infer<typeof insertArcTransactionSchema>;
export type ArcTransaction = typeof arcTransactions.$inferSelect;
export type InsertVoiceCommand = z.infer<typeof insertVoiceCommandSchema>;
export type VoiceCommand = typeof voiceCommands.$inferSelect;

// Monetization constants
export const MONETIZATION_CONFIG = {
  // Battle costs
  BATTLE_COST_CREDITS: 1, // Cost to start a battle
  
  // Mining rewards
  MINING_REWARDS: {
    BATTLE_COMPLETE: "0.10000000", // Tokens per battle
    BATTLE_WIN: "0.25000000", // Bonus for winning
    DAILY_LOGIN: "0.05000000", // Daily login bonus
    CLONE_BATTLED: "0.15000000", // When someone battles your clone
    REFERRAL: "1.00000000", // Referral bonus
  },
  
  // Credit rewards
  CREDIT_REWARDS: {
    BATTLE_WIN: 2, // Credits earned for winning
    DAILY_LOGIN: 5, // Daily login bonus
    LEVEL_UP: 10, // Bonus credits when leveling up
  },
  
  // Ad revenue
  AD_REVENUE: {
    PER_IMPRESSION: "0.0050", // $0.005 per ad view
    OWNER_SHARE: 0.70, // 70% goes to clone owner
    PLATFORM_SHARE: 0.30, // 30% goes to platform
  },
  
  // Credit purchase packages
  CREDIT_PACKAGES: [
    { credits: 100, price: 0.99, bonus: 0 },
    { credits: 500, price: 3.99, bonus: 50 },
    { credits: 1000, price: 6.99, bonus: 150 },
    { credits: 5000, price: 24.99, bonus: 1000 },
  ],
  
  // Arc blockchain USDC rewards (Hackathon feature!)
  ARC_REWARDS: {
    BATTLE_WIN_USDC: "0.10", // $0.10 USDC for winning a battle
    TOURNAMENT_1ST: "50.00", // $50 USDC for 1st place
    TOURNAMENT_2ND: "25.00", // $25 USDC for 2nd place
    TOURNAMENT_3RD: "10.00", // $10 USDC for 3rd place
    DAILY_CHALLENGE: "1.00", // $1 USDC for completing daily challenge
    VOICE_COMMAND_REWARD: "0.05", // $0.05 USDC for successful voice command
  },
} as const;

// ElevenLabs API constants for hackathon
export const ELEVENLABS_CONFIG = {
  BASE_URL: "https://api.elevenlabs.io/v1",
  DEFAULT_MODEL: "eleven_flash_v2_5", // Ultra-fast for real-time (75ms latency)
  BATTLE_MODEL: "eleven_turbo_v2_5", // Balanced quality/speed for battles
  DRAMATIC_MODEL: "eleven_multilingual_v2", // High quality for dramatic moments
  VOICE_SETTINGS: {
    stability: 0.5,
    similarity_boost: 0.75,
    speed: 1.0,
    use_speaker_boost: true,
  },
} as const;
