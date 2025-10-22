/**
 * Machine Learning Rapper Cloning Service
 * 
 * Combines voice synthesis, style transfer, and lyric generation models
 * to create AI rapper clones with authentic vocal tone, flow, and lyrical style.
 * 
 * Features:
 * - Voice cloning with multiple TTS providers
 * - Lyric style transfer using LLMs
 * - Beat alignment and flow modeling
 * - Prosody modeling for syllable stress and timing
 */

import { GroqService } from './groq';
import { LyricAnalysisService } from './lyricAnalysis';

export interface RapperProfile {
  name: string;
  style: 'technical' | 'smooth' | 'creative' | 'aggressive' | 'storyteller';
  characteristics: {
    avgSyllablesPerBar: number;
    rhymeComplexity: number; // 0-1
    flowVariation: number; // 0-1
    wordplayFrequency: number; // 0-1
    metaphorDensity: number; // 0-1
    battleTactics: string[]; // Common battle phrases/tactics
  };
  voiceProfile?: {
    pitch: number; // -1 to 1
    tempo: number; // 0.5 to 2.0
    tone: 'deep' | 'mid' | 'high';
    energy: 'calm' | 'moderate' | 'intense';
  };
}

export interface BeatContext {
  bpm: number;
  timeSignature: string;
  genre: string;
  downbeats?: number[]; // Timestamps of downbeats in ms
}

export interface VoiceCloneRequest {
  text: string;
  rapperProfile: RapperProfile;
  beatContext?: BeatContext;
  provider?: 'elevenlabs' | 'typecast' | 'groq-tts';
}

export interface StyleTransferRequest {
  prompt: string;
  targetRapper: string;
  rapperProfile: RapperProfile;
  bars: number; // Number of bars to generate (typically 16)
  theme?: string;
  opponentName?: string; // For battle context
}

export interface FlowModelingResult {
  syllableStress: number[]; // 0-1 for each syllable
  pausePoints: number[]; // Indices where pauses should occur
  emphasisWords: string[]; // Words that should be emphasized
  timing: {
    syllable: string;
    startTime: number; // ms
    duration: number; // ms
  }[];
}

export class MLRapperCloningService {
  private groqService: GroqService;
  private lyricAnalysis: LyricAnalysisService;

  constructor() {
    this.groqService = new GroqService();
    this.lyricAnalysis = new LyricAnalysisService();
  }

  /**
   * Generate lyrics in the style of a specific rapper using LLM style transfer
   */
  async generateStyledLyrics(request: StyleTransferRequest): Promise<string> {
    const { rapperProfile, bars, theme, opponentName, prompt } = request;

    // Build a detailed style prompt based on rapper profile
    const stylePrompt = this.buildStylePrompt(rapperProfile, bars, theme, opponentName, prompt);

    try {
      // Use Groq LLaMA for fast inference with style transfer
      const response = await this.groqService.generateVerse({
        characterId: rapperProfile.name,
        difficulty: this.mapStyleToDifficulty(rapperProfile.style),
        opponent: opponentName,
        previousLines: [],
        battleContext: {
          round: 1,
          userScore: 0,
          opponentScore: 0
        },
        customPrompt: stylePrompt
      });

      return response;
    } catch (error) {
      console.error('❌ Style transfer failed:', error);
      throw new Error('Failed to generate styled lyrics');
    }
  }

