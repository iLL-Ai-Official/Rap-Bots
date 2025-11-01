import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

interface SFXOptions {
  apiKey?: string;
}

export class ElevenLabsSFXService {
  private client: ElevenLabsClient;
  private cache: Map<string, Buffer> = new Map();

  constructor(options: SFXOptions = {}) {
    const apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required for sound effects');
    }

    this.client = new ElevenLabsClient({ apiKey });
  }

  /**
   * Generate a sound effect from text description
   */
  async generateSoundEffect(
    description: string,
    durationSeconds?: number,
    cacheKey?: string
  ): Promise<Buffer> {
    // Check cache first
    if (cacheKey && this.cache.has(cacheKey)) {
      console.log(`🎵 Using cached SFX: ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    try {
      console.log(`🎨 Generating ElevenLabs SFX: "${description}" (${durationSeconds || 'auto'}s)`);
      
      const response = await this.client.textToSoundEffects.convert({
        text: description,
        durationSeconds: durationSeconds,
        promptInfluence: 0.5, // Balance between prompt and quality
      });

      // Convert ReadableStream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const audioBuffer = Buffer.concat(chunks);

      // Cache the result
      if (cacheKey) {
        this.cache.set(cacheKey, audioBuffer);
        console.log(`✅ Cached SFX: ${cacheKey} (${audioBuffer.length} bytes)`);
      }

      return audioBuffer;
    } catch (error) {
      console.error('Failed to generate sound effect:', error);
      throw error;
    }
  }

  /**
   * Pre-generate common battle sounds
   */
  async preGenerateBattleSounds(): Promise<void> {
    const sounds = [
      // Crowd reactions
      { key: 'crowd-mild', description: 'Small crowd applause, polite appreciation, scattered claps [mild, brief]', duration: 2 },
      { key: 'crowd-medium', description: 'Excited crowd cheering at concert, energetic approval, hyped audience [loud, energetic]', duration: 3 },
      { key: 'crowd-wild', description: 'Thunderous crowd roar at stadium, explosive celebration, wild cheering and screaming [extreme, intense]', duration: 4 },
      { key: 'crowd-boo', description: 'Crowd booing and jeering, expressing disappointment and disapproval [negative, hostile]', duration: 3 },
      { key: 'crowd-gasp', description: 'Audience collective gasp of shock and surprise [shocked, brief]', duration: 1.5 },
      
      // Bell sounds
      { key: 'boxing-bell', description: 'Boxing bell ringing, sharp metallic ring signaling round start [loud, clear]', duration: 2 },
      { key: 'bell-ding', description: 'Single bell ding, sharp and crisp notification sound [bright, quick]', duration: 1 },
      
      // Victory/ending sounds
      { key: 'air-horn', description: 'Air horn blast, loud celebratory sound effect [harsh, loud]', duration: 2 },
      { key: 'victory-fanfare', description: 'Victory trumpet fanfare, triumphant announcement [celebratory, dramatic]', duration: 3 },
    ];

    console.log(`🎯 Pre-generating ${sounds.length} battle sounds...`);
    
    const results = await Promise.allSettled(
      sounds.map(({ key, description, duration }) =>
        this.generateSoundEffect(description, duration, key)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Pre-generated ${successful}/${sounds.length} battle sounds`);
  }

  /**
   * Get a specific sound effect (generates if not cached)
   */
  async getSound(type: string): Promise<Buffer> {
    if (this.cache.has(type)) {
      return this.cache.get(type)!;
    }

    // Map types to descriptions
    const soundMap: Record<string, { description: string; duration: number }> = {
      'crowd-mild': { description: 'Small crowd applause, polite appreciation [mild]', duration: 2 },
      'crowd-medium': { description: 'Excited crowd cheering, energetic [loud]', duration: 3 },
      'crowd-wild': { description: 'Thunderous crowd roar, explosive [extreme]', duration: 4 },
      'crowd-boo': { description: 'Crowd booing, disapproval [negative]', duration: 3 },
      'crowd-gasp': { description: 'Audience gasp of shock [shocked]', duration: 1.5 },
      'boxing-bell': { description: 'Boxing bell ring [loud, metallic]', duration: 2 },
      'bell-ding': { description: 'Bell ding [bright, quick]', duration: 1 },
      'air-horn': { description: 'Air horn blast [loud, celebratory]', duration: 2 },
      'victory-fanfare': { description: 'Victory trumpet fanfare [triumphant]', duration: 3 },
    };

    const sound = soundMap[type];
    if (!sound) {
      throw new Error(`Unknown sound type: ${type}`);
    }

    return this.generateSoundEffect(sound.description, sound.duration, type);
  }

  /**
   * Test if the API connection works
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateSoundEffect('test bell ding', 0.5);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ SFX cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { count: number; keys: string[]; totalSize: number } {
    let totalSize = 0;
    this.cache.forEach(buffer => {
      totalSize += buffer.length;
    });

    return {
      count: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalSize,
    };
  }
}

// Singleton instance
let sfxService: ElevenLabsSFXService | null = null;

export function getElevenLabsSFXService(apiKey?: string): ElevenLabsSFXService {
  const key = apiKey || process.env.ELEVENLABS_API_KEY;
  
  if (!key) {
    throw new Error('ElevenLabs API key not available');
  }

  if (!sfxService || (apiKey && apiKey !== process.env.ELEVENLABS_API_KEY)) {
    sfxService = new ElevenLabsSFXService({ apiKey: key });
  }

  return sfxService;
}

export function hasSFXServiceAvailable(): boolean {
  return !!(process.env.ELEVENLABS_API_KEY);
}
