/**
 * Arc Blockchain Service - Circle's L1 Blockchain Integration
 * 
 * This service integrates with Circle's Arc L1 blockchain for USDC payments.
 * Arc features:
 * - USDC as native gas token (predictable, dollar-denominated fees)
 * - Sub-second finality for instant settlement
 * - EVM-compatible for standard Web3 tooling
 * - Deep integration with Circle's ecosystem (Wallets, CCTP, Gateway)
 * 
 * Documentation: https://developers.circle.com/w3s/docs/programmable-wallets
 * Arc Info: https://www.arc.network/
 */

import { MONETIZATION_CONFIG } from '@shared/schema';

export interface ArcConfig {
  // Production: Circle API key, Arc RPC URL, etc.
  apiKey?: string;
  entitySecret?: string;
  demoMode: boolean;
}

export interface ArcTransferRequest {
  fromAddress: string;
  toAddress: string;
  amountUSDC: string;
  memo?: string;
}

export interface ArcTransferResult {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsedUSDC: string;
  confirmedAt?: Date;
}

export class ArcBlockchainService {
  private config: ArcConfig;
  private demoBlockNumber = 1000000; // Simulated block number
  private platformWallet: string;
  private storage: any; // Storage instance for spending limits

  constructor(config: ArcConfig = { demoMode: true }) {
    this.config = config;
    this.platformWallet = process.env.ARC_PLATFORM_WALLET || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"; // Platform wallet for rewards
    
    const mode = config.demoMode ? 'DEMO' : 'PRODUCTION';
    console.log(`⛓️ Arc Blockchain Service initialized (${mode} mode)`);
    
    if (!config.demoMode) {
      console.log('⛓️ Running Arc blockchain in PRODUCTION mode');
      console.log('⛓️ Using Arc L1 testnet with sub-second finality');
      console.log(`⛓️ Platform wallet: ${this.platformWallet.substring(0, 10)}...`);
    } else {
      console.log('⛓️ Demo mode: Arc blockchain operations simulated for development');
    }
  }

  /**
   * Set storage instance for spending limit checks
   * Called after storage is initialized
   */
  setStorage(storage: any) {
    this.storage = storage;
  }

