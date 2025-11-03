import { nanoid } from "nanoid";

export interface FineTuningJob {
  id: string;
  name: string;
  base_model: string;
  type: string;
  input_file_id: string;
  created_at: number;
  fine_tuned_model?: string;
  status?: string;
}

export interface RapTrainingData {
  prompt: string;
  completion: string;
  difficulty: "easy" | "normal" | "hard";
  style: string;
  rhyme_scheme?: string;
}

export class FineTuningService {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/v1";

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || "";
    // Allow service to initialize without API key for development/testing
    // Fine-tuning operations will fail gracefully when API key is missing
  }

  // Check if fine-tuning is available
  async checkFineTuningAccess(): Promise<{ available: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/fine_tunings`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 403 || response.status === 401) {
        const error = await response.json();
        if (error.error?.code === "not_available_for_plan") {
          return {
            available: false,
            message: "Fine-tuning is in closed beta. Contact Groq for access."
          };
        }
      }

      if (response.ok) {
        return {
          available: true,
          message: "Fine-tuning access confirmed"
        };
      }

      return {
        available: false,
        message: `Unknown error: ${response.statusText}`
      };
    } catch (error) {
      return {
        available: false,
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // List all fine-tuning jobs (when access is available)
  async listFineTunings(): Promise<FineTuningJob[]> {
    const response = await fetch(`${this.baseUrl}/fine_tunings`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list fine-tunings: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  }

  // Create a new fine-tuning job
  async createFineTuning(params: {
    name: string;
    input_file_id: string;
    base_model?: string;
    type?: string;
  }): Promise<FineTuningJob> {
    const requestBody = {
      name: params.name,
      input_file_id: params.input_file_id,
      base_model: params.base_model || "llama-3.1-8b-instant",
      type: params.type || "lora",
    };

    const response = await fetch(`${this.baseUrl}/fine_tunings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create fine-tuning: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result.data;
  }

  // Get specific fine-tuning job
  async getFineTuning(id: string): Promise<FineTuningJob> {
    // SECURITY: Validate ID format to prevent URL injection
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('Invalid fine-tuning job ID format');
    }

    const response = await fetch(`${this.baseUrl}/fine_tunings/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get fine-tuning: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  // Delete a fine-tuning job
  async deleteFineTuning(id: string): Promise<{ id: string; object: string; deleted: boolean }> {
    const response = await fetch(`${this.baseUrl}/fine_tunings/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete fine-tuning: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  // Upload training data file (requires file upload endpoint)
  async uploadTrainingFile(trainingData: RapTrainingData[]): Promise<string> {
    // Convert training data to JSONL format for fine-tuning
    const jsonlData = trainingData.map(item => JSON.stringify({
      messages: [
        {
          role: "user",
          content: `Create a ${item.difficulty} difficulty rap response to: "${item.prompt}". Style: ${item.style}${item.rhyme_scheme ? `. Rhyme scheme: ${item.rhyme_scheme}` : ''}`
        },
        {
          role: "assistant",
          content: item.completion
        }
      ]
    })).join('\n');

    const formData = new FormData();
    const blob = new Blob([jsonlData], { type: 'application/json' });
    formData.append('file', blob, 'rap_training_data.jsonl');
    formData.append('purpose', 'fine-tune');

    const response = await fetch(`${this.baseUrl}/files`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result.id;
  }

  // Generate sample training data for rap fine-tuning
  generateSampleRapData(): RapTrainingData[] {
    return [
      {
        prompt: "Drop some bars about overcoming challenges",
        completion: "Started from the bottom, now I'm climbing every mountain peak\nEvery obstacle I face just makes my spirit antique\nThey said I couldn't make it, but I turned their doubt to fuel\nNow I'm breaking every barrier, rewriting every rule\nChallenges ain't roadblocks, they're stepping stones to greatness\nEvery setback's a setup for my ultimate amazingness",
        difficulty: "normal",
        style: "motivational",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about technology and the future",
        completion: "Digital revolution, I'm the architect of code\nArtificial intelligence walking down this cyber road\nQuantum computing power in the palm of my hand\nBuilding virtual empires across this digital land\nFuture's here today, don't need to wait for tomorrow\nTechnology's my weapon, innovation's what I borrow",
        difficulty: "normal",
        style: "futuristic",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Battle rap response to someone challenging you",
        completion: "You think you can step to me? That's your first mistake\nMy lyrical precision leaves your reputation fake\nEvery bar I spit is like a surgical incision\nCutting through your weak flows with mathematical precision\nYou brought a water gun to this nuclear war zone\nWhen I'm done with you, you'll be crying all alone",
        difficulty: "hard",
        style: "aggressive",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Freestyle about success and ambition",
        completion: "Vision crystal clear like I'm looking through a lens\nSuccess ain't a destination, it's a journey that never ends\nAmbition in my DNA, can't nobody hold me back\nTurning every single setback into a comeback track\nRising to the top like smoke from a fire\nEvery goal that I achieve just takes me higher and higher",
        difficulty: "easy",
        style: "inspirational",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about street life and authenticity",
        completion: "Real recognize real, that's the code of the street\nAuthenticity's my currency, never face defeat\nGrew up in the struggle, had to hustle for my dreams\nNow I'm painting vivid pictures with these lyrical scenes\nStay true to yourself, that's the lesson I learned\nEvery bridge I ever crossed, I never let it burn",
        difficulty: "normal",
        style: "street",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about love and relationships",
        completion: "Love's like a melody that plays inside my soul\nTwo hearts beating together, making each other whole\nThrough stormy nights and sunny days we stand as one\nBuilding dreams together, watching our love grow\nEvery moment shared becomes a precious memory\nLove's the greatest gift, the ultimate victory",
        difficulty: "easy",
        style: "romantic",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Drop bars about social justice and equality",
        completion: "Equality's the foundation, justice is the key\nBreaking down the barriers so everyone can be free\nNo more discrimination, no more hate in the streets\nStanding up for the oppressed, giving power to the meek\nChange starts with awareness, action follows the call\nTogether we rise up, breaking down every wall",
        difficulty: "normal",
        style: "conscious",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about partying and having fun",
        completion: "Turn up the music, let the bass hit your chest\nParty all night long, this is the ultimate test\nDancing in the crowd, feeling the rhythm flow\nLights flashing bright, putting on the greatest show\nFriends by my side, memories we'll create\nThis party's legendary, don't underestimate",
        difficulty: "easy",
        style: "party",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Tell a story about a journey or adventure",
        completion: "Started on the road less traveled, with nothing but my dreams\nFacing unknown territories, crossing raging streams\nMountains stood before me, but I climbed them anyway\nThrough the darkest valleys, I found my own way\nEvery twist and turn taught me something new\nThis journey's my story, and it's completely true",
        difficulty: "normal",
        style: "storytelling",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about money and wealth",
        completion: "Paper chasing dreams, stacking that green every day\nBuilding empires from the ground up, finding my own way\nFinancial freedom's the goal, no more living in debt\nSmart investments and hustle, that's the winning bet\nWealth ain't just about money, it's about peace of mind\nWorking hard for the future, leaving struggles behind",
        difficulty: "normal",
        style: "boombap",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Drop some bars about mental health and wellness",
        completion: "Mind over matter, that's the battle I fight every day\nPushing through the darkness, finding my own way\nMental health matters, break the stigma and shame\nSpeaking out loud, no longer playing that game\nSelf-care is essential, taking time for my soul\nHealing from within, becoming completely whole",
        difficulty: "normal",
        style: "conscious",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about family and heritage",
        completion: "Roots run deep like the oldest oak tree\nFamily's my foundation, where I learned to be free\nHeritage flows through my veins, stories passed down through time\nAncestors watching over me, their wisdom becomes mine\nBlood thicker than water, that's the unbreakable bond\nFamily's my fortress, where I truly belong",
        difficulty: "easy",
        style: "traditional",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Battle rap against someone who thinks they're better than you",
        completion: "You claim you're the best, but you're just full of hot air\nMy skills are unmatched, you're not even in the same tier\nEvery word you spit lands flat, no impact whatsoever\nI'm the lyrical assassin, you're just a beginner\nStep back from the mic, you don't belong in this game\nI'm the champion here, remember my name",
        difficulty: "hard",
        style: "diss",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about nature and the environment",
        completion: "Mother Earth is calling, can you hear her cry?\nPollution and destruction reaching for the sky\nSave our oceans, protect our forests and lands\nClimate change is real, we must make our stand\nEvery species matters, from the smallest to the grand\nPreserve our planet, that's the master plan",
        difficulty: "normal",
        style: "conscious",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Drop bars about creativity and art",
        completion: "Creativity flows like a river through my mind\nPainting pictures with words, leaving reality behind\nArt is my expression, my voice in the crowd\nBreaking through the silence, speaking loud and proud\nImagination's my playground, where dreams come alive\nThrough art I create worlds, keeping my spirit alive",
        difficulty: "easy",
        style: "artistic",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about education and learning",
        completion: "Knowledge is power, education's the key\nUnlocking potential, setting your mind free\nBooks are my weapons, wisdom's my shield\nLearning every day, never surrender the field\nFrom classroom to street, spreading knowledge around\nEducation changes everything, that's the truth I have found",
        difficulty: "normal",
        style: "educational",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Freestyle about dreams and aspirations",
        completion: "Dreams are the blueprints for the life I create\nAspirations burning bright, refusing to wait\nChasing stars in the night sky, reaching for the top\nEvery goal I achieve makes the journey non-stop\nVision becomes reality when you believe and pursue\nDreams aren't just wishes, they're the things I do",
        difficulty: "easy",
        style: "motivational",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about friendship and loyalty",
        completion: "Ride or die relationships, that's the code we live by\nFriends through thick and thin, keeping dreams alive\nLoyalty's my currency, trust is what we build\nStanding by each other when the going gets real\nBrotherhood and sisterhood, stronger than steel\nFriends are my family, that's the way I feel",
        difficulty: "normal",
        style: "loyalty",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Drop some bars about time and aging",
        completion: "Time keeps ticking, never slowing down its pace\nAging is a journey, putting wisdom on my face\nEvery year brings lessons, every moment counts\nMemories accumulate, life is what amounts\nGrowing older gracefully, embracing every phase\nTime is precious, that's why I seize the days",
        difficulty: "normal",
        style: "reflective",
        rhyme_scheme: "AABBCC"
      },
      {
        prompt: "Rap about sports and competition",
        completion: "On the field of battle, giving everything I've got\nCompetition drives me harder, hitting every spot\nTraining through the pain, pushing past my limits\nVictory tastes sweeter when you've earned it with commitment\nChampions are made in practice, not just in the game\nSports teach life lessons, that's the ultimate aim",
        difficulty: "normal",
        style: "sports",
        rhyme_scheme: "AABBCC"
      }
    ];
  }

  // Export training data as JSONL for external fine-tuning
  exportTrainingDataAsJSONL(trainingData: RapTrainingData[]): string {
    return trainingData.map(item => JSON.stringify({
      messages: [
        {
          role: "user", 
          content: `Create a ${item.difficulty} difficulty rap response to: "${item.prompt}". Style: ${item.style}${item.rhyme_scheme ? `. Rhyme scheme: ${item.rhyme_scheme}` : ''}`
        },
        {
          role: "assistant",
          content: item.completion
        }
      ]
    })).join('\n');
  }
}