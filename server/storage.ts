import {
  users,
  battles,
  battleInvites,
  battleRoundSubmissions,
  tournaments,
  tournamentBattles,
  referrals,
  processedWebhookEvents,
  userClones,
  userWallets,
  transactions,
  miningEvents,
  adImpressions,
  arcWallets,
  arcTransactions,
  voiceCommands,
  userProfilePictures,
  battleRounds, // Import battleRounds
  type User,
  type UpsertUser,
  type Battle,
  type InsertBattle,
  type BattleInvite,
  type InsertBattleInvite,
  type BattleRoundSubmission,
  type InsertBattleRoundSubmission,
  type Tournament,
  type InsertTournament,
  type TournamentBattle,
  type InsertTournamentBattle,
  type Referral,
  type InsertReferral,
  type RoundScores,
  type TournamentBracket,
  type TournamentMatch,
  type TournamentPlayer,
  type ProcessedWebhookEvent,
  type InsertWebhookEvent,
  type UserClone,
  type InsertUserClone,
  type UserWallet,
  type InsertUserWallet,
  type Transaction,
  type InsertTransaction,
  type MiningEvent,
  type InsertMiningEvent,
  type AdImpression,
  type InsertAdImpression,
  type ArcWallet,
  type InsertArcWallet,
  type ArcTransaction,
  type InsertArcTransaction,
  type VoiceCommand,
  type InsertVoiceCommand,
  type UserProfilePicture,
  type InsertUserProfilePicture,
  type BattleRound, // Import BattleRound type
  type InsertBattleRound, // Import InsertBattleRound type
  SUBSCRIPTION_TIERS,
  MONETIZATION_CONFIG,
} from "@shared/schema";
import { db, withRetry } from "./db";
import { eq, and, gte, lt, sql, desc, count, max } from "drizzle-orm";
import NodeCache from 'node-cache';

