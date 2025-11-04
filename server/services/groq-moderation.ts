/**
 * Groq Moderation Service
 * 
 * Uses Groq's Llama Guard 3 model for content moderation
 * Filters harmful content, profanity, and inappropriate material
 */

export interface ModerationResult {
  safe: boolean;
  categories: string[]; // e.g., ["violence", "profanity"]
  filteredText?: string; // Sanitized version
  severity: 'low' | 'medium' | 'high';
  originalText: string;
}

export class GroqModerationService {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1";
  private moderationModel = "llama-guard-3-8b";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || "";
    if (!this.apiKey) {
      console.warn("⚠️ Groq API key not found - moderation service will be limited");
    } else {
      console.log("✅ Groq Moderation Service initialized with Llama Guard 3");
    }
  }

  /**
   * Moderate text content using Llama Guard 3
   */
  async moderateText(text: string): Promise<ModerationResult> {
    if (!this.apiKey) {
      console.warn("⚠️ Moderation skipped - no API key");
      return {
        safe: true,
        categories: [],
        severity: 'low',
        originalText: text,
      };
    }

    try {
      console.log(`🛡️ Moderating text (${text.length} chars)...`);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.moderationModel,
          messages: [
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.0, // Deterministic moderation
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("❌ Moderation API error:", error);
        // Fail safe: allow content if moderation fails
        return {
          safe: true,
          categories: [],
          severity: 'low',
          originalText: text,
        };
      }

      const result = await response.json();
      const moderationResponse = result.choices[0]?.message?.content || "safe";

      // Llama Guard 3 returns "safe" or a list of violated categories
      const isSafe = moderationResponse.toLowerCase().includes("safe");
      const categories = this.extractCategories(moderationResponse);
      const severity = this.calculateSeverity(categories);

      console.log(`🛡️ Moderation result: ${isSafe ? 'SAFE' : 'UNSAFE'} (${categories.join(', ')})`);

      return {
        safe: isSafe,
        categories,
        severity,
        originalText: text,
        filteredText: isSafe ? undefined : await this.filterProfanity(text),
      };
    } catch (error: any) {
      console.error("❌ Moderation error:", error.message);
      // Fail safe: allow content if moderation fails
      return {
        safe: true,
        categories: [],
        severity: 'low',
        originalText: text,
      };
    }
  }

  /**
   * Filter profanity from text
   * Uses basic word replacement with asterisks
   */
  async filterProfanity(text: string): Promise<string> {
    // Common profanity patterns (battle rap context-aware)
    const profanityPatterns = [
      /\bf+u+c+k+\w*/gi,
      /\bs+h+i+t+\w*/gi,
      /\bb+i+t+c+h+\w*/gi,
      /\ba+s+s+h+o+l+e+\w*/gi,
      /\bc+u+n+t+\w*/gi,
      /\bd+a+m+n+\w*/gi,
      /\bh+e+l+l+\w*/gi,
    ];

    let filtered = text;
    
    for (const pattern of profanityPatterns) {
      filtered = filtered.replace(pattern, (match) => {
        // Keep first letter, replace rest with asterisks
        return match[0] + '*'.repeat(match.length - 1);
      });
    }

    return filtered;
  }

  /**
   * Extract violated categories from Llama Guard response
   */
  private extractCategories(response: string): string[] {
    const categories: string[] = [];
    const lowerResponse = response.toLowerCase();

    // Llama Guard 3 category mapping
    if (lowerResponse.includes("violence") || lowerResponse.includes("s1")) {
      categories.push("violence");
    }
    if (lowerResponse.includes("sexual") || lowerResponse.includes("s2")) {
      categories.push("sexual");
    }
    if (lowerResponse.includes("hate") || lowerResponse.includes("s3") || lowerResponse.includes("s13")) {
      categories.push("hate");
    }
    if (lowerResponse.includes("harassment") || lowerResponse.includes("s4")) {
      categories.push("harassment");
    }
    if (lowerResponse.includes("self-harm") || lowerResponse.includes("s5") || lowerResponse.includes("s11")) {
      categories.push("self-harm");
    }
    if (lowerResponse.includes("illegal") || lowerResponse.includes("s7") || lowerResponse.includes("s9")) {
      categories.push("illegal");
    }
    if (lowerResponse.includes("profanity") || lowerResponse.includes("s8")) {
      categories.push("profanity");
    }

    return categories;
  }

  /**
   * Calculate severity based on violated categories
   */
  private calculateSeverity(categories: string[]): 'low' | 'medium' | 'high' {
    if (categories.length === 0) return 'low';

    // High severity categories
    const highSeverity = ['violence', 'sexual', 'hate', 'self-harm', 'illegal'];
    if (categories.some(cat => highSeverity.includes(cat))) {
      return 'high';
    }

    // Medium severity
    if (categories.includes('harassment')) {
      return 'medium';
    }

    // Low severity (profanity only)
    return 'low';
  }

  /**
   * Check if moderation is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const groqModerationService = new GroqModerationService();
