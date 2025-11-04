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
  // Arc Blockchain wager battling
  isWagerBattle: boolean("is_wager_battle").notNull().default(false), // Whether this is a wager battle
  wagerAmountUSDC: decimal("wager_amount_usdc", { precision: 20, scale: 6 }), // USDC wager amount
  wagerTxHash: varchar("wager_tx_hash"), // Arc blockchain transaction hash for wager
  rewardTxHash: varchar("reward_tx_hash"), // Arc blockchain transaction hash for reward payout
  // Multiplayer PvP support
  isMultiplayer: boolean("is_multiplayer").notNull().default(false), // PvP battle vs real player
  opponentUserId: varchar("opponent_user_id"), // Real player opponent ID
  opponentScore: integer("opponent_score").default(0), // Opponent's score in PvP
  turnTimeLimit: integer("turn_time_limit").default(120), // Seconds per turn (2 minutes default)
  lastTurnAt: timestamp("last_turn_at"), // Last turn timestamp for timeout tracking
  isPaused: boolean("is_paused").default(false), // Battle paused (life happens!)
  pausedAt: timestamp("paused_at"), // When battle was paused
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
  difficulty: "easy" | "normal" | "hard" | "nightmare" | "god";
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
  // Profile fields
  bio: text("bio"), // User bio/description
  rapStyle: varchar("rap_style"), // User's preferred rap style
  characterCardUrl: varchar("character_card_url"), // URL to generated character card image
  characterCardData: jsonb("character_card_data"), // Character card metadata
  // Arc Blockchain integration
  arcWalletAddress: varchar("arc_wallet_address"), // User's Arc L1 wallet address for USDC rewards
  arcUsdcBalance: decimal("arc_usdc_balance", { precision: 20, scale: 6 }).default("0.000000"), // USDC balance on Arc blockchain
  totalEarnedUSDC: decimal("total_earned_usdc", { precision: 20, scale: 6 }).default("0.000000"), // Total USDC earned from battles/tournaments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for Stripe webhook performance
  index("idx_users_stripe_customer_id").on(table.stripeCustomerId),
  // Index for Arc wallet lookups
  index("idx_users_arc_wallet").on(table.arcWalletAddress),
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
  // Arc Blockchain tournament prizes
  isPrizeTournament: boolean("is_prize_tournament").notNull().default(false), // Whether this tournament has USDC prizes
  prizePool: decimal("prize_pool", { precision: 20, scale: 6 }), // Total USDC prize pool
  firstPlacePrize: decimal("first_place_prize", { precision: 20, scale: 6 }), // 1st place USDC prize
  secondPlacePrize: decimal("second_place_prize", { precision: 20, scale: 6 }), // 2nd place USDC prize
  thirdPlacePrize: decimal("third_place_prize", { precision: 20, scale: 6 }), // 3rd place USDC prize
  rewardTxHashes: jsonb("reward_tx_hashes").$type<Record<string, string>>(), // Map of userId -> Arc tx hash for prizes
  // Multiplayer PvP tournaments
  isMultiplayer: boolean("is_multiplayer").notNull().default(false), // PvP tournament with real players
  maxPlayers: integer("max_players").default(8), // Max players (8 for single elimination)
  registeredPlayers: jsonb("registered_players").$type<string[]>().default([]), // Array of registered user IDs
  matchTimeLimit: integer("match_time_limit").default(300), // Seconds per match (5 minutes default)
  allowAIFillIn: boolean("allow_ai_fill_in").notNull().default(true), // Use AI to fill empty slots
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
    features: ["3 battles per day", "Basic AI opponents", "Standard voices", "Ads supported", "Watch ads for free battles"]
  },
  premium: {
    name: "Premium",
    price: 9.99,
    battlesPerDay: 25,
    features: ["25 battles per day", "Advanced AI opponents", "Premium voices", "Battle analysis", "No ads", "Clone battles unlimited"]
  },
  pro: {
    name: "Pro",
    price: 19.99,
    battlesPerDay: -1, // unlimited
    features: ["Unlimited battles", "All AI opponents", "Custom voices", "Advanced analytics", "Priority support", "Tournament mode", "No ads", "Clone battles unlimited", "Sponsor clone battles"]
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

// Arc Blockchain transaction tracking
export const arcTransactions = pgTable("arc_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  txHash: varchar("tx_hash").notNull().unique(), // Arc blockchain transaction hash
  txType: varchar("tx_type").notNull(), // battle_win, tournament_prize, wager_deposit, wager_payout, voice_command
  amount: decimal("amount", { precision: 20, scale: 6 }).notNull(), // USDC amount
  fromAddress: varchar("from_address").notNull(),
  toAddress: varchar("to_address").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, failed
  blockNumber: integer("block_number"),
  gasUsedUSDC: decimal("gas_used_usdc", { precision: 20, scale: 6 }),
  relatedBattleId: varchar("related_battle_id").references(() => battles.id),
  relatedTournamentId: varchar("related_tournament_id").references(() => tournaments.id),
  memo: text("memo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
}, (table) => [
  index("idx_arc_tx_user").on(table.userId),
  index("idx_arc_tx_hash").on(table.txHash),
  index("idx_arc_tx_status").on(table.status),
]);

export const insertArcTransactionSchema = createInsertSchema(arcTransactions).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
});