// Initialize cache with 10 minute TTL and 5 minute check period
const cache = new NodeCache({ stdTTL: 600, checkperiod: 300 });

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Subscription management
  updateUserSubscription(userId: string, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionTier?: string;
    battlesRemaining?: number;
  }): Promise<User>;

  // Battle management with user tracking
  canUserStartBattle(userId: string): Promise<boolean>;
  createBattle(battle: any): Promise<Battle>;
  getBattle(id: string): Promise<Battle | undefined>;
  getUserBattles(userId: string, limit?: number): Promise<Battle[]>;
  updateBattleScore(battleId: string, userScore: number, aiScore: number): Promise<void>;
  completeBattle(battleId: string): Promise<void>;
  updateUserStripeInfo(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User>;
  addUserBattles(userId: string, battleCount: number): Promise<User | null>;

  // Battle round processing
  addBattleRound(battleId: string, round: any): Promise<void>;
  updateBattleState(battleId: string, updates: any): Promise<void>;
  updateBattleRoundVideoGeneration(battleId: number, roundNumber: number, generationId: string): Promise<void>;
  updateBattleRoundVideoUrl(battleId: number, roundNumber: number, videoUrl: string): Promise<void>;
  getBattleRound(battleId: number, roundNumber: number): Promise<BattleRound | undefined>;
  updateBattleRound(battleId: number, roundNumber: number, updates: Partial<InsertBattleRound>): Promise<void>;

  // Battle analytics
  getUserStats(userId: string): Promise<{
    totalBattles: number;
    totalWins: number;
    winRate: number;
    battlesThisMonth: number;
  }>;

  // Tournament operations
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getTournament(id: string): Promise<Tournament | undefined>;
  getUserTournaments(userId: string): Promise<Tournament[]>;
  getActiveTournaments(): Promise<Tournament[]>;
  updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament>;
  advanceTournament(tournamentId: string, matchId: string, winnerId: string): Promise<Tournament>;
  generateTournamentBracket(totalRounds: number, opponents: string[]): TournamentBracket;

  // API Key management
  updateUserAPIKeys(userId: string, keys: { 
    openaiApiKey?: string; 
    groqApiKey?: string; 
    preferredTtsService?: string 
  }): Promise<User>;
  getUserAPIKeysStatus(userId: string): Promise<{
    hasValidOpenAI: boolean;
    hasValidGroq: boolean;
    preferredTtsService: string;
  }>;

  // Webhook idempotency operations
  getProcessedWebhookEvent(eventId: string): Promise<ProcessedWebhookEvent | undefined>;
  recordProcessedWebhookEvent(event: InsertWebhookEvent): Promise<ProcessedWebhookEvent>;

  // User Clone operations
  getUserClone(userId: string): Promise<UserClone | undefined>;
  createOrUpdateUserClone(userId: string, battlesLimit?: number): Promise<UserClone>;
  getCloneById(cloneId: string): Promise<UserClone | undefined>;
  getAllAvailableClones(excludeUserId?: string): Promise<Array<UserClone & { ownerUsername: string }>>;

  // Monetization operations - Wallet
  getUserWallet(userId: string): Promise<UserWallet | undefined>;
  createUserWallet(userId: string): Promise<UserWallet>;
  getOrCreateUserWallet(userId: string): Promise<UserWallet>;
  updateWalletBalance(userId: string, updates: {
    battleCredits?: number;
    tokens?: string;
    cloneAdRevenue?: string;
  }): Promise<UserWallet>;

  // Monetization operations - Transactions
  recordTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;

  // Monetization operations - Mining
  recordMiningEvent(event: InsertMiningEvent): Promise<MiningEvent>;
  getUserMiningEvents(userId: string, limit?: number): Promise<MiningEvent[]>;
  awardMiningTokens(userId: string, activityType: string, battleId?: string): Promise<{ tokens: string; transaction: Transaction }>;

  // Monetization operations - Ad Revenue
  recordAdImpression(impression: InsertAdImpression): Promise<AdImpression>;
  getCloneAdRevenue(cloneOwnerId: string): Promise<{ totalRevenue: string; impressions: number }>;

  // Battle monetization
  deductBattleCredits(userId: string, amount: number): Promise<boolean>;
  awardBattleRewards(userId: string, battleId: string, didWin: boolean): Promise<void>;

  // Arc Blockchain operations (Hackathon feature!)
  getOrCreateArcWallet(userId: string, walletAddress: string): Promise<ArcWallet>;
  getArcWallet(userId: string): Promise<ArcWallet | undefined>;
  updateArcWalletBalance(userId: string, updates: {
    usdcBalance?: string;
    lifetimeEarned?: string;
  }): Promise<ArcWallet>;
  recordArcTransaction(transaction: InsertArcTransaction): Promise<ArcTransaction>;
  getUserArcTransactions(userId: string, limit?: number): Promise<ArcTransaction[]>;
  updateArcTransactionStatus(txId: string, status: string, txHash?: string, blockNumber?: number): Promise<ArcTransaction>;

  // Voice Command operations (Hackathon feature!)
  recordVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand>;
  getUserVoiceCommands(userId: string, limit?: number): Promise<VoiceCommand[]>;
  updateVoiceCommand(commandId: string, updates: {
    status?: string;
    arcTransactionId?: string;
    errorMessage?: string;
    audioUrl?: string;
    executedAt?: Date;
  }): Promise<VoiceCommand>;

  // PvP Battle Invites
  createBattleInvite(invite: InsertBattleInvite): Promise<BattleInvite>;
  getBattleInvite(id: string): Promise<BattleInvite | undefined>;
  getUserBattleInvites(userId: string, type: 'sent' | 'received' | 'all'): Promise<BattleInvite[]>;
  updateBattleInviteStatus(inviteId: string, status: string, battleId?: string): Promise<BattleInvite>;
  expireOldInvites(): Promise<void>;

  // PvP Battle Round Submissions
  createRoundSubmission(submission: InsertBattleRoundSubmission): Promise<BattleRoundSubmission>;
  getRoundSubmissions(battleId: string, roundNumber: number): Promise<BattleRoundSubmission[]>;
  checkBothSubmissionsExist(battleId: string, roundNumber: number): Promise<boolean>;
  processPvPRound(battleId: string, roundNumber: number): Promise<void>;
  updatePvPBattleScores(battleId: string, challengerScore: number, opponentScore: number): Promise<void>;
  completePvPBattle(battleId: string, winnerId: string): Promise<void>;
  forfeitPvPBattle(battleId: string, userId: string): Promise<void>;

  // PvP Battle queries
  getPvPBattle(battleId: string): Promise<Battle | undefined>;
  getUserPvPBattles(userId: string): Promise<Battle[]>;
  getActivePvPBattles(userId: string): Promise<Battle[]>;

  // User Profile Picture operations (Hackathon AI face-swap feature!)
  createProfilePicture(data: InsertUserProfilePicture): Promise<UserProfilePicture>;
  getUserProfilePictures(userId: string): Promise<UserProfilePicture[]>;
  getActiveProfilePicture(userId: string): Promise<UserProfilePicture | undefined>;
  updateProfilePictureStatus(id: string, status: string, generatedImageUrl?: string): Promise<UserProfilePicture>;
  setActiveProfilePicture(userId: string, pictureId: string): Promise<UserProfilePicture>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return withRetry(
      async () => {
        const [user] = await db
          .insert(users)
          .values({
            ...userData,
            // Ensure defaults for new users
            subscriptionTier: userData.subscriptionTier || "free",
            subscriptionStatus: userData.subscriptionStatus || "free",
            battlesRemaining: userData.battlesRemaining !== undefined ? userData.battlesRemaining : 3,
            lastBattleReset: userData.lastBattleReset || new Date(),
            totalBattles: userData.totalBattles || 0,
            totalWins: userData.totalWins || 0,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              // Only update user profile info, preserve subscription data
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              profileImageUrl: userData.profileImageUrl,
              updatedAt: new Date(),
              // Set defaults only if fields are null/undefined
              subscriptionTier: sql`COALESCE(${users.subscriptionTier}, ${userData.subscriptionTier || "free"})`,
              subscriptionStatus: sql`COALESCE(${users.subscriptionStatus}, ${userData.subscriptionStatus || "free"})`,
              battlesRemaining: sql`COALESCE(${users.battlesRemaining}, ${userData.battlesRemaining !== undefined ? userData.battlesRemaining : 3})`,
              lastBattleReset: sql`COALESCE(${users.lastBattleReset}, ${userData.lastBattleReset || new Date()})`,
            },
          })
          .returning();
        return user;
      },
      { maxAttempts: 3 },
      `upsertUser for ${userData.id}`
    );
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  // Subscription management
  async updateUserSubscription(userId: string, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionTier?: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...subscriptionData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Battle management
  async canUserStartBattle(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    // Pro users have unlimited battles - always allow
    if (user.subscriptionTier === "pro") return true;

    // Check if daily battles need reset
    const now = new Date();
    const lastReset = user.lastBattleReset || new Date(0);

    // More accurate daily reset check - reset at midnight of the next day
    const resetTime = new Date(lastReset);
    resetTime.setHours(24, 0, 0, 0); // Next day at midnight

    const needsReset = now.getTime() >= resetTime.getTime();

    if (needsReset) {
      // Reset daily battles
      const tier = SUBSCRIPTION_TIERS[user.subscriptionTier as keyof typeof SUBSCRIPTION_TIERS];
      await db
        .update(users)
        .set({
          battlesRemaining: tier.battlesPerDay,
          lastBattleReset: now,
          updatedAt: now,
        })
        .where(eq(users.id, userId));
      return tier.battlesPerDay > 0;
    }

    return (user.battlesRemaining || 0) > 0;
  }

  async createBattle(battleData: any): Promise<Battle> {
    return withRetry(
      async () => {
        // First ensure user has battles available and decrement
        const user = await this.getUser(battleData.userId);
        if (!user) {
          throw new Error("User not found");
        }

        // Check and reset daily battles if needed
        await this.canUserStartBattle(battleData.userId);

        // Try to deduct credits for paid battle (Arc USDC eligibility)
        let creditsPaid = false;
        const wallet = await this.getOrCreateUserWallet(battleData.userId);
        if (wallet.battleCredits >= MONETIZATION_CONFIG.BATTLE_COST_CREDITS) {
          const deducted = await this.deductBattleCredits(battleData.userId, MONETIZATION_CONFIG.BATTLE_COST_CREDITS);
          if (deducted) {
            creditsPaid = true;
            console.log(`💳 User ${battleData.userId} paid ${MONETIZATION_CONFIG.BATTLE_COST_CREDITS} credits for battle - eligible for Arc USDC rewards`);
          }
        }

        // Decrement user's daily battles (except for Pro users)
        if (user.subscriptionTier !== "pro") {
          const updatedUser = await this.getUser(battleData.userId); // Get fresh user data after potential reset
          if ((updatedUser?.battlesRemaining || 0) <= 0) {
            throw new Error("No battles remaining");
          }

          await db
            .update(users)
            .set({
              battlesRemaining: Math.max(0, (updatedUser?.battlesRemaining || 0) - 1),
              totalBattles: (updatedUser?.totalBattles || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(users.id, battleData.userId));
        } else {
          // Pro users - just increment total battles
          await db
            .update(users)
            .set({
              totalBattles: (user.totalBattles || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(users.id, battleData.userId));
        }

        // Include creditsPaid in battle data for Arc USDC reward eligibility
        const [battle] = await db
          .insert(battles)
          .values({
            ...battleData,
            creditsPaid
          })
          .returning();
        return battle;
      },
      { maxAttempts: 3 },
      `createBattle for user ${battleData.userId}`
    );
  }

  async getBattle(id: string): Promise<Battle | undefined> {
    const [battle] = await db.select().from(battles).where(eq(battles.id, id));
    return battle;
  }

  async getUserBattles(userId: string, limit = 10): Promise<Battle[]> {
    return await db
      .select()
      .from(battles)
      .where(eq(battles.userId, userId))
      .orderBy(battles.createdAt)
      .limit(limit);
  }

  async updateBattleScore(battleId: string, userScore: number, aiScore: number): Promise<void> {
    await db
      .update(battles)
      .set({ userScore, aiScore })
      .where(eq(battles.id, battleId));
  }

  async addUserBattles(userId: string, battleCount: number): Promise<User | null> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedBattles = (user.battlesRemaining || 0) + battleCount;

    const [updatedUser] = await db
      .update(users)
      .set({
        battlesRemaining: updatedBattles,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser || null;
  }

  async updateUserStripeInfo(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async completeBattle(battleId: string): Promise<void> {
    return withRetry(
      async () => {
        const battle = await this.getBattle(battleId);
        if (!battle) return;

        await db
          .update(battles)
          .set({
            status: "completed",
            completedAt: new Date(),
          })
          .where(eq(battles.id, battleId));

        // Update user win count if they won
        if (battle.userScore > battle.aiScore && battle.userId) {
          const user = await this.getUser(battle.userId);
          if (user) {
            await db
              .update(users)
              .set({
                totalWins: (user.totalWins || 0) + 1,
                updatedAt: new Date(),
              })
              .where(eq(users.id, battle.userId));
          }
        }
      },
      { maxAttempts: 3 },
      `completeBattle for battle ${battleId}`
    );
  }

  // Analytics
  async getUserStats(userId: string): Promise<{
    totalBattles: number;
    totalWins: number;
    winRate: number;
    battlesThisMonth: number;
  }> {
    // Cache user stats for 5 minutes
    const cacheKey = `user_stats_${userId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached as any;
    }

    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { totalBattles: 0, totalWins: 0, winRate: 0, battlesThisMonth: 0 };
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Use COUNT query instead of fetching all records to avoid 67MB limit
      const battlesThisMonthCount = await db
        .select({ count: count() })
        .from(battles)
        .where(
          and(
            eq(battles.userId, userId),
            gte(battles.createdAt, monthStart)
          )
        );

      const result = {
        totalBattles: user.totalBattles || 0,
        totalWins: user.totalWins || 0,
        winRate: user.totalBattles ? ((user.totalWins || 0) / user.totalBattles) * 100 : 0,
        battlesThisMonth: battlesThisMonthCount[0]?.count || 0,
      };

      // Cache the result for 5 minutes
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Return fallback stats if query fails
      return { totalBattles: 0, totalWins: 0, winRate: 0, battlesThisMonth: 0 };
    }
  }

  // Battle round processing methods
  async addBattleRound(battleId: string, round: any): Promise<void> {
    return withRetry(
      async () => {
        const battle = await this.getBattle(battleId);
        if (!battle) return;

        // Add round to existing rounds array
        const currentRounds = battle.rounds || [];
        currentRounds.push(round);

        await db
          .update(battles)
          .set({
            rounds: currentRounds,
          })
          .where(eq(battles.id, battleId));
      },
      { maxAttempts: 3 },
      `addBattleRound for battle ${battleId}`
    );
  }

  async updateBattleState(battleId: string, updates: any): Promise<void> {
    // Only update allowed battle fields, skip updatedAt since it's not in schema
    const allowedUpdates: any = {};
    if (updates.status) allowedUpdates.status = updates.status;
    if (updates.userScore !== undefined) allowedUpdates.userScore = updates.userScore;
    if (updates.aiScore !== undefined) allowedUpdates.aiScore = updates.aiScore;
    if (updates.rounds) allowedUpdates.rounds = updates.rounds;

    if (Object.keys(allowedUpdates).length > 0) {
      return withRetry(
        async () => {
          await db
            .update(battles)
            .set(allowedUpdates)
            .where(eq(battles.id, battleId));
        },
        { maxAttempts: 3 },
        `updateBattleState for battle ${battleId}`
      );
    }
  }

  async updateBattleRoundVideoGeneration(battleId: number, roundNumber: number, generationId: string): Promise<void> {
    await db
      .update(battleRounds)
      .set({ 
        videoGenerationId: generationId,
        videoGeneratedAt: new Date()
      })
      .where(
        and(
          eq(battleRounds.battleId, battleId),
          eq(battleRounds.roundNumber, roundNumber)
        )
      );
  }

  async updateBattleRoundVideoUrl(battleId: number, roundNumber: number, videoUrl: string): Promise<void> {
    await db
      .update(battleRounds)
      .set({ videoUrl })
      .where(
        and(
          eq(battleRounds.battleId, battleId),
          eq(battleRounds.roundNumber, roundNumber)
        )
      );
  }

  async getBattleRound(battleId: number, roundNumber: number): Promise<BattleRound | undefined> {
    const [round] = await db
      .select()
      .from(battleRounds)
      .where(
        and(
          eq(battleRounds.battleId, battleId),
          eq(battleRounds.roundNumber, roundNumber)
        )
      )
      .limit(1);
    return round;
  }

  async updateBattleRound(battleId: number, roundNumber: number, updates: Partial<InsertBattleRound>): Promise<void> {
    await db
      .update(battleRounds)
      .set(updates)
      .where(
        and(
          eq(battleRounds.battleId, battleId),
          eq(battleRounds.roundNumber, roundNumber)
        )
      );
  }

  // Tournament operations
  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const { getRandomCharacter } = await import("@shared/characters");
    const numOpponents = Math.pow(2, tournament.totalRounds) - 1;
    const opponents: string[] = [];

    for (let i = 0; i < numOpponents; i++) {
      const character = getRandomCharacter();
      opponents.push(character.id);
    }

    const bracket = this.generateTournamentBracket(tournament.totalRounds, opponents);

    const [newTournament] = await db
      .insert(tournaments)
      .values({
        ...tournament,
        opponents,
        bracket,
      })
      .returning();

    return newTournament;
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament;
  }

  async getUserTournaments(userId: string): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.userId, userId))
      .orderBy(sql`created_at DESC`);
  }

  async getActiveTournaments(): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.status, 'active'))
      .orderBy(sql`created_at DESC`)
      .limit(10);
  }

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament> {
    const [updated] = await db
      .update(tournaments)
      .set(updates)
      .where(eq(tournaments.id, id))
      .returning();

    return updated;
  }

  async advanceTournament(tournamentId: string, matchId: string, winnerId: string): Promise<Tournament> {
    return withRetry(
      async () => {
        const tournament = await this.getTournament(tournamentId);
        if (!tournament) throw new Error('Tournament not found');

        const updatedBracket = { ...tournament.bracket };
        let matchFound = false;

        for (let round of updatedBracket.rounds) {
          for (let match of round.matches) {
            if (match.id === matchId) {
              match.isCompleted = true;
              match.winner = winnerId === match.player1.id ? match.player1 : match.player2;
              matchFound = true;
              break;
            }
          }
          if (matchFound) break;
        }

        const currentRound = updatedBracket.rounds.find(r => r.roundNumber === tournament.currentRound);
        const allMatchesComplete = currentRound?.matches.every(m => m.isCompleted) || false;

        let newCurrentRound = tournament.currentRound;
        let newStatus = tournament.status;

        if (allMatchesComplete) {
          if (tournament.currentRound < tournament.totalRounds) {
            newCurrentRound = tournament.currentRound + 1;
          } else {
            newStatus = 'completed';
          }
        }

        return await this.updateTournament(tournamentId, {
          bracket: updatedBracket,
          currentRound: newCurrentRound,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date() : undefined,
        });
      },
      { maxAttempts: 3 },
      `advanceTournament for tournament ${tournamentId}`
    );
  }

  generateTournamentBracket(totalRounds: number, opponents: string[]): TournamentBracket {
    const { getCharacterById } = require("@shared/characters");
    const bracket: TournamentBracket = { rounds: [] };

    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
      const matchesInRound = Math.pow(2, totalRounds - roundNum);
      const matches: TournamentMatch[] = [];

      for (let i = 0; i < matchesInRound; i++) {
        const match: TournamentMatch = {
          id: `round-${roundNum}-match-${i}`,
          player1: { id: 'user', name: 'You', type: 'user' },
          player2: { id: 'placeholder', name: 'TBD', type: 'ai' },
          isCompleted: false,
        };

        if (roundNum === 1 && i < opponents.length) {
          const character = getCharacterById(opponents[i]);
          match.player2 = {
            id: character.id,
            name: character.name,
            type: 'ai',
            avatar: character.avatar,
          };
        }

        matches.push(match);
      }

      bracket.rounds.push({
        roundNumber: roundNum,
        matches,
      });
    }

    return bracket;
  }

  // API Key management methods
  async updateUserAPIKeys(
    userId: string, 
    keys: { 
      openaiApiKey?: string; 
      groqApiKey?: string; 
      elevenlabsApiKey?: string;
      preferredTtsService?: string 
    }
  ): Promise<User> {
    const updateData: any = { updatedAt: new Date() };

    if (keys.openaiApiKey !== undefined) {
      // In production, you'd encrypt the API key here
      updateData.openaiApiKey = keys.openaiApiKey;
    }

    if (keys.groqApiKey !== undefined) {
      // In production, you'd encrypt the API key here  
      updateData.groqApiKey = keys.groqApiKey;
    }

    if (keys.elevenlabsApiKey !== undefined) {
      // In production, you'd encrypt the API key here  
      updateData.elevenlabsApiKey = keys.elevenlabsApiKey;
    }

    if (keys.preferredTtsService !== undefined) {
      updateData.preferredTtsService = keys.preferredTtsService;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async getUserAPIKeysStatus(userId: string): Promise<{
    hasValidOpenAI: boolean;
    hasValidGroq: boolean;
    hasValidElevenLabs: boolean;
    preferredTtsService: string;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      return {
        hasValidOpenAI: false,
        hasValidGroq: false,
        hasValidElevenLabs: false,
        preferredTtsService: 'elevenlabs'
      };
    }

    return {
      hasValidOpenAI: !!(user.openaiApiKey && user.openaiApiKey.length > 0),
      hasValidGroq: !!(user.groqApiKey && user.groqApiKey.length > 0),
      hasValidElevenLabs: !!(user.elevenlabsApiKey && user.elevenlabsApiKey.length > 0),
      preferredTtsService: user.preferredTtsService || 'elevenlabs'
    };
  }

  // Referral system methods
  async getUserByReferralCode(referralCode: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.referralCode, referralCode))
        .limit(1);

      return user || null;
    } catch (error) {
      console.error('Error finding user by referral code:', error);
      return null;
    }
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db
      .insert(referrals)
      .values(referral)
      .returning();

    return newReferral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  // Webhook idempotency methods
  async getProcessedWebhookEvent(eventId: string): Promise<ProcessedWebhookEvent | undefined> {
    try {
      const [event] = await db
        .select()
        .from(processedWebhookEvents)
        .where(eq(processedWebhookEvents.eventId, eventId))
        .limit(1);

      return event;
    } catch (error) {
      console.error('Error finding processed webhook event:', error);
      throw error;
    }
  }

  async recordProcessedWebhookEvent(event: InsertWebhookEvent): Promise<ProcessedWebhookEvent> {
    return withRetry(
      async () => {
        const [newEvent] = await db
          .insert(processedWebhookEvents)
          .values(event)
          .returning();

        return newEvent;
      },
      { maxAttempts: 3 },
      `recordProcessedWebhookEvent for ${event.eventId}`
    );
  }

  // User Clone operations
  async getUserClone(userId: string): Promise<UserClone | undefined> {
    try {
      const [clone] = await db
        .select()
        .from(userClones)
        .where(and(
          eq(userClones.userId, userId),
          eq(userClones.isActive, true)
        ))
        .limit(1);

      return clone;
    } catch (error) {
      console.error('Error fetching user clone:', error);
      throw error;
    }
  }

  async createOrUpdateUserClone(userId: string, battlesLimit: number = 10): Promise<UserClone> {
    return withRetry(
      async () => {
        // Get user's battle history to analyze performance
        // Support analyzing more battles for better accuracy: 10, 25, 50, or all (9999)
        const userBattles = await this.getUserBattles(userId, battlesLimit);

        if (userBattles.length === 0) {
          // No battles yet - create default clone
          const user = await this.getUser(userId);
          const cloneName = user?.firstName ? `${user.firstName}'s Clone` : "Your Clone";

          const [newClone] = await db
            .insert(userClones)
            .values({
              userId,
              cloneName,
              skillLevel: 50, // Default skill level
              avgRhymeDensity: 50,
              avgFlowQuality: 50,
              avgCreativity: 50,
              battlesAnalyzed: 0,
              style: "balanced",
              voiceId: "Thunder-PlayAI", // Default voice
            })
            .returning();

          return newClone;
        }

        // Calculate average performance metrics from battles
        let totalUserScore = 0;
        let totalRhyme = 0;
        let totalFlow = 0;
        let totalCreativity = 0;
        let roundsCount = 0;

        for (const battle of userBattles) {
          totalUserScore += battle.userScore;

          // Analyze rounds for detailed metrics
          if (battle.rounds && Array.isArray(battle.rounds)) {
            for (const round of battle.rounds) {
              if (round.scores) {
                totalRhyme += round.scores.rhymeDensity || 0;
                totalFlow += round.scores.flowQuality || 0;
                totalCreativity += round.scores.creativity || 0;
                roundsCount++;
              }
            }
          }
        }

        const avgUserScore = Math.round(totalUserScore / userBattles.length);
        const avgRhyme = roundsCount > 0 ? Math.round(totalRhyme / roundsCount) : 50;
        const avgFlow = roundsCount > 0 ? Math.round(totalFlow / roundsCount) : 50;
        const avgCreativity = roundsCount > 0 ? Math.round(totalCreativity / roundsCount) : 50;

        // Determine style based on metrics
        let style = "balanced";
        if (avgRhyme > 70) style = "technical";
        else if (avgFlow > 70) style = "smooth";
        else if (avgCreativity > 70) style = "creative";

        const user = await this.getUser(userId);
        const cloneName = user?.firstName ? `${user.firstName}'s Clone` : "Your Clone";

        // Check if clone exists
        const existingClone = await this.getUserClone(userId);

        if (existingClone) {
          // Update existing clone
          const [updatedClone] = await db
            .update(userClones)
            .set({
              skillLevel: avgUserScore,
              avgRhymeDensity: avgRhyme,
              avgFlowQuality: avgFlow,
              avgCreativity: avgCreativity,
              battlesAnalyzed: userBattles.length,
              style,
              updatedAt: new Date(),
            })
            .where(eq(userClones.id, existingClone.id))
            .returning();

          return updatedClone;
        } else {
          // Create new clone
          const [newClone] = await db
            .insert(userClones)
            .values({
              userId,
              cloneName,
              skillLevel: avgUserScore,
              avgRhymeDensity: avgRhyme,
              avgFlowQuality: avgFlow,
              avgCreativity: avgCreativity,
              battlesAnalyzed: userBattles.length,
              style,
              voiceId: "Thunder-PlayAI", // Default voice
            })
            .returning();

          return newClone;
        }
      },
      { maxAttempts: 3 },
      `createOrUpdateUserClone for ${userId}`
    );
  }

  async getCloneById(cloneId: string): Promise<UserClone | undefined> {
    try {
      const [clone] = await db
        .select()
        .from(userClones)
        .where(eq(userClones.id, cloneId))
        .limit(1);

      return clone;
    } catch (error) {
      console.error('Error fetching clone by ID:', error);
      throw error;
    }
  }

  async getAllAvailableClones(excludeUserId?: string): Promise<Array<UserClone & { ownerUsername: string }>> {
    try {
      const clones = await db
        .select({
          id: userClones.id,
          userId: userClones.userId,
          cloneName: userClones.cloneName,
          skillLevel: userClones.skillLevel,
          avgRhymeDensity: userClones.avgRhymeDensity,
          avgFlowQuality: userClones.avgFlowQuality,
          avgCreativity: userClones.avgCreativity,
          battlesAnalyzed: userClones.battlesAnalyzed,
          style: userClones.style,
          voiceId: userClones.voiceId,
          isActive: userClones.isActive,
          createdAt: userClones.createdAt,
          updatedAt: userClones.updatedAt,
          ownerUsername: sql<string>`COALESCE(${users.username}, ${users.email}, 'Anonymous')`,
        })
        .from(userClones)
        .leftJoin(users, eq(userClones.userId, users.id))
        .where(
          excludeUserId 
            ? and(
                eq(userClones.isActive, true),
                sql`${userClones.userId} != ${excludeUserId}`
              )
            : eq(userClones.isActive, true)
        )
        .orderBy(desc(userClones.skillLevel));

      return clones;
    } catch (error) {
      console.error('Error fetching all available clones:', error);
      throw error;
    }
  }

  // ====================
  // MONETIZATION OPERATIONS
  // ====================

  // Wallet operations
  async getUserWallet(userId: string): Promise<UserWallet | undefined> {
    try {
      const [wallet] = await db
        .select()
        .from(userWallets)
        .where(eq(userWallets.userId, userId))
        .limit(1);

      return wallet;
    } catch (error) {
      console.error('Error fetching user wallet:', error);
      throw error;
    }
  }

  async createUserWallet(userId: string): Promise<UserWallet> {
    return withRetry(
      async () => {
        const [wallet] = await db
          .insert(userWallets)
          .values({ userId })
          .returning();

        return wallet;
      },
      { maxAttempts: 3 },
      `createUserWallet for ${userId}`
    );
  }

  async getOrCreateUserWallet(userId: string): Promise<UserWallet> {
    const existing = await this.getUserWallet(userId);
    if (existing) return existing;
    return this.createUserWallet(userId);
  }

  async updateWalletBalance(userId: string, updates: {
    battleCredits?: number;
    tokens?: string;
    cloneAdRevenue?: string;
  }): Promise<UserWallet> {
    return withRetry(
      async () => {
        const wallet = await this.getOrCreateUserWallet(userId);

        const [updated] = await db
          .update(userWallets)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(userWallets.userId, userId))
          .returning();

        return updated;
      },
      { maxAttempts: 3 },
      `updateWalletBalance for ${userId}`
    );
  }

  // Transaction operations
  async recordTransaction(transaction: InsertTransaction): Promise<Transaction> {
    return withRetry(
      async () => {
        const [record] = await db
          .insert(transactions)
          .values(transaction)
          .returning();

        return record;
      },
      { maxAttempts: 3 },
      `recordTransaction for ${transaction.userId}`
    );
  }

  async getUserTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const records = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt))
        .limit(limit);

      return records;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // Mining operations
  async recordMiningEvent(event: InsertMiningEvent): Promise<MiningEvent> {
    return withRetry(
      async () => {
        const [record] = await db
          .insert(miningEvents)
          .values(event)
          .returning();

        return record;
      },
      { maxAttempts: 3 },
      `recordMiningEvent for ${event.userId}`
    );
  }

  async getUserMiningEvents(userId: string, limit: number = 50): Promise<MiningEvent[]> {
    try {
      const events = await db
        .select()
        .from(miningEvents)
        .where(eq(miningEvents.userId, userId))
        .orderBy(desc(miningEvents.createdAt))
        .limit(limit);

      return events;
    } catch (error) {
      console.error('Error fetching mining events:', error);
      throw error;
    }
  }

  async awardMiningTokens(userId: string, activityType: string, battleId?: string): Promise<{ tokens: string; transaction: Transaction }> {
    return withRetry(
      async () => {
        // Determine token amount based on activity type
        let tokensEarned = "0.00000000";
        switch (activityType) {
          case "battle_complete":
            tokensEarned = MONETIZATION_CONFIG.MINING_REWARDS.BATTLE_COMPLETE;
            break;
          case "battle_win":
            tokensEarned = MONETIZATION_CONFIG.MINING_REWARDS.BATTLE_WIN;
            break;
          case "daily_login":
            tokensEarned = MONETIZATION_CONFIG.MINING_REWARDS.DAILY_LOGIN;
            break;
          case "clone_battled":
            tokensEarned = MONETIZATION_CONFIG.MINING_REWARDS.CLONE_BATTLED;
            break;
          case "referral":
            tokensEarned = MONETIZATION_CONFIG.MINING_REWARDS.REFERRAL;
            break;
        }

        // Record mining event
        await this.recordMiningEvent({
          userId,
          tokensEarned,
          activityType,
          battleId,
        });

        // Update wallet
        const wallet = await this.getOrCreateUserWallet(userId);
        const newTokenBalance = (parseFloat(wallet.tokens) + parseFloat(tokensEarned)).toFixed(8);
        const newLifetimeEarned = (parseFloat(wallet.lifetimeEarned) + parseFloat(tokensEarned)).toFixed(8);

        await this.updateWalletBalance(userId, {
          tokens: newTokenBalance,
        });

        await db
          .update(userWallets)
          .set({ lifetimeEarned: newLifetimeEarned })
          .where(eq(userWallets.userId, userId));

        // Record transaction
        const transaction = await this.recordTransaction({
          userId,
          type: "mining",
          amount: tokensEarned,
          currency: "tokens",
          description: `Mined tokens: ${activityType}`,
          battleId,
        });

        console.log(`💰 User ${userId} mined ${tokensEarned} tokens (${activityType})`);

        return { tokens: tokensEarned, transaction };
      },
      { maxAttempts: 3 },
      `awardMiningTokens for ${userId}`
    );
  }

  // Ad revenue operations
  async recordAdImpression(impression: InsertAdImpression): Promise<AdImpression> {
    return withRetry(
      async () => {
        const [record] = await db
          .insert(adImpressions)
          .values([impression])
          .returning();

        // Update clone owner's wallet
        const cloneOwnerId = impression.cloneOwnerId || "";
        const wallet = await this.getOrCreateUserWallet(cloneOwnerId);
        const revenueShare = impression.revenueShare || "0.00";
        const newAdRevenue = (parseFloat(wallet.cloneAdRevenue) + parseFloat(revenueShare)).toFixed(2);
        const newImpressions = wallet.totalAdImpressions + 1;

        await db
          .update(userWallets)
          .set({
            cloneAdRevenue: newAdRevenue,
            totalAdImpressions: newImpressions,
            updatedAt: new Date(),
          })
          .where(eq(userWallets.userId, cloneOwnerId));

        // Record revenue transaction
        await this.recordTransaction({
          userId: cloneOwnerId,
          type: "ad_revenue",
          amount: revenueShare,
          currency: "usd",
          description: "Ad revenue from clone battle",
          battleId: impression.battleId,
          relatedUserId: impression.viewerId,
        });

        console.log(`📺 Ad revenue: ${cloneOwnerId} earned $${revenueShare} from ad`);

        return record;
      },
      { maxAttempts: 3 },
      `recordAdImpression for battle ${impression.battleId || "unknown"}`
    );
  }

  async getCloneAdRevenue(cloneOwnerId: string): Promise<{ totalRevenue: string; impressions: number }> {
    try {
      const wallet = await this.getOrCreateUserWallet(cloneOwnerId);

      return {
        totalRevenue: wallet.cloneAdRevenue,
        impressions: wallet.totalAdImpressions,
      };
    } catch (error) {
      console.error('Error fetching clone ad revenue:', error);
      throw error;
    }
  }

  // Battle monetization
  async deductBattleCredits(userId: string, amount: number): Promise<boolean> {
    return withRetry(
      async () => {
        const wallet = await this.getOrCreateUserWallet(userId);

        if (wallet.battleCredits < amount) {
          console.log(`❌ User ${userId} has insufficient credits: ${wallet.battleCredits} < ${amount}`);
          return false;
        }

        const newBalance = wallet.battleCredits - amount;
        await this.updateWalletBalance(userId, { battleCredits: newBalance });

        // Record transaction
        await this.recordTransaction({
          userId,
          type: "battle_cost",
          amount: amount.toString(),
          currency: "credits",
          description: `Spent credits to start battle`,
        });

        console.log(`💳 User ${userId} spent ${amount} credits, new balance: ${newBalance}`);

        return true;
      },
      { maxAttempts: 3 },
      `deductBattleCredits for ${userId}`
    );
  }

  async awardBattleRewards(userId: string, battleId: string, didWin: boolean): Promise<void> {
    return withRetry(
      async () => {
        const wallet = await this.getOrCreateUserWallet(userId);

        // Award completion tokens
        await this.awardMiningTokens(userId, "battle_complete", battleId);

        if (didWin) {
          // Award win bonus tokens
          await this.awardMiningTokens(userId, "battle_win", battleId);

          // Award credits for winning
          const creditsEarned = MONETIZATION_CONFIG.CREDIT_REWARDS.BATTLE_WIN;
          const newBalance = wallet.battleCredits + creditsEarned;

          await this.updateWalletBalance(userId, { battleCredits: newBalance });

          await this.recordTransaction({
            userId,
            type: "battle_win",
            amount: creditsEarned.toString(),
            currency: "credits",
            description: `Won battle reward`,
            battleId,
          });

          console.log(`🏆 User ${userId} won battle! Earned ${creditsEarned} credits`);
        }
      },
      { maxAttempts: 3 },
      `awardBattleRewards for ${userId}`
    );
  }

  // Arc Blockchain operations (Hackathon feature!)
  async getOrCreateArcWallet(userId: string, walletAddress: string): Promise<ArcWallet> {
    return withRetry(
      async () => {
        const existing = await this.getArcWallet(userId);
        if (existing) return existing;

        const [wallet] = await db
          .insert(arcWallets)
          .values({
            userId,
            walletAddress,
          })
          .returning();

        console.log(`⛓️ Created Arc wallet for user ${userId}: ${walletAddress}`);
        return wallet;
      },
      { maxAttempts: 3 },
      `getOrCreateArcWallet for ${userId}`
    );
  }

  async getArcWallet(userId: string): Promise<ArcWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(arcWallets)
      .where(eq(arcWallets.userId, userId));
    return wallet;
  }

  async updateArcWalletBalance(userId: string, updates: {
    usdcBalance?: string;
    lifetimeEarned?: string;
  }): Promise<ArcWallet> {
    return withRetry(
      async () => {
        // First, check if wallet exists
        const existing = await this.getArcWallet(userId);

        if (!existing) {
          throw new Error(`Arc wallet not found for user ${userId}. Create wallet first using getOrCreateArcWallet.`);
        }

        const [wallet] = await db
          .update(arcWallets)
          .set({
            ...updates,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(arcWallets.userId, userId))
          .returning();

        if (!wallet) {
          throw new Error(`Failed to update Arc wallet for user ${userId}`);
        }

        console.log(`⛓️ Updated Arc wallet for ${userId}: USDC=${updates.usdcBalance || 'unchanged'}`);
        return wallet;
      },
      { maxAttempts: 3 },
      `updateArcWalletBalance for ${userId}`
    );
  }

  async recordArcTransaction(transaction: InsertArcTransaction): Promise<ArcTransaction> {
    return withRetry(
      async () => {
        const [tx] = await db
          .insert(arcTransactions)
          .values(transaction)
          .returning();

        console.log(`⛓️ Recorded Arc transaction: ${tx.type} ${tx.amount} USDC for user ${tx.userId}`);
        return tx;
      },
      { maxAttempts: 3 },
      `recordArcTransaction`
    );
  }

  async getUserArcTransactions(userId: string, limit: number = 20): Promise<ArcTransaction[]> {
    const txs = await db
      .select()
      .from(arcTransactions)
      .where(eq(arcTransactions.userId, userId))
      .orderBy(desc(arcTransactions.createdAt))
      .limit(limit);

    return txs;
  }

  async updateArcTransactionStatus(
    txId: string, 
    status: string, 
    txHash?: string, 
    blockNumber?: number
  ): Promise<ArcTransaction> {
    return withRetry(
      async () => {
        const [tx] = await db
          .update(arcTransactions)
          .set({
            status,
            txHash,
            blockNumber,
            confirmedAt: status === 'confirmed' ? new Date() : undefined,
          })
          .where(eq(arcTransactions.id, txId))
          .returning();

        console.log(`⛓️ Updated Arc transaction ${txId}: ${status}`);
        return tx;
      },
      { maxAttempts: 3 },
      `updateArcTransactionStatus for ${txId}`
    );
  }

  // Voice Command operations (Hackathon feature!)
  async recordVoiceCommand(command: InsertVoiceCommand): Promise<VoiceCommand> {
    return withRetry(
      async () => {
        const [cmd] = await db
          .insert(voiceCommands)
          .values(command)
          .returning();

        console.log(`🎤 Recorded voice command: "${cmd.commandText}" with intent ${cmd.intent}`);
        return cmd;
      },
      { maxAttempts: 3 },
      `recordVoiceCommand`
    );
  }

  async getUserVoiceCommands(userId: string, limit: number = 20): Promise<VoiceCommand[]> {
    const commands = await db
      .select()
      .from(voiceCommands)
      .where(eq(voiceCommands.userId, userId))
      .orderBy(desc(voiceCommands.createdAt))
      .limit(limit);

    return commands;
  }

  async updateVoiceCommand(commandId: string, updates: {
    status?: string;
    arcTransactionId?: string;
    errorMessage?: string;
    audioUrl?: string;
    executedAt?: Date;
  }): Promise<VoiceCommand> {
    return withRetry(
      async () => {
        const [cmd] = await db
          .update(voiceCommands)
          .set(updates)
          .where(eq(voiceCommands.id, commandId))
          .returning();

        console.log(`🎤 Updated voice command ${commandId}: ${updates.status || 'updated'}`);
        return cmd;
      },
      { maxAttempts: 3 },
      `updateVoiceCommand for ${commandId}`
    );
  }

  // ===========================
  // PvP Battle Invite operations
  // ===========================

  async createBattleInvite(invite: InsertBattleInvite): Promise<BattleInvite> {
    return withRetry(
      async () => {
        const [created] = await db
          .insert(battleInvites)
          .values(invite)
          .returning();

        console.log(`⚔️ Created PvP battle invite from ${invite.challengerId} to ${invite.opponentId}`);
        return created;
      },
      { maxAttempts: 3 },
      `createBattleInvite`
    );
  }

  async getBattleInvite(id: string): Promise<BattleInvite | undefined> {
    const [invite] = await db
      .select()
      .from(battleInvites)
      .where(eq(battleInvites.id, id));
    return invite;
  }

  async getUserBattleInvites(userId: string, type: 'sent' | 'received' | 'all'): Promise<BattleInvite[]> {
    let query = db.select().from(battleInvites);

    if (type === 'sent') {
      query = query.where(eq(battleInvites.challengerId, userId));
    } else if (type === 'received') {
      query = query.where(eq(battleInvites.opponentId, userId));
    } else {
      query = query.where(
        sql`${battleInvites.challengerId} = ${userId} OR ${battleInvites.opponentId} = ${userId}`
      );
    }

    const invites = await query
      .orderBy(desc(battleInvites.createdAt))
      .limit(50);

    return invites;
  }

  async updateBattleInviteStatus(inviteId: string, status: string, battleId?: string): Promise<BattleInvite> {
    return withRetry(
      async () => {
        const [updated] = await db
          .update(battleInvites)
          .set({
            status,
            battleId,
            updatedAt: new Date(),
          })
          .where(eq(battleInvites.id, inviteId))
          .returning();

        console.log(`⚔️ Updated battle invite ${inviteId}: ${status}`);
        return updated;
      },
      { maxAttempts: 3 },
      `updateBattleInviteStatus`
    );
  }

  async expireOldInvites(): Promise<void> {
    await db
      .update(battleInvites)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(
        and(
          eq(battleInvites.status, 'pending'),
          lt(battleInvites.expiresAt, new Date())
        )
      );

    console.log(`⚔️ Expired old pending battle invites`);
  }

  // ===========================
  // PvP Round Submission operations
  // ===========================

  async createRoundSubmission(submission: InsertBattleRoundSubmission): Promise<BattleRoundSubmission> {
    return withRetry(
      async () => {
        const [created] = await db
          .insert(battleRoundSubmissions)
          .values(submission)
          .returning();

        console.log(`⚔️ Created round submission: Battle ${submission.battleId}, Round ${submission.roundNumber}, User ${submission.userId}`);
        return created;
      },
      { maxAttempts: 3 },
      `createRoundSubmission`
    );
  }

  async getRoundSubmissions(battleId: string, roundNumber: number): Promise<BattleRoundSubmission[]> {
    const submissions = await db
      .select()
      .from(battleRoundSubmissions)
      .where(
        and(
          eq(battleRoundSubmissions.battleId, battleId),
          eq(battleRoundSubmissions.roundNumber, roundNumber)
        )
      );

    return submissions;
  }

  async checkBothSubmissionsExist(battleId: string, roundNumber: number): Promise<boolean> {
    const submissions = await this.getRoundSubmissions(battleId, roundNumber);
    return submissions.length === 2;
  }

  async processPvPRound(battleId: string, roundNumber: number): Promise<void> {
    return withRetry(
      async () => {
        const submissions = await this.getRoundSubmissions(battleId, roundNumber);

        if (submissions.length !== 2) {
          throw new Error(`Cannot process round: Expected 2 submissions, got ${submissions.length}`);
        }

        // Get battle to determine roles
        const battle = await this.getBattle(battleId);
        if (!battle) {
          throw new Error(`Battle ${battleId} not found`);
        }

        // Calculate cumulative scores
        const challengerSubmission = submissions.find(s => s.userId === battle.challengerUserId);
        const opponentSubmission = submissions.find(s => s.userId === battle.opponentUserId);

        if (!challengerSubmission || !opponentSubmission) {
          throw new Error('Could not find submissions for both players');
        }

        const challengerRoundScore = challengerSubmission.scores?.totalScore || 0;
        const opponentRoundScore = opponentSubmission.scores?.totalScore || 0;

        // Update cumulative battle scores
        const newChallengerScore = (battle.challengerScore || 0) + challengerRoundScore;
        const newOpponentScore = (battle.opponentScore || 0) + opponentRoundScore;

        await this.updatePvPBattleScores(battleId, newChallengerScore, newOpponentScore);

        // Check if battle is complete
        if (roundNumber >= (battle.maxRounds || 5)) {
          const winnerId = newChallengerScore > newOpponentScore 
            ? battle.challengerUserId 
            : newOpponentScore > newChallengerScore 
              ? battle.opponentUserId 
              : null; // tie

          if (winnerId) {
            await this.completePvPBattle(battleId, winnerId);
          } else {
            // Handle tie - mark as completed without winner
            await db
              .update(battles)
              .set({
                status: 'completed',
                completedAt: new Date(),
              })
              .where(eq(battles.id, battleId));
          }
        }

        console.log(`⚔️ Processed PvP round ${roundNumber} for battle ${battleId}`);
      },
      { maxAttempts: 3 },
      `processPvPRound`
    );
  }

  async updatePvPBattleScores(battleId: string, challengerScore: number, opponentScore: number): Promise<void> {
    await db
      .update(battles)
      .set({
        challengerScore,
        opponentScore,
      })
      .where(eq(battles.id, battleId));

    console.log(`⚔️ Updated PvP battle scores: Challenger ${challengerScore}, Opponent ${opponentScore}`);
  }

  async completePvPBattle(battleId: string, winnerId: string): Promise<void> {
    return withRetry(
      async () => {
        await db
          .update(battles)
          .set({
            status: 'completed',
            winnerUserId: winnerId,
            completedAt: new Date(),
          })
          .where(eq(battles.id, battleId));

        console.log(`⚔️ Completed PvP battle ${battleId}, winner: ${winnerId}`);
      },
      { maxAttempts: 3 },
      `completePvPBattle`
    );
  }

  async forfeitPvPBattle(battleId: string, userId: string): Promise<void> {
    return withRetry(
      async () => {
        const battle = await this.getBattle(battleId);
        if (!battle) {
          throw new Error(`Battle ${battleId} not found`);
        }

        // Determine winner (the other player)
        const winnerId = battle.challengerUserId === userId 
          ? battle.opponentUserId 
          : battle.challengerUserId;

        await db
          .update(battles)
          .set({
            status: 'completed',
            winnerUserId: winnerId,
            completedAt: new Date(),
          })
          .where(eq(battles.id, battleId));

        console.log(`⚔️ User ${userId} forfeited battle ${battleId}, winner: ${winnerId}`);
      },
      { maxAttempts: 3 },
      `forfeitPvPBattle`
    );
  }

  // ===========================
  // PvP Battle queries
  // ===========================

  async getPvPBattle(battleId: string): Promise<Battle | undefined> {
    const [battle] = await db
      .select()
      .from(battles)
      .where(
        and(
          eq(battles.id, battleId),
          eq(battles.mode, 'pvp')
        )
      );

    return battle;
  }

  async getUserPvPBattles(userId: string): Promise<Battle[]> {
    const pvpBattles = await db
      .select()
      .from(battles)
      .where(
        and(
          eq(battles.mode, 'pvp'),
          sql`(${battles.challengerUserId} = ${userId} OR ${battles.opponentUserId} = ${userId})`
        )
      )
      .orderBy(desc(battles.createdAt))
      .limit(50);

    return pvpBattles;
  }

  async getActivePvPBattles(userId: string): Promise<Battle[]> {
    const activeBattles = await db
      .select()
      .from(battles)
      .where(
        and(
          eq(battles.mode, 'pvp'),
          eq(battles.status, 'active'),
          sql`(${battles.challengerUserId} = ${userId} OR ${battles.opponentUserId} = ${userId})`
        )
      )
      .orderBy(desc(battles.createdAt));

    return activeBattles;
  }

  // User Profile Picture operations (Hackathon AI face-swap feature!)
  async createProfilePicture(data: InsertUserProfilePicture): Promise<UserProfilePicture> {
    const [picture] = await db
      .insert(userProfilePictures)
      .values(data)
      .returning();

    return picture;
  }

  async getUserProfilePictures(userId: string): Promise<UserProfilePicture[]> {
    const pictures = await db
      .select()
      .from(userProfilePictures)
      .where(eq(userProfilePictures.userId, userId))
      .orderBy(desc(userProfilePictures.createdAt));

    return pictures;
  }

  async getActiveProfilePicture(userId: string): Promise<UserProfilePicture | undefined> {
    const [picture] = await db
      .select()
      .from(userProfilePictures)
      .where(
        and(
          eq(userProfilePictures.userId, userId),
          eq(userProfilePictures.isActive, true)
        )
      );

    return picture;
  }

  async updateProfilePictureStatus(id: string, status: string, generatedImageUrl?: string): Promise<UserProfilePicture> {
    const updateData: any = { status, updatedAt: new Date() };
    if (generatedImageUrl) {
      updateData.generatedImageUrl = generatedImageUrl;
    }

    const [picture] = await db
      .update(userProfilePictures)
      .set(updateData)
      .where(eq(userProfilePictures.id, id))
      .returning();

    return picture;
  }

  async setActiveProfilePicture(userId: string, pictureId: string): Promise<UserProfilePicture> {
    // Deactivate all other profile pictures for this user
    await db
      .update(userProfilePictures)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(userProfilePictures.userId, userId));

    // Activate the selected picture
    const [picture] = await db
      .update(userProfilePictures)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(userProfilePictures.id, pictureId))
      .returning();

    // Update user's profileImageUrl
    if (picture.generatedImageUrl) {
      await this.updateUser(userId, { profileImageUrl: picture.generatedImageUrl });
    }

    return picture;
  }
  }

export const storage = new DatabaseStorage();