  /**
   * Align lyrics with beat for proper flow timing
   */
  async alignToBeat(lyrics: string, beatContext: BeatContext): Promise<FlowModelingResult> {
    const lines = lyrics.split('\n').filter(line => line.trim());
    const msPerBar = (60000 / beatContext.bpm) * 4; // 4 beats per bar at given BPM

    // Analyze syllable structure
    const analysis = await this.lyricAnalysis.analyzeVerse(lyrics, 'user');
    
    const allSyllables: string[] = [];
    const syllableStress: number[] = [];
    const pausePoints: number[] = [];
    const emphasisWords: string[] = [];
    const timing: FlowModelingResult['timing'] = [];

    let currentTime = 0;
    const barsCount = lines.length / 2; // Typically 2 lines per bar

    lines.forEach((line, lineIndex) => {
      const lineAnalysis = analysis.lines[lineIndex];
      if (!lineAnalysis) return;

      const syllablesInLine = lineAnalysis.syllableCount;
      const timePerSyllable = msPerBar / syllablesInLine;

      // Extract syllables from words
      lineAnalysis.words.forEach((wordAnalysis, wordIndex) => {
        const word = wordAnalysis.word;
        const syllableCount = wordAnalysis.syllables;

        // Determine stress pattern (emphasis on rhymes and multi-syllable words)
        const isRhyme = wordAnalysis.isEndRhyme || wordAnalysis.isInternal;
        const baseStress = isRhyme ? 0.8 : 0.5;

        for (let i = 0; i < syllableCount; i++) {
          const syllable = this.extractSyllable(word, i, syllableCount);
          allSyllables.push(syllable);
          
          // Natural stress pattern: emphasis on stressed syllables
          const stress = i === 0 || (syllableCount > 2 && i === syllableCount - 2) 
            ? baseStress * 1.2 
            : baseStress * 0.8;
          
          syllableStress.push(Math.min(stress, 1.0));

          timing.push({
            syllable,
            startTime: currentTime,
            duration: timePerSyllable
          });

          currentTime += timePerSyllable;
        }

        // Mark emphasis words (rhymes, wordplay)
        if (isRhyme || wordAnalysis.isMultiSyllable) {
          emphasisWords.push(word);
        }

        // Add micro-pause between words
        if (wordIndex < lineAnalysis.words.length - 1) {
          currentTime += timePerSyllable * 0.1;
        }
      });

      // Add pause at end of line (breath point)
      pausePoints.push(allSyllables.length - 1);
      currentTime += msPerBar * 0.15; // 15% of bar duration for breath
    });

    return {
      syllableStress,
      pausePoints,
      emphasisWords,
      timing
    };
  }

  /**
   * Clone a rapper's voice with proper prosody and beat alignment
   */
  async cloneVoice(request: VoiceCloneRequest): Promise<{
    audioUrl: string;
    duration: number;
    flowModeling: FlowModelingResult;
  }> {
    const { text, rapperProfile, beatContext } = request;

    // Generate flow modeling if beat context provided
    let flowModeling: FlowModelingResult | undefined;
    if (beatContext) {
      flowModeling = await this.alignToBeat(text, beatContext);
    }

    // For now, return structure - actual voice generation would use existing TTS services
    // This service coordinates the ML aspects; voice synthesis is handled by typecast/elevenlabs
    return {
      audioUrl: '', // Would be generated by TTS service
      duration: 0,
      flowModeling: flowModeling || {
        syllableStress: [],
        pausePoints: [],
        emphasisWords: [],
        timing: []
      }
    };
  }

  /**
   * Build a detailed style prompt for LLM based on rapper profile
   */
  private buildStylePrompt(
    profile: RapperProfile,
    bars: number,
    theme?: string,
    opponentName?: string,
    basePrompt?: string
  ): string {
    const styleDescriptions = {
      technical: 'complex multi-syllable rhyme schemes, intricate wordplay, and precise flow',
      smooth: 'effortless delivery, smooth transitions, and melodic cadence',
      creative: 'innovative metaphors, unique perspectives, and experimental wordplay',
      aggressive: 'hard-hitting punchlines, confrontational energy, and powerful delivery',
      storyteller: 'vivid imagery, narrative structure, and detailed scene-setting'
    };

    let prompt = basePrompt || `Write a ${bars}-bar verse`;
    
    prompt += ` in the style of ${profile.name}, known for ${styleDescriptions[profile.style]}.`;

    // Add characteristics
    const { characteristics } = profile;
    prompt += `\n\nStyle Guidelines:`;
    prompt += `\n- Use approximately ${characteristics.avgSyllablesPerBar} syllables per bar`;
    prompt += `\n- Rhyme complexity: ${characteristics.rhymeComplexity > 0.7 ? 'HIGH - use multi-syllable and internal rhymes' : 'MODERATE - focus on strong end rhymes'}`;
    prompt += `\n- Flow variation: ${characteristics.flowVariation > 0.7 ? 'VARIED - change up rhythm and pace' : 'CONSISTENT - maintain steady flow'}`;
    
    if (characteristics.wordplayFrequency > 0.6) {
      prompt += `\n- Include clever wordplay, double entendres, and punch lines`;
    }
    
    if (characteristics.metaphorDensity > 0.6) {
      prompt += `\n- Use rich metaphors and vivid imagery`;
    }

    if (characteristics.battleTactics.length > 0) {
      prompt += `\n- Incorporate battle tactics: ${characteristics.battleTactics.slice(0, 3).join(', ')}`;
    }

    if (theme) {
      prompt += `\n\nTheme: ${theme}`;
    }

    if (opponentName) {
      prompt += `\n\nTarget opponent: ${opponentName}`;
      prompt += `\n- Include direct challenges and competitive energy`;
    }

    prompt += `\n\nGenerate ONLY the lyrics, no explanations or meta-commentary.`;

    return prompt;
  }

