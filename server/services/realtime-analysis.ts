import { scoringService } from './scoring';
import { groqService } from './groq';

export interface RealtimeAnalysisResult {
  score: number;
  rhymeDensity: number;
  flowQuality: number;
  creativity: number;
  mlInsights?: {
    complexity: number;
    style: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  feedback: string[];
  improvements: string[];
  timestamp: number;
}

export class RealtimeAnalysisService {
  private analysisCache: Map<string, RealtimeAnalysisResult> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Perform comprehensive real-time analysis on lyrics
   */
  async analyzeRealtime(
    text: string, 
    options: {
      includeML?: boolean;
      isFinalScore?: boolean;
      battleId?: string;
    } = {}
  ): Promise<RealtimeAnalysisResult> {
    console.log(`⚡ Real-time analysis starting for: "${text.substring(0, 50)}..."`);

    const cacheKey = `${text}_${options.includeML}_${options.isFinalScore}`;
    
    // Check cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`✅ Using cached analysis`);
      return cached;
    }

    // Basic scoring analysis (always fast)
    const rhymeDensity = scoringService.calculateRhymeDensity(
      text, 
      options.isFinalScore || false, 
      options.battleId
    );
    const flowQuality = scoringService.calculateFlowQuality(
      text, 
      options.isFinalScore || false, 
      options.battleId
    );
    const creativity = scoringService.calculateCreativity(
      text, 
      options.isFinalScore || false, 
      options.battleId
    );

    const score = Math.round((rhymeDensity * 0.35) + (flowQuality * 0.35) + (creativity * 0.30));

    // Generate instant feedback based on scores
    const feedback = this.generateFeedback(rhymeDensity, flowQuality, creativity);
    const improvements = this.generateImprovements(rhymeDensity, flowQuality, creativity);

    const result: RealtimeAnalysisResult = {
      score,
      rhymeDensity,
      flowQuality,
      creativity,
      feedback,
      improvements,
      timestamp: Date.now()
    };

    // Add ML insights if requested (slower but more detailed)
    if (options.includeML) {
      try {
        console.log(`🧠 Adding ML insights...`);
        const mlAnalysis = await groqService.analyzeLyricsWithML(text);
        result.mlInsights = mlAnalysis;
        console.log(`✅ ML insights added: ${mlAnalysis.complexity}/100 complexity`);
      } catch (error) {
        console.log(`⚠️ ML insights failed, continuing without them`);
      }
    }

    // Cache the result
    this.analysisCache.set(cacheKey, result);

    // Clean up old cache entries
    this.cleanupCache();

    console.log(`✅ Real-time analysis complete: Score ${score}/100`);
    
    return result;
  }

  /**
   * Generate instant feedback based on component scores
   */
  private generateFeedback(rhyme: number, flow: number, creativity: number): string[] {
    const feedback: string[] = [];

    // Rhyme feedback
    if (rhyme >= 80) {
      feedback.push("🔥 Exceptional rhyme complexity! Your wordplay is on point.");
    } else if (rhyme >= 60) {
      feedback.push("✨ Strong rhyme patterns detected. Keep it up!");
    } else if (rhyme >= 40) {
      feedback.push("📊 Decent rhymes, but there's room for more complexity.");
    } else {
      feedback.push("💡 Focus on adding more rhymes and wordplay.");
    }

    // Flow feedback
    if (flow >= 80) {
      feedback.push("🎵 Incredible flow! Your rhythm is smooth and consistent.");
    } else if (flow >= 60) {
      feedback.push("🎶 Good flow control. Your syllable patterns work well.");
    } else if (flow >= 40) {
      feedback.push("⚡ Flow needs work. Try varying your syllable counts.");
    } else {
      feedback.push("🔄 Work on your rhythm and syllable consistency.");
    }

    // Creativity feedback
    if (creativity >= 80) {
      feedback.push("🌟 Brilliant creativity! Your metaphors and wordplay stand out.");
    } else if (creativity >= 60) {
      feedback.push("🎭 Creative content! Nice use of imagery and references.");
    } else if (creativity >= 40) {
      feedback.push("💭 Add more metaphors and unique expressions.");
    } else {
      feedback.push("🚀 Push your creativity further with bold comparisons.");
    }

    return feedback;
  }

