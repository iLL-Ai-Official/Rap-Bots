import type { Battle, BattleRound } from "@shared/schema";

interface SoraVideoGenerationRequest {
  model: string;
  image_url: string;
  prompt: string;
  duration: number;
  aspect_ratio: string;
  resolution: string;
}

interface SoraVideoResponse {
  id: string;
  status: 'waiting' | 'active' | 'queued' | 'generating' | 'complete' | 'failed';
  video_url?: string;
  error?: string;
}

export class SoraVideoService {
  private apiKey: string;
  private baseUrl = 'https://api.aimlapi.com/v2/video/generations';

  constructor() {
    this.apiKey = process.env.AIMLAPI_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ AIMLAPI_KEY not set - Sora video generation disabled');
    }
  }

  /**
   * Generate a battle round video using Sora 2 Pro
   * Cost: 50 credits per video generation
   */
  async generateBattleVideo(
    battleId: string,
    roundNumber: number,
    userVerse: string,
    aiVerse: string,
    characterImageUrl: string
  ): Promise<{ generationId: string; cost: number }> {
    if (!this.apiKey) {
      throw new Error('Sora video generation not configured');
    }

    // Create a cinematic prompt for the battle round
    const prompt = this.createBattlePrompt(userVerse, aiVerse, roundNumber);

    const request: SoraVideoGenerationRequest = {
      model: 'openai/sora-2-pro-i2v',
      image_url: characterImageUrl,
      prompt,
      duration: 8, // 8 seconds for battle round
      aspect_ratio: '16:9',
      resolution: '1080p'
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sora video generation failed: ${error}`);
    }

    const data = await response.json();
    console.log('🎬 Sora video generation started:', data.id);

    return {
      generationId: data.id,
      cost: 50 // 50 credits per video
    };
  }

  /**
   * Check video generation status and retrieve URL when complete
   */
  async getVideoStatus(generationId: string): Promise<SoraVideoResponse> {
    const response = await fetch(`${this.baseUrl}?generation_id=${generationId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check video status');
    }

    return await response.json();
  }

  /**
   * Create a cinematic prompt for the battle round
   */
  private createBattlePrompt(userVerse: string, aiVerse: string, roundNumber: number): string {
    // Extract key phrases from verses for visual storytelling
    const userHighlight = userVerse.split('\n')[0].substring(0, 100);
    const aiHighlight = aiVerse.split('\n')[0].substring(0, 100);

    return `Epic rap battle round ${roundNumber} - The AI character performs with intense energy and dramatic gestures, delivering powerful lyrics. Camera moves dynamically around the character as they rap. Dramatic lighting with stage smoke effects. The character shows confident, aggressive battle rap performance with hand gestures and facial expressions matching the intensity of the lyrics. Professional hip-hop music video cinematography.`;
  }
}

export const soraVideoService = new SoraVideoService();