import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import * as fs from 'fs';
import * as path from 'path';

export interface ElevenLabsTTSOptions {
  apiKey: string;
  voiceStyle?: 'aggressive' | 'confident' | 'smooth' | 'intense' | 'playful';
  characterGender?: 'male' | 'female';
  useTurboModel?: boolean; // Use faster Turbo models for real-time battles
  pronunciationDictId?: string; // Custom pronunciation dictionary for rap slang
}

export class ElevenLabsTTSService {
  private elevenlabs: ElevenLabsClient;
  private outputDir: string;
  private voiceCache = new Map<string, any>();
  private useTurboModel: boolean;
  private pronunciationDictId?: string;

  constructor(options: ElevenLabsTTSOptions) {
    this.elevenlabs = new ElevenLabsClient({
      apiKey: options.apiKey,
    });
    
    this.useTurboModel = options.useTurboModel ?? true; // Default to turbo for battle rap
    this.pronunciationDictId = options.pronunciationDictId;
    
    this.outputDir = path.join(process.cwd(), 'temp_audio');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private async getAvailableVoices(): Promise<any[]> {
    try {
      const response = await this.elevenlabs.voices.getAll();
      return response.voices || [];
    } catch (error) {
      console.error('❌ Failed to fetch ElevenLabs voices:', error);
      return [];
    }
  }

  private async getVoiceForCharacter(characterId: string, gender: string = 'male'): Promise<string> {
    // Check cache first
    const cacheKey = `${characterId}-${gender}`;
    if (this.voiceCache.has(cacheKey)) {
      return this.voiceCache.get(cacheKey);
    }

    // Get all available voices
    const voices = await this.getAvailableVoices();
    
    // Default voice mapping strategy - look for specific characteristics
    const characterVoicePrefs: Record<string, { 
      keywords: string[], 
      preferredGender: 'male' | 'female',
      fallbackVoiceId?: string 
    }> = {
      'razor': { 
        keywords: ['sharp', 'aggressive', 'fierce', 'young', 'confident'], 
        preferredGender: 'female',
        fallbackVoiceId: 'EXAVITQu4vr4xnSDxMaL' // Bella - default ElevenLabs voice
      },
      'venom': { 
        keywords: ['deep', 'dark', 'menacing', 'powerful', 'intense'], 
        preferredGender: 'male',
        fallbackVoiceId: 'bVMeCyTHy58xNoL34h3p' // Jeremy - default ElevenLabs voice
      },
      'silk': { 
        keywords: ['smooth', 'suave', 'confident', 'charming', 'sophisticated'], 
        preferredGender: 'male',
        fallbackVoiceId: 'AZnzlk1XvdvUeBnXmlld' // Domi - default ElevenLabs voice
      },
      'cypher': { 
        keywords: ['robotic', 'artificial', 'synthetic', 'mechanical', 'digital'], 
        preferredGender: 'male',
        fallbackVoiceId: 'bVMeCyTHy58xNoL34h3p' // Jeremy - default ElevenLabs voice (will be processed for robot effects)
      }
    };

    const charPrefs = characterVoicePrefs[characterId] || {
      keywords: ['confident', 'clear'],
      preferredGender: gender as 'male' | 'female',
      fallbackVoiceId: 'pNInz6obpgDQGcFmaJgB' // Adam - default ElevenLabs voice
    };

    // Try to find a voice that matches character preferences
    let selectedVoice = voices.find(voice => {
      const voiceName = voice.name?.toLowerCase() || '';
      const voiceDescription = voice.description?.toLowerCase() || '';
      
      // Safely handle voice.labels (can be array, object, or undefined)
      let voiceLabels = '';
      let genderLabels: string[] = [];
      
      try {
        if (Array.isArray(voice.labels)) {
          voiceLabels = voice.labels.join(' ').toLowerCase();
          genderLabels = voice.labels.map((l: unknown) => String(l).toLowerCase());
        } else if (voice.labels && typeof voice.labels === 'object') {
          voiceLabels = Object.values(voice.labels).join(' ').toLowerCase();
          genderLabels = Object.values(voice.labels).map((l: unknown) => String(l).toLowerCase());
        }
      } catch (error) {
        console.warn(`⚠️ ElevenLabs voice labels parsing error for ${voice.name}:`, error);
      }
      
      const searchText = `${voiceName} ${voiceDescription} ${voiceLabels}`;
      
      // Check if voice matches gender preference
      const matchesGender = genderLabels.includes(charPrefs.preferredGender) || 
                           genderLabels.includes(`${charPrefs.preferredGender}_voice`);
      
      // Check if voice matches character keywords
      const matchesKeywords = charPrefs.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      
      return matchesGender && matchesKeywords;
    });

    // If no perfect match, find any voice matching gender
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => {
        let genderLabels: string[] = [];
        
        try {
          if (Array.isArray(voice.labels)) {
            genderLabels = voice.labels.map((l: unknown) => String(l).toLowerCase());
          } else if (voice.labels && typeof voice.labels === 'object') {
            genderLabels = Object.values(voice.labels).map((l: unknown) => String(l).toLowerCase());
          }
        } catch (error) {
          console.warn(`⚠️ ElevenLabs gender fallback labels error for ${voice.name}:`, error);
        }
        
        return genderLabels.includes(charPrefs.preferredGender) || 
               genderLabels.includes(`${charPrefs.preferredGender}_voice`);
      });
    }