  /**
   * Generate specific improvement suggestions
   */
  private generateImprovements(rhyme: number, flow: number, creativity: number): string[] {
    const improvements: string[] = [];

    // Rhyme improvements
    if (rhyme < 70) {
      improvements.push("Add internal rhymes within your lines");
      improvements.push("Use multi-syllabic rhyme schemes");
      improvements.push("Experiment with slant rhymes and assonance");
    }

    // Flow improvements  
    if (flow < 70) {
      improvements.push("Maintain consistent syllable counts per line");
      improvements.push("Vary your rhythm patterns for dynamic flow");
      improvements.push("Practice breath control and pacing");
    }

    // Creativity improvements
    if (creativity < 70) {
      improvements.push("Include more metaphors and similes");
      improvements.push("Add punchlines with clever wordplay");
      improvements.push("Use unique vocabulary and references");
    }

    // Always suggest at least one improvement
    if (improvements.length === 0) {
      improvements.push("Keep practicing to maintain your elite level");
      improvements.push("Challenge yourself with complex rhyme schemes");
      improvements.push("Experiment with different rap styles");
    }

    return improvements;
  }

  /**
   * Batch analyze multiple verses for comparison
   */
  async batchAnalyze(verses: string[]): Promise<RealtimeAnalysisResult[]> {
    console.log(`📦 Batch analyzing ${verses.length} verses...`);
    
    const results = await Promise.all(
      verses.map(verse => this.analyzeRealtime(verse, { includeML: false }))
    );

    console.log(`✅ Batch analysis complete`);
    return results;
  }

  /**
   * Compare two verses and determine winner
   */
  async compareVerses(
    verse1: string, 
    verse2: string,
    includeML: boolean = false
  ): Promise<{
    verse1Analysis: RealtimeAnalysisResult;
    verse2Analysis: RealtimeAnalysisResult;
    winner: 'verse1' | 'verse2' | 'tie';
    margin: number;
    reasoning: string[];
  }> {
    console.log(`⚔️ Comparing two verses...`);

    const [analysis1, analysis2] = await Promise.all([
      this.analyzeRealtime(verse1, { includeML }),
      this.analyzeRealtime(verse2, { includeML })
    ]);

    const scoreDiff = analysis1.score - analysis2.score;
    let winner: 'verse1' | 'verse2' | 'tie';
    
    if (Math.abs(scoreDiff) < 5) {
      winner = 'tie';
    } else if (scoreDiff > 0) {
      winner = 'verse1';
    } else {
      winner = 'verse2';
    }

    // Generate reasoning
    const reasoning: string[] = [];
    
    if (winner === 'tie') {
      reasoning.push('Both verses are extremely close in quality');
      reasoning.push(`Verse 1: ${analysis1.score}/100, Verse 2: ${analysis2.score}/100`);
    } else {
      const winningAnalysis = winner === 'verse1' ? analysis1 : analysis2;
      const losingAnalysis = winner === 'verse1' ? analysis2 : analysis1;
      
      if (winningAnalysis.rhymeDensity > losingAnalysis.rhymeDensity) {
        reasoning.push(`Winner has superior rhyme complexity (${winningAnalysis.rhymeDensity} vs ${losingAnalysis.rhymeDensity})`);
      }
      if (winningAnalysis.flowQuality > losingAnalysis.flowQuality) {
        reasoning.push(`Winner demonstrates better flow control (${winningAnalysis.flowQuality} vs ${losingAnalysis.flowQuality})`);
      }
      if (winningAnalysis.creativity > losingAnalysis.creativity) {
        reasoning.push(`Winner shows more creativity and wordplay (${winningAnalysis.creativity} vs ${losingAnalysis.creativity})`);
      }
    }

    console.log(`✅ Comparison complete: ${winner} wins by ${Math.abs(scoreDiff)} points`);

    return {
      verse1Analysis: analysis1,
      verse2Analysis: analysis2,
      winner,
      margin: Math.abs(scoreDiff),
      reasoning
    };
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.analysisCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.analysisCache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  clearCache() {
    this.analysisCache.clear();
    console.log(`🧹 Real-time analysis cache cleared`);
  }
}

export const realtimeAnalysisService = new RealtimeAnalysisService();