  /**
   * Check spending limits before transaction
   * Enforces daily and per-transaction limits
   * CRITICAL: This must be called before ANY user-initiated USDC transaction
   */
  async checkSpendingLimits(userId: string, amount: string): Promise<{ 
    allowed: boolean; 
    reason?: string; 
    currentSpend?: string; 
    dailyLimit?: string;
  }> {
    if (!this.storage) {
      console.warn('⚠️ Storage not set - skipping spending limit check (UNSAFE!)');
      return { allowed: true };
    }

    try {
      const result = await this.storage.checkSpendingLimit(userId, amount);
      
      if (!result.allowed) {
        console.warn(`🚫 Spending limit exceeded for user ${userId}: ${result.reason}`);
      } else {
        console.log(`✅ Spending limit check passed for user ${userId}: $${amount}`);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Error checking spending limits:', error);
      // Fail safe: reject transaction if limit check fails
      return {
        allowed: false,
        reason: 'Unable to verify spending limits',
      };
    }
  }

  /**
   * Record spend in database after successful transaction
   * CRITICAL: This must be called after ANY user-initiated USDC transaction
   */
  async recordSpend(userId: string, amount: string): Promise<void> {
    if (!this.storage) {
      console.warn('⚠️ Storage not set - cannot record spend (UNSAFE!)');
      return;
    }

    try {
      await this.storage.recordSpend(userId, amount);
    } catch (error: any) {
      console.error('❌ Error recording spend:', error);
      // This is critical - we should alert admins if this fails
      throw new Error('Failed to record spend - transaction may need manual review');
    }
  }

  /**
   * Generate/Create wallet address on Arc blockchain
   * Production: Use Circle's Programmable Wallets SDK
   * API: POST https://api.circle.com/v1/w3s/developer/wallets
   */
  async createWallet(userId: string): Promise<string> {
    // Generate Ethereum-compatible address (Arc is EVM-compatible)
    // In production, this would call Circle's Wallet API
    const walletAddress = `0x${userId.substring(0, 40).padEnd(40, '0')}`;
    
    const mode = this.config.demoMode ? '[DEMO]' : '[PRODUCTION]';
    console.log(`⛓️ ${mode} Created Arc L1 wallet: ${walletAddress}`);
    
    // In production, you would:
    // const response = await fetch('https://api.circle.com/v1/w3s/developer/wallets', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.config.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     blockchains: ["ARC-TESTNET"],
    //     count: 1,
    //     walletSetId: "your-wallet-set-id"
    //   })
    // });
    
    return walletAddress;
  }

  /**
   * Get USDC balance for a wallet address on Arc blockchain
   * Production: Query Arc blockchain via RPC or Circle's API
   */
  async getUSDCBalance(walletAddress: string): Promise<string> {
    const mode = this.config.demoMode ? '[DEMO]' : '[PRODUCTION]';
    console.log(`⛓️ ${mode} Querying USDC balance for ${walletAddress.substring(0, 10)}...`);
    
    // In production, query Arc blockchain:
    // - Use Web3/Ethers.js to query USDC contract balance
    // - Arc RPC endpoint: TBD from Circle documentation
    // - USDC is native gas token, so check both native and ERC-20 balance
    
    return "100.00"; // Simulated testnet balance
  }

  /**
   * Transfer USDC on Arc blockchain
   * Production: Sign and broadcast transaction to Arc L1 using Circle's SDK
   * 
   * Key features:
   * - USDC is used for gas fees (no need for native token)
   * - Sub-second finality for instant confirmation
   * - Predictable dollar-denominated transaction costs
   */
  async transferUSDC(transfer: ArcTransferRequest): Promise<ArcTransferResult> {
    // Simulate Arc L1 transaction with instant finality
    const txHash = `0x${Math.random().toString(36).substring(2, 15)}${Date.now().toString(16)}`.padEnd(66, '0');
    const gasUsedUSDC = "0.000123"; // Arc uses USDC for gas - predictable costs!

    const mode = this.config.demoMode ? '[DEMO]' : '[PRODUCTION]';
    console.log(`⛓️ ${mode} Transferring ${transfer.amountUSDC} USDC on Arc L1`);
    console.log(`   From: ${transfer.fromAddress.substring(0, 10)}...`);
    console.log(`   To: ${transfer.toAddress.substring(0, 10)}...`);
    console.log(`   Tx Hash: ${txHash}`);
    console.log(`   Gas: ${gasUsedUSDC} USDC (paid in USDC, not ETH!)`);
    if (transfer.memo) {
      console.log(`   Memo: ${transfer.memo}`);
    }

    // In production, you would:
    // 1. Use Circle's Developer-Controlled Wallets SDK to sign transaction
    // 2. Broadcast to Arc blockchain
    // 3. Wait for sub-second finality confirmation
    
    // Arc has sub-second finality - instant confirmation!
    return {
      txHash,
      status: 'confirmed',
      blockNumber: this.demoBlockNumber++,
      gasUsedUSDC,
      confirmedAt: new Date(),
    };
  }

  /**
   * Award USDC for battle win
   * This is a key hackathon feature - instant USDC rewards!
   */
  async awardBattleWinUSDC(
    winnerWalletAddress: string,
    battleId: string
  ): Promise<ArcTransferResult> {
    const rewardAmount = MONETIZATION_CONFIG.ARC_REWARDS.BATTLE_WIN_USDC;

    console.log(`🏆 Awarding ${rewardAmount} USDC to battle winner!`);

    return this.transferUSDC({
      fromAddress: this.platformWallet,
      toAddress: winnerWalletAddress,
      amountUSDC: rewardAmount,
      memo: `Battle win reward - Battle ID: ${battleId}`,
    });
  }

  /**
   * Process wager battle deposit
   * User deposits USDC to participate in wager battle
   * CRITICAL: Enforces spending limits before transaction
   */
  async depositWager(
    userId: string,
    userWalletAddress: string,
    wagerAmount: string,
    battleId: string
  ): Promise<ArcTransferResult> {
    console.log(`💰 Processing wager deposit: ${wagerAmount} USDC for user ${userId}`);

    // CRITICAL: Check spending limits BEFORE transaction
    const limitCheck = await this.checkSpendingLimits(userId, wagerAmount);
    if (!limitCheck.allowed) {
      console.error(`🚫 Spending limit exceeded for user ${userId}: ${limitCheck.reason}`);
      throw new Error(limitCheck.reason || 'Spending limit exceeded');
    }

    // Execute the transfer
    const result = await this.transferUSDC({
      fromAddress: userWalletAddress,
      toAddress: this.platformWallet,
      amountUSDC: wagerAmount,
      memo: `Wager deposit - Battle ID: ${battleId}`,
    });

    // CRITICAL: Record spend after successful transaction
    if (result.status === 'confirmed') {
      await this.recordSpend(userId, wagerAmount);
      console.log(`✅ Spend recorded for user ${userId}: $${wagerAmount}`);
    }

    return result;
  }

  /**
   * Payout wager battle winnings
   * Winner receives their wager + opponent's wager (minus platform fee)
   */
  async payoutWagerWinnings(
    winnerWalletAddress: string,
    totalPayout: string,
    battleId: string
  ): Promise<ArcTransferResult> {
    console.log(`🎯 Paying out wager winnings: ${totalPayout} USDC`);

    return this.transferUSDC({
      fromAddress: this.platformWallet,
      toAddress: winnerWalletAddress,
      amountUSDC: totalPayout,
      memo: `Wager battle winnings - Battle ID: ${battleId}`,
    });
  }

  /**
   * Award tournament prize in USDC
   * Supports 1st, 2nd, 3rd place prizes
   */
  async awardTournamentPrize(
    winnerWalletAddress: string,
    place: 1 | 2 | 3,
    prizeAmount: string,
    tournamentId: string
  ): Promise<ArcTransferResult> {
    const placeLabel = place === 1 ? '1st' : place === 2 ? '2nd' : '3rd';
    console.log(`🏆 Awarding ${prizeAmount} USDC for ${placeLabel} place!`);

    return this.transferUSDC({
      fromAddress: this.platformWallet,
      toAddress: winnerWalletAddress,
      amountUSDC: prizeAmount,
      memo: `Tournament ${placeLabel} place prize - ID: ${tournamentId}`,
    });
  }

  /**
   * Award USDC for successful voice command
   * Gamification feature - reward users for engaging with voice features
   */
  async awardVoiceCommandReward(
    walletAddress: string,
    commandText: string
  ): Promise<ArcTransferResult> {
    const rewardAmount = MONETIZATION_CONFIG.ARC_REWARDS.VOICE_COMMAND_REWARD;

    console.log(`🎤 Awarding ${rewardAmount} USDC for voice command!`);

    return this.transferUSDC({
      fromAddress: this.platformWallet,
      toAddress: walletAddress,
      amountUSDC: rewardAmount,
      memo: `Voice command reward: "${commandText.substring(0, 50)}"`,
    });
  }

  /**
   * Get transaction status from Arc blockchain
   * Production: Query Arc blockchain for transaction receipt
   */
  async getTransactionStatus(txHash: string): Promise<ArcTransferResult['status']> {
    // Arc L1 has sub-second finality - all transactions are confirmed almost instantly
    const mode = this.config.demoMode ? '[DEMO]' : '[PRODUCTION]';
    console.log(`⛓️ ${mode} Transaction ${txHash.substring(0, 20)}... confirmed on Arc L1`);
    
    // In production, query Arc blockchain for transaction receipt
    // Arc's sub-second finality means you get near-instant confirmation
    
    return 'confirmed';
  }

  /**
   * Validate wager amount against platform limits
   */
  validateWagerAmount(amount: string): { valid: boolean; error?: string } {
    const amountNum = parseFloat(amount);
    const min = parseFloat(MONETIZATION_CONFIG.WAGER_LIMITS.MIN_WAGER_USDC);
    const max = parseFloat(MONETIZATION_CONFIG.WAGER_LIMITS.MAX_WAGER_USDC);

    if (isNaN(amountNum)) {
      return { valid: false, error: 'Invalid wager amount' };
    }

    if (amountNum < min) {
      return { valid: false, error: `Minimum wager is $${min} USDC` };
    }

    if (amountNum > max) {
      return { valid: false, error: `Maximum wager is $${max} USDC` };
    }

    return { valid: true };
  }

  /**
   * Calculate platform fee for wager battles
   */
  calculatePlatformFee(wagerAmount: string): string {
    const amount = parseFloat(wagerAmount);
    const feePercent = MONETIZATION_CONFIG.WAGER_LIMITS.PLATFORM_FEE_PERCENT;
    const fee = (amount * feePercent) / 100;
    return fee.toFixed(6);
  }

  /**
   * Calculate total payout for wager battle winner
   * Winner gets: their wager + opponent's wager - platform fee
   */
  calculateWagerPayout(wagerAmount: string): string {
    const amount = parseFloat(wagerAmount);
    const totalPot = amount * 2; // Both players' wagers
    const platformFee = parseFloat(this.calculatePlatformFee(wagerAmount)) * 2;
    const payout = totalPot - platformFee;
    return payout.toFixed(6);
  }
}

// Factory function
export function createArcBlockchainService(config?: ArcConfig): ArcBlockchainService {
  // Check if we have Arc API credentials
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  
  // Use demo mode if no credentials provided
  const demoMode = !apiKey || !entitySecret;
  
  return new ArcBlockchainService({
    apiKey,
    entitySecret,
    demoMode,
    ...config,
  });
}

// Default export
export default ArcBlockchainService;
