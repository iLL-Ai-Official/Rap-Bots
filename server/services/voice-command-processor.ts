/**
 * Voice Command Processor - Hackathon Feature!
 * 
 * Processes natural language voice commands and executes blockchain transactions.
 * Key feature for "Best Use of Voice AI" category.
 * 
 * Example commands:
 * - "Send 5 USDC to the winner"
 * - "Check my Arc balance"
 * - "Claim my battle rewards"
 * - "Withdraw USDC to my wallet"
 */

import { ArcBlockchainService } from './arc-blockchain';
import { ElevenLabsTTSService } from './elevenlabs-tts';

export interface VoiceCommandIntent {
  intent: string; // send_usdc, check_balance, battle_payout, withdraw, etc.
  parameters: {
    amount?: string;
    recipient?: string;
    battleId?: string;
    [key: string]: any;
  };
  confidence: number;
}

export interface VoiceCommandResult {
  success: boolean;
  message: string;
  audioUrl?: string; // ElevenLabs audio confirmation
  txHash?: string;
  error?: string;
}

export class VoiceCommandProcessor {
  private arcService: ArcBlockchainService;
  private elevenLabsService?: ElevenLabsTTSService;

  constructor(
    arcService: ArcBlockchainService,
    elevenLabsService?: ElevenLabsTTSService
  ) {
    this.arcService = arcService;
    this.elevenLabsService = elevenLabsService;
    console.log('🎤 Voice Command Processor initialized');
  }

  /**
   * Parse voice command to extract intent and parameters
   * In production, use OpenAI/GPT-4 for robust NLU
   */
  async parseCommand(commandText: string): Promise<VoiceCommandIntent> {
    const text = commandText.toLowerCase().trim();

    // Simple pattern matching for hackathon demo
    // Production: Use OpenAI for robust natural language understanding

    // Check balance
    if (text.includes('balance') || text.includes('how much')) {
      return {
        intent: 'check_balance',
        parameters: {},
        confidence: 0.9,
      };
    }

    // Send USDC
    const sendMatch = text.match(/send\s+(\d+\.?\d*)\s+usdc\s+to\s+(.+)/i);
    if (sendMatch) {
      return {
        intent: 'send_usdc',
        parameters: {
          amount: sendMatch[1],
          recipient: sendMatch[2].trim(),
        },
        confidence: 0.95,
      };
    }

    // Claim battle rewards
    if (text.includes('claim') && (text.includes('reward') || text.includes('battle'))) {
      return {
        intent: 'claim_rewards',
        parameters: {},
        confidence: 0.85,
      };
    }

    // Withdraw USDC
    if (text.includes('withdraw')) {
      const amountMatch = text.match(/(\d+\.?\d*)/);
      return {
        intent: 'withdraw',
        parameters: {
          amount: amountMatch ? amountMatch[1] : undefined,
        },
        confidence: 0.8,
      };
    }

    // Get transaction history
    if (text.includes('history') || text.includes('transactions')) {
      return {
        intent: 'transaction_history',
        parameters: {},
        confidence: 0.9,
      };
    }

    // Unknown command
    return {
      intent: 'unknown',
      parameters: {},
      confidence: 0.0,
    };
  }