    // Final fallback to character's preferred voice ID
    const voiceId = selectedVoice?.voice_id || charPrefs.fallbackVoiceId;
    
    console.log(`🎤 ElevenLabs voice mapping for ${characterId}: ${selectedVoice?.name || 'fallback'} (${voiceId})`);
    
    // Cache the result
    this.voiceCache.set(cacheKey, voiceId);
    
    return voiceId;
  }

  /**
   * Add natural breath patterns and dramatic pauses for battle rap delivery
   * ElevenLabs interprets punctuation naturally, so we enhance the text with strategic pauses
   */
  private addBreathPatterns(text: string, voiceStyle?: string): string {
    let processedText = text;
    
    // Add dramatic pauses before powerful lines (indicated by exclamation marks)
    processedText = processedText.replace(/!/g, '... !');
    
    // Add breath points after long sentences (commas become natural breath points)
    // Split by periods and add strategic pauses
    const sentences = processedText.split(/\.\s+/);
    processedText = sentences.map((sentence, idx) => {
      if (sentence.length > 80) {
        // Add a breath in the middle of long lines
        const midPoint = sentence.length / 2;
        const commaIndex = sentence.indexOf(',', midPoint - 20);
        if (commaIndex > 0) {
          sentence = sentence.slice(0, commaIndex + 1) + '..' + sentence.slice(commaIndex + 1);
        }
      }
      return sentence;
    }).join('. ');
    
    // Aggressive style gets more dramatic pauses
    if (voiceStyle === 'aggressive' || voiceStyle === 'intense') {
      // Add emphasis pauses before key words
      processedText = processedText
        .replace(/\b(destroy|crush|murder|kill|end|finish)\b/gi, '... $1')
        .replace(/\b(better|best|greatest|king|queen|champion)\b/gi, '$1 ...');
    }
    
    // Add natural breathing at line breaks (double spaces or newlines)
    processedText = processedText
      .replace(/\n\n/g, '... ')
      .replace(/\n/g, ', ')
      .replace(/\s{2,}/g, '.. ');
    
    return processedText;
  }

  private applyCharacterSpeechEffects(text: string, characterId: string, voiceStyle?: string): string {
    let processedText = text;
    
    // Clean text for better TTS
    processedText = processedText
      .replace(/\[.*?\]/g, '') // Remove style tags
      .replace(/\(.*?\)/g, '') // Remove parentheses and content
      .replace(/\*.*?\*/g, '') // Remove emphasis markers
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();

    // Add breath patterns for natural rap delivery
    processedText = this.addBreathPatterns(processedText, voiceStyle);

    // Special processing for CYPHER-9000 robot character
    if (characterId === 'cypher') {
      // Apply subtle robotic speech patterns that work well with TTS
      processedText = processedText
        .replace(/\bi\s/gi, 'I, as a cybernetic entity, ')
        .replace(/\bmy\b/gi, 'my digital')
        .replace(/\byour\b/gi, 'your biological')
        .replace(/\byou\b/gi, 'you, organic being');
      
      // Add robotic prefixes/suffixes that sound natural
      const robotPrefixes = [
        'Initiating verbal protocol.',
        'Processing lyrical algorithms.',
        'Executing combat subroutines.',
        'Activating battle mode.'
      ];
      
      const robotSuffixes = [
        'Protocol complete.',
        'Systems nominal.',
        'Termination sequence activated.',
        'Combat efficiency: maximum.'
      ];
      
      const prefix = robotPrefixes[Math.floor(Math.random() * robotPrefixes.length)];
      const suffix = robotSuffixes[Math.floor(Math.random() * robotSuffixes.length)];
      
      processedText = `${prefix} ${processedText} ${suffix}`;
      console.log(`🤖 CYPHER-9000 ElevenLabs: Applied robotic speech patterns with breath control`);
    }

    return processedText;
  }

  /**
   * Calculate optimal speed for battle rap delivery
   * Battle rap requires varied pacing - fast for aggressive, varied for dramatic effect
   */
  private calculateRapSpeed(characterId: string, voiceStyle?: string, speedMultiplier: number = 1.0): number {
    // Base speeds for different battle rap styles
    const styleSpeedMap: Record<string, number> = {
      'aggressive': 1.15,  // Faster, more intense delivery
      'confident': 1.05,   // Slightly faster than normal, commanding
      'smooth': 0.95,      // Slower, more controlled flow
      'intense': 1.2,      // Maximum speed for intensity
      'playful': 1.1       // Upbeat, quick delivery
    };
    
    // Character-specific speed adjustments
    const characterSpeedMap: Record<string, number> = {
      'razor': 1.1,    // Fast, sharp delivery
      'venom': 1.0,    // Measured, menacing pace
      'silk': 0.95,    // Smooth, slower flow
      'cypher': 1.15   // Robotic, precise and fast
    };
    
    const styleSpeed = voiceStyle ? (styleSpeedMap[voiceStyle] || 1.0) : 1.0;
    const characterSpeed = characterSpeedMap[characterId] || 1.0;
    
    // Combine all speed factors
    // ElevenLabs speed range: 0.25 to 4.0, but 0.5-1.5 is most natural
    const finalSpeed = Math.min(1.5, Math.max(0.5, styleSpeed * characterSpeed * speedMultiplier));
    
    return finalSpeed;
  }

  async generateTTS(
    text: string,
    characterId: string,
    options: {
      voiceStyle?: 'aggressive' | 'confident' | 'smooth' | 'intense' | 'playful';
      characterName?: string;
      gender?: string;
      speedMultiplier?: number;
    } = {}
  ): Promise<{ audioUrl: string; duration: number }> {
    console.log(`🎤 ElevenLabs TTS generating for ${characterId}: "${text.substring(0, 50)}..."`);
    
    try {
      const voiceId = await this.getVoiceForCharacter(characterId, options.gender);
      const voiceStyle = options.voiceStyle || 'confident';
      
      console.log(`🚀 Using ElevenLabs voice ID: ${voiceId} with style: ${voiceStyle}`);
      
      // Apply character-specific speech effects with breath patterns
      const processedText = this.applyCharacterSpeechEffects(text, characterId, voiceStyle);
      
      // Calculate optimal speed for battle rap delivery
      const rapSpeed = this.calculateRapSpeed(characterId, voiceStyle, options.speedMultiplier || 1.0);
      
      // Voice settings for rap battle delivery with speed control
      const voiceSettings = {
        stability: 0.5,           // Medium stability for natural variation
        similarityBoost: 0.8,     // High similarity to maintain character voice
        style: this.getStyleBoost(voiceStyle), // Dynamic style based on character
        useSpeakerBoost: true,    // Enhanced clarity for battle rap
        speed: rapSpeed           // Native speed control for perfect pacing
      };

      console.log(`🎯 ElevenLabs voice settings: stability=${voiceSettings.stability}, similarity=${voiceSettings.similarityBoost}, style=${voiceSettings.style}, speed=${voiceSettings.speed}x`);

      // Select optimal model for battle rap (Turbo for speed, Multilingual for quality)
      const modelId = this.useTurboModel ? "eleven_turbo_v2_5" : "eleven_multilingual_v2";
      console.log(`⚡ Using ${modelId} model for ${this.useTurboModel ? 'ultra-fast' : 'high-quality'} generation`);

      // Generate speech with ElevenLabs API
      const audioResponse = await this.elevenlabs.textToSpeech.convert(voiceId, {
        text: processedText,
        modelId: modelId,
        outputFormat: "mp3_44100_128", // High quality MP3
        voiceSettings: voiceSettings,
        pronunciationDictionaryLocators: this.pronunciationDictId ? [{
          pronunciationDictionaryId: this.pronunciationDictId,
          versionId: "latest"
        }] : undefined
      });

      // Save to file
      const timestamp = Date.now();
      const filename = `elevenlabs_tts_${characterId}_${timestamp}.mp3`;
      const outputPath = path.join(this.outputDir, filename);

      // Convert ReadableStream to buffer
      const chunks: Uint8Array[] = [];
      const reader = audioResponse.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(outputPath, buffer);

      console.log(`✅ ElevenLabs TTS success: ${buffer.length} bytes with ${rapSpeed}x speed and breath patterns`);

      // Convert to base64 for immediate use
      const base64Audio = buffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

      // Estimate duration (adjusted for actual speed)
      const baseDuration = Math.floor(processedText.length / 15);
      const duration = Math.floor(baseDuration / rapSpeed);

      return {
        audioUrl,
        duration
      };

    } catch (error: any) {
      console.error(`❌ ElevenLabs TTS failed for ${characterId}:`, error.message);
      throw new Error(`ElevenLabs TTS generation failed: ${error.message}`);
    }
  }

  private getStyleBoost(voiceStyle: string): number {
    // Map voice styles to ElevenLabs style values (0.0 - 1.0)
    const styleMap: Record<string, number> = {
      'aggressive': 0.8,  // High style for aggressive delivery
      'confident': 0.6,   // Medium-high for confident delivery
      'smooth': 0.4,      // Lower style for smooth delivery
      'intense': 0.9,     // Maximum style for intense delivery
      'playful': 0.7      // High style for playful delivery
    };

    return styleMap[voiceStyle] || 0.6; // Default to confident
  }

  // Test if the API key works
  async testConnection(): Promise<boolean> {
    try {
      const voices = await this.getAvailableVoices();
      return voices.length > 0;
    } catch (error) {
      console.error('ElevenLabs TTS test failed:', error);
      return false;
    }
  }

  // Get user's available voices (for advanced users who want to customize)
  async getUserVoices(): Promise<any[]> {
    try {
      const response = await this.elevenlabs.voices.getAll();
      return response.voices || [];
    } catch (error) {
      console.error('❌ Failed to get user voices:', error);
      return [];
    }
  }

  /**
   * Create or update pronunciation dictionary for battle rap terms
   * This ensures rap slang, artist names, and technical terms are pronounced correctly
   */
  async createRapPronunciationDictionary(): Promise<string | null> {
    try {
      // Battle rap specific pronunciation rules
      const rapPronunciationRules = [
        // Common rap slang and terms
        { type: "alias" as const, stringToReplace: "mic", alias: "mike" },
        { type: "alias" as const, stringToReplace: "cypher", alias: "sigh-fer" },
        { type: "alias" as const, stringToReplace: "flow", alias: "floh" },
        { type: "alias" as const, stringToReplace: "bars", alias: "bahrz" },
        { type: "alias" as const, stringToReplace: "diss", alias: "dis" },
        { type: "alias" as const, stringToReplace: "freestyle", alias: "free-style" },
        { type: "alias" as const, stringToReplace: "beatbox", alias: "beet-box" },
        { type: "alias" as const, stringToReplace: "MC", alias: "em-see" },
        { type: "alias" as const, stringToReplace: "DJ", alias: "dee-jay" },
        { type: "alias" as const, stringToReplace: "rhyme", alias: "rime" },
        { type: "alias" as const, stringToReplace: "verse", alias: "vurs" },
        // Battle rap specific
        { type: "alias" as const, stringToReplace: "rap battle", alias: "wrap battle" },
        { type: "alias" as const, stringToReplace: "spit", alias: "spit" },
        { type: "alias" as const, stringToReplace: "roast", alias: "rohst" },
        { type: "alias" as const, stringToReplace: "yo", alias: "yoh" },
      ];

      const response = await this.elevenlabs.pronunciationDictionaries.createFromRules({
        name: "Battle Rap Dictionary",
        description: "Custom pronunciations for battle rap terms and slang",
        rules: rapPronunciationRules
      });

      console.log(`✅ Created pronunciation dictionary: ${response.id}`);
      return response.id;
    } catch (error: any) {
      console.error('❌ Failed to create pronunciation dictionary:', error.message);
      return null;
    }
  }

  /**
   * Set a custom pronunciation dictionary for this instance
   */
  setPronunciationDictionary(dictId: string) {
    this.pronunciationDictId = dictId;
    console.log(`📖 Pronunciation dictionary set: ${dictId}`);
  }
}

// Factory function for creating ElevenLabs TTS instances
export function createElevenLabsTTS(apiKey: string): ElevenLabsTTSService {
  return new ElevenLabsTTSService({ apiKey });
}