  /**
   * Map rapper style to difficulty for verse generation
   */
  private mapStyleToDifficulty(style: string): 'easy' | 'normal' | 'hard' | 'nightmare' | 'god' {
    const styleMap: Record<string, 'easy' | 'normal' | 'hard' | 'nightmare' | 'god'> = {
      'technical': 'nightmare',
      'smooth': 'hard',
      'creative': 'nightmare',
      'aggressive': 'hard',
      'storyteller': 'normal'
    };
    return styleMap[style] || 'normal';
  }

  /**
   * Extract syllable from word (simplified)
   */
  private extractSyllable(word: string, index: number, totalSyllables: number): string {
    // Simple syllable extraction - in production, use phonetic library
    if (totalSyllables === 1) return word;
    
    const syllableLength = Math.ceil(word.length / totalSyllables);
    const start = index * syllableLength;
    const end = Math.min(start + syllableLength, word.length);
    
    return word.substring(start, end);
  }

  /**
   * Create rapper profile from battle history
   */
  async createProfileFromHistory(userId: string, battlesData: any[]): Promise<RapperProfile> {
    // Analyze user's battle history to extract style characteristics
    let totalSyllables = 0;
    let totalBars = 0;
    let totalRhymes = 0;
    let totalWordplay = 0;
    let totalMetaphors = 0;
    
    for (const battle of battlesData) {
      const analysis = await this.lyricAnalysis.analyzeVerse(battle.userVerse, userId);
      
      totalSyllables += analysis.flowAnalysis.averageSyllables * analysis.lines.length;
      totalBars += analysis.lines.length / 2;
      totalRhymes += analysis.rhymeAnalysis.endRhymes + analysis.rhymeAnalysis.internalRhymes;
      totalWordplay += analysis.creativityAnalysis.detectedWordplay.length;
      totalMetaphors += analysis.creativityAnalysis.detectedMetaphors.length;
    }

    const avgSyllablesPerBar = totalBars > 0 ? totalSyllables / totalBars : 12;
    const rhymeComplexity = Math.min((totalRhymes / totalBars) / 10, 1);
    const wordplayFrequency = Math.min((totalWordplay / totalBars) / 3, 1);
    const metaphorDensity = Math.min((totalMetaphors / totalBars) / 2, 1);

    // Determine style based on characteristics
    let style: RapperProfile['style'] = 'smooth';
    if (rhymeComplexity > 0.7 && wordplayFrequency > 0.6) {
      style = 'technical';
    } else if (metaphorDensity > 0.7) {
      style = 'creative';
    } else if (wordplayFrequency > 0.7) {
      style = 'aggressive';
    }

    return {
      name: `User_${userId}`,
      style,
      characteristics: {
        avgSyllablesPerBar: Math.round(avgSyllablesPerBar),
        rhymeComplexity,
        flowVariation: 0.5, // Default
        wordplayFrequency,
        metaphorDensity,
        battleTactics: [] // Would extract from battle history
      }
    };
  }
}

export const mlRapperCloningService = new MLRapperCloningService();
