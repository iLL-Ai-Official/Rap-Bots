import * as fs from "fs";
import * as path from "path";

export interface Attack {
  name: string;
  power: number;
  description: string;
  type: string;
}

export interface CharacterCardData {
  name: string;
  rapStyle: string;
  bio: string;
  attacks: Attack[];
  stats: {
    flow: number;
    wordplay: number;
    delivery: number;
    stage_presence: number;
  };
  generatedAt?: Date;
}

interface HuggingFaceInpaintRequest {
  inputs: {
    prompt: string;
    image: string; // base64 encoded
    mask_image?: string; // base64 encoded
  };
}

export class CharacterCardGenerator {
  private hfApiKey: string;
  private modelEndpoint = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-inpainting";

  constructor() {
    this.hfApiKey = process.env.HUGGINGFACE_API_KEY || "";
    if (!this.hfApiKey) {
      console.warn("⚠️ Hugging Face API key not found. Character card generation will be limited.");
    }
  }

  /**
   * Generate a Pokemon-parody character card for a user
   */
  async generateCharacterCard(
    userId: string,
    userName: string,
    userImageBuffer: Buffer,
    bio: string,
    rapStyle: string,
    userStats: { totalBattles: number; totalWins: number }
  ): Promise<{ cardUrl: string; cardData: CharacterCardData }> {
    try {
      console.log(`🎨 Generating character card for user ${userName}...`);

      // Generate attacks based on rap style and bio
      const attacks = this.generateAttacks(rapStyle, bio);

      // Generate stats based on battle history
      const stats = this.generateStats(userStats);

      // Create character card data
      const cardData: CharacterCardData = {
        name: userName,
        rapStyle,
        bio,
        attacks,
        stats,
        generatedAt: new Date(),
      };

      // Generate card image
      const cardImagePath = await this.generateCardImage(
        userId,
        userName,
        userImageBuffer,
        cardData
      );

      return {
        cardUrl: cardImagePath,
        cardData,
      };
    } catch (error) {
      console.error("Error generating character card:", error);
      throw new Error("Failed to generate character card");
    }
  }

  /**
   * Generate attacks based on rap style and bio
   */
  private generateAttacks(rapStyle: string, bio: string): Attack[] {
    const styleAttacks: Record<string, Attack[]> = {
      aggressive: [
        {
          name: "Lyrical Assault",
          power: 85,
          description: "Unleashes a barrage of devastating punchlines",
          type: "lyrical",
        },
        {
          name: "Battle Stance",
          power: 70,
          description: "Intimidating presence that weakens opponents",
          type: "flow",
        },
      ],
      smooth: [
        {
          name: "Silk Flow",
          power: 75,
          description: "Smooth wordplay that mesmerizes the crowd",
          type: "flow",
        },
        {
          name: "Clever Comeback",
          power: 80,
          description: "Witty response that catches opponents off guard",
          type: "punchline",
        },
      ],
      technical: [
        {
          name: "Multi-Syllabic Strike",
          power: 90,
          description: "Complex rhyme schemes that showcase technical prowess",
          type: "lyrical",
        },
        {
          name: "Flow Switch",
          power: 75,
          description: "Unexpected rhythm change that keeps opponents guessing",
          type: "flow",
        },
      ],
      default: [
        {
          name: "Mic Check",
          power: 70,
          description: "Classic rap attack with solid delivery",
          type: "lyrical",
        },
        {
          name: "Stage Presence",
          power: 65,
          description: "Commands attention with confident performance",
          type: "punchline",
        },
      ],
    };

    // Get attacks based on style, or use default
    const baseAttacks = styleAttacks[rapStyle.toLowerCase()] || styleAttacks.default;

    // Add a unique signature attack based on bio keywords
    const signatureAttack = this.generateSignatureAttack(bio);
    
    return [...baseAttacks, signatureAttack];
  }

  /**
   * Generate a unique signature attack based on bio
   */
  private generateSignatureAttack(bio: string): Attack {
    const keywords = bio.toLowerCase();
    
    if (keywords.includes("street") || keywords.includes("underground")) {
      return {
        name: "Street Cipher",
        power: 95,
        description: "Underground battle experience that devastates opponents",
        type: "lyrical",
      };
    } else if (keywords.includes("freestyle") || keywords.includes("improv")) {
      return {
        name: "Freestyle Fury",
        power: 88,
        description: "Improvised bars that adapt to any situation",
        type: "flow",
      };
    } else if (keywords.includes("wordplay") || keywords.includes("clever")) {
      return {
        name: "Double Entendre",
        power: 92,
        description: "Layers of meaning that leave opponents confused",
        type: "punchline",
      };
    } else {
      return {
        name: "Signature Flow",
        power: 80,
        description: "Unique style that defines this rapper",
        type: "flow",
      };
    }
  }

  /**
   * Generate stats based on battle history
   */
  private generateStats(userStats: { totalBattles: number; totalWins: number }) {
    const winRate = userStats.totalBattles > 0 
      ? (userStats.totalWins / userStats.totalBattles) * 100 
      : 50;

    // Base stats with scaling based on experience and win rate
    const experienceBonus = Math.min(userStats.totalBattles * 2, 30);
    const winRateBonus = Math.floor((winRate - 50) / 2);

    return {
      flow: Math.min(Math.max(60 + experienceBonus + winRateBonus, 40), 100),
      wordplay: Math.min(Math.max(55 + experienceBonus + winRateBonus, 40), 100),
      delivery: Math.min(Math.max(65 + experienceBonus + winRateBonus, 40), 100),
      stage_presence: Math.min(Math.max(58 + experienceBonus + winRateBonus, 40), 100),
    };
  }

  /**
   * Generate the actual card image using canvas/image manipulation
   */
  private async generateCardImage(
    userId: string,
    userName: string,
    userImageBuffer: Buffer,
    cardData: CharacterCardData
  ): Promise<string> {
    try {
      // For now, we'll use a simple approach without HF inpainting
      // Save user image and return path for frontend to handle card display
      const tempDir = path.join(process.cwd(), "temp_cards");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const timestamp = Date.now();
      const imagePath = path.join(tempDir, `card_${userId}_${timestamp}.png`);
      
      fs.writeFileSync(imagePath, userImageBuffer);

      // Return relative URL path
      const relativeUrl = `/api/character-cards/${userId}_${timestamp}.png`;
      
      console.log(`✅ Character card image saved: ${relativeUrl}`);
      return relativeUrl;
    } catch (error) {
      console.error("Error generating card image:", error);
      throw error;
    }
  }

  /**
   * Optional: Use Hugging Face inpainting to create stylized card
   */
  private async applyHuggingFaceInpainting(
    imageBuffer: Buffer,
    prompt: string
  ): Promise<Buffer> {
    if (!this.hfApiKey) {
      throw new Error("Hugging Face API key not configured");
    }

    try {
      const base64Image = imageBuffer.toString("base64");
      
      const response = await fetch(this.modelEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.hfApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {
            prompt: `Pokemon trading card style, ${prompt}, vibrant colors, professional card layout`,
            image: base64Image,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HF API error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const resultBuffer = Buffer.from(arrayBuffer);
      return resultBuffer;
    } catch (error) {
      console.error("Hugging Face inpainting error:", error);
      throw error;
    }
  }
}

export const characterCardGenerator = new CharacterCardGenerator();
