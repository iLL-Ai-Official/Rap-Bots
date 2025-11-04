import {
  users,
  battles,
  tournaments,
  tournamentBattles,
  referrals,
  processedWebhookEvents,
  userClones,
  arcTransactions,
  type User,
  type UpsertUser,
  type Battle,
  type InsertBattle,
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
  type ArcTransaction,
  type InsertArcTransaction,
  SUBSCRIPTION_TIERS,
  MONETIZATION_CONFIG,
} from "@shared/schema";
import { getCharacterById } from "@shared/characters";
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
  createOrUpdateUserClone(userId: string): Promise<UserClone>;
  getCloneById(cloneId: string): Promise<UserClone | undefined>;

  // Arc Blockchain operations
  createArcWallet(userId: string, walletAddress: string): Promise<User>;
  getArcWalletAddress(userId: string): Promise<string | null>;
  updateArcBalance(userId: string, newBalance: string): Promise<User>;
  recordArcTransaction(transaction: InsertArcTransaction): Promise<ArcTransaction>;
  getArcTransaction(txHash: string): Promise<ArcTransaction | undefined>;
  getUserArcTransactions(userId: string, limit?: number): Promise<ArcTransaction[]>;
  updateArcTransactionStatus(txHash: string, status: 'pending' | 'confirmed' | 'failed', confirmedAt?: Date): Promise<ArcTransaction>;
  createWagerBattle(userId: string, wagerAmountUSDC: string): Promise<Battle>;
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

        const [battle] = await db
          .insert(battles)
          .values(battleData)
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
          if (character) {
            match.player2 = {
              id: character.id,
              name: character.name,
              type: 'ai',
              avatar: character.avatar,
            };
          }
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

  async createOrUpdateUserClone(userId: string): Promise<UserClone> {
    return withRetry(
      async () => {
        // Get user's battle history to analyze performance
        const userBattles = await this.getUserBattles(userId, 10); // Last 10 battles
        
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

  // Arc Blockchain operations
  async createArcWallet(userId: string, walletAddress: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        arcWalletAddress: walletAddress,
        arcUsdcBalance: "0.000000" 
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`⛓️ Arc wallet created for user ${userId}: ${walletAddress.substring(0, 10)}...`);
    return user;
  }

  async getArcWalletAddress(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);
    return user?.arcWalletAddress || null;
  }

  async updateArcBalance(userId: string, newBalance: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ arcUsdcBalance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async recordArcTransaction(transaction: InsertArcTransaction): Promise<ArcTransaction> {
    const [tx] = await db
      .insert(arcTransactions)
      .values(transaction)
      .returning();
    
    console.log(`⛓️ Recorded Arc transaction: ${tx.txHash.substring(0, 20)}... (${tx.txType})`);
    return tx;
  }

  async getArcTransaction(txHash: string): Promise<ArcTransaction | undefined> {
    const [tx] = await db
      .select()
      .from(arcTransactions)
      .where(eq(arcTransactions.txHash, txHash))
      .limit(1);
    
    return tx;
  }

  async getUserArcTransactions(userId: string, limit: number = 50): Promise<ArcTransaction[]> {
    const transactions = await db
      .select()
      .from(arcTransactions)
      .where(eq(arcTransactions.userId, userId))
      .orderBy(desc(arcTransactions.createdAt))
      .limit(limit);
    
    return transactions;
  }

  async updateArcTransactionStatus(
    txHash: string, 
    status: 'pending' | 'confirmed' | 'failed',
    confirmedAt?: Date
  ): Promise<ArcTransaction> {
    const [tx] = await db
      .update(arcTransactions)
      .set({ 
        status,
        ...(confirmedAt && { confirmedAt })
      })
      .where(eq(arcTransactions.txHash, txHash))
      .returning();
    
    return tx;
  }

  async createWagerBattle(userId: string, wagerAmountUSDC: string): Promise<Battle> {
    return withRetry(
      async () => {
        const user = await this.getUser(userId);
        if (!user) {
          throw new Error("User not found");
        }

        // Get random AI character for the wager battle
        const { getRandomCharacter } = await import("@shared/characters");
        const aiCharacter = getRandomCharacter();

        // Create wager battle with Arc blockchain integration
        const battleData = {
          userId,
          userScore: 0,
          aiScore: 0,
          difficulty: 'normal' as const,
          profanityFilter: false,
          aiCharacterId: aiCharacter.id,
          aiCharacterName: aiCharacter.name,
          aiVoiceId: aiCharacter.voiceId,
          rounds: [],
          status: 'active' as const,
          isWagerBattle: true,
          wagerAmountUSDC,
          isMultiplayer: false,
        };

        const [battle] = await db
          .insert(battles)
          .values(battleData)
          .returning();

        console.log(`💰 Created wager battle: ${battle.id} for $${wagerAmountUSDC} USDC`);
        return battle;
      },
      { maxAttempts: 3 },
      `createWagerBattle for user ${userId}`
    );
  }
}

export const storage = new DatabaseStorage();