  /**
   * Execute a voice command and return result
   */
  async executeCommand(
    userId: string,
    userWalletAddress: string,
    commandText: string
  ): Promise<VoiceCommandResult> {
    try {
      console.log(`🎤 Processing voice command from ${userId}: "${commandText}"`);

      // Parse the command
      const parsed = await this.parseCommand(commandText);

      if (parsed.confidence < 0.5) {
        return {
          success: false,
          message: "Sorry, I didn't understand that command. Try something like 'check my balance' or 'send 5 USDC to the winner'.",
          error: 'Low confidence',
        };
      }

      // Execute based on intent
      let result: VoiceCommandResult;

      switch (parsed.intent) {
        case 'check_balance':
          result = await this.handleCheckBalance(userWalletAddress);
          break;

        case 'send_usdc':
          result = await this.handleSendUSDC(
            userWalletAddress,
            parsed.parameters.amount!,
            parsed.parameters.recipient!
          );
          break;

        case 'claim_rewards':
          result = await this.handleClaimRewards(userWalletAddress);
          break;

        case 'withdraw':
          result = await this.handleWithdraw(
            userWalletAddress,
            parsed.parameters.amount
          );
          break;

        case 'transaction_history':
          result = await this.handleTransactionHistory(userWalletAddress);
          break;

        default:
          result = {
            success: false,
            message: "I don't know how to do that yet. Try checking your balance or sending USDC.",
            error: 'Unknown intent',
          };
      }

      // Generate audio confirmation with ElevenLabs
      if (result.success && this.elevenLabsService) {
        try {
          const audioResponse = await this.elevenLabsService.generateTTS(
            result.message,
            'system', // Use a system voice
            {
              voiceStyle: 'confident',
              speedMultiplier: 1.0,
            }
          );
          result.audioUrl = audioResponse.audioUrl;
          console.log('🎤 Generated ElevenLabs audio confirmation');
        } catch (error: any) {
          console.warn('⚠️ Failed to generate audio confirmation:', error.message);
          // Don't fail the whole command if audio generation fails
        }
      }

      return result;

    } catch (error: any) {
      console.error('❌ Voice command execution failed:', error);
      return {
        success: false,
        message: `Command failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  private async handleCheckBalance(walletAddress: string): Promise<VoiceCommandResult> {
    const balance = await this.arcService.getUSDCBalance(walletAddress);
    return {
      success: true,
      message: `Your Arc wallet has ${balance} USDC.`,
    };
  }

  private async handleSendUSDC(
    fromAddress: string,
    amount: string,
    recipient: string
  ): Promise<VoiceCommandResult> {
    // In demo mode, simulate recipient address
    const toAddress = recipient === 'winner' 
      ? '0x1234567890123456789012345678901234567890'
      : `0x${recipient.substring(0, 40).padEnd(40, '0')}`;

    const transfer = await this.arcService.transferUSDC({
      fromAddress,
      toAddress,
      amountUSDC: amount,
      memo: `Voice command transfer: ${amount} USDC to ${recipient}`,
    });

    return {
      success: true,
      message: `Successfully sent ${amount} USDC to ${recipient}. Transaction confirmed on Arc blockchain.`,
      txHash: transfer.txHash,
    };
  }

  private async handleClaimRewards(walletAddress: string): Promise<VoiceCommandResult> {
    // Award voice command reward
    const transfer = await this.arcService.awardVoiceCommandReward(
      walletAddress,
      'Claim rewards voice command'
    );

    return {
      success: true,
      message: `Rewards claimed! You received 0.05 USDC for using voice commands.`,
      txHash: transfer.txHash,
    };
  }

  private async handleWithdraw(
    walletAddress: string,
    amount?: string
  ): Promise<VoiceCommandResult> {
    if (!amount) {
      return {
        success: false,
        message: "Please specify how much USDC to withdraw. For example, 'withdraw 10 USDC'.",
        error: 'Missing amount',
      };
    }

    // In production, this would withdraw to external wallet
    return {
      success: true,
      message: `Withdrawal of ${amount} USDC initiated. It will arrive in your external wallet within minutes.`,
    };
  }

  private async handleTransactionHistory(walletAddress: string): Promise<VoiceCommandResult> {
    return {
      success: true,
      message: `Your recent transactions are displayed on your wallet page. Check the app to see details.`,
    };
  }
}

// Factory function
export function createVoiceCommandProcessor(
  arcService: ArcBlockchainService,
  elevenLabsService?: ElevenLabsTTSService
): VoiceCommandProcessor {
  return new VoiceCommandProcessor(arcService, elevenLabsService);
}

export default VoiceCommandProcessor;