export type InsertArcTransaction = z.infer<typeof insertArcTransactionSchema>;
export type ArcTransaction = typeof arcTransactions.$inferSelect;

// Multiplayer matchmaking queue
export const matchmakingQueue = pgTable("matchmaking_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  queueType: varchar("queue_type").notNull(), // "casual", "ranked", "wager", "tournament"
  wagerAmount: decimal("wager_amount", { precision: 20, scale: 6 }), // For wager matches
  skillRating: integer("skill_rating").default(1000), // ELO-style rating for matchmaking
  status: varchar("status").notNull().default("waiting"), // waiting, matched, expired
  matchedWithUserId: varchar("matched_with_user_id"), // Opponent user ID when matched
  battleId: varchar("battle_id").references(() => battles.id), // Created battle ID
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // Queue expires after 5 minutes
  matchedAt: timestamp("matched_at"),
}, (table) => [
  index("idx_matchmaking_status").on(table.status),
  index("idx_matchmaking_queue_type").on(table.queueType),
  index("idx_matchmaking_user").on(table.userId),
]);

export const insertMatchmakingQueueSchema = createInsertSchema(matchmakingQueue).omit({
  id: true,
  joinedAt: true,
  matchedAt: true,
});

export type InsertMatchmakingQueue = z.infer<typeof insertMatchmakingQueueSchema>;
export type MatchmakingQueueEntry = typeof matchmakingQueue.$inferSelect;

// Arc Blockchain monetization configuration
export const MONETIZATION_CONFIG = {
  ARC_REWARDS: {
    BATTLE_WIN_USDC: "0.10", // $0.10 USDC for winning a battle
    TOURNAMENT_1ST: "5.00", // $5.00 USDC for 1st place
    TOURNAMENT_2ND: "2.50", // $2.50 USDC for 2nd place
    TOURNAMENT_3RD: "1.00", // $1.00 USDC for 3rd place
    VOICE_COMMAND_REWARD: "0.01", // $0.01 USDC for using voice command
  },
  WAGER_LIMITS: {
    MIN_WAGER_USDC: "0.50", // Minimum wager: $0.50 USDC
    MAX_WAGER_USDC: "100.00", // Maximum wager: $100 USDC
    PLATFORM_FEE_PERCENT: 5, // 5% platform fee on wagers
  },
  TOURNAMENT_PRIZE_POOLS: {
    SMALL: {
      total: "10.00", // $10 total prize pool
      first: "5.00",
      second: "3.00",
      third: "2.00",
    },
    MEDIUM: {
      total: "50.00", // $50 total prize pool
      first: "25.00",
      second: "15.00",
      third: "10.00",
    },
    LARGE: {
      total: "250.00", // $250 total prize pool
      first: "150.00",
      second: "60.00",
      third: "40.00",
    },
  },
  MATCHMAKING: {
    QUEUE_TIMEOUT_SECONDS: 300, // 5 minutes max wait
    MAX_SKILL_DIFF: 200, // Max ELO difference for matching
    TURN_TIME_LIMIT: 120, // 2 minutes per turn default
    TOURNAMENT_MATCH_LIMIT: 300, // 5 minutes per tournament match
    PAUSE_TIME_LIMIT: 3600, // 1 hour max pause time
  },
} as const;
