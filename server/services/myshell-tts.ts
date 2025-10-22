import fs from 'fs';
import path from 'path';

export interface MyShellTTSOptions {
  apiKey: string;
  voiceCloning?: boolean;
}

export class MyShellTTSService {
  private apiKey: string;
  private outputDir: string;
  private voiceCloning: boolean;
  private baseUrl = 'https://api.myshell.ai/v1';

  constructor(options: MyShellTTSOptions) {
    this.apiKey = options.apiKey;
    this.voiceCloning = options.voiceCloning || false;
    
    this.outputDir = path.join(process.cwd(), 'temp_audio');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private getVoiceForCharacter(characterId: string, gender: string = 'male'): string {
    // MyShell AI voice IDs optimized for rap battle characters
    const voiceMap: Record<string, string> = {
      'razor': 'myshell-female-sharp',
      'venom': 'myshell-male-intense', 
      'silk': 'myshell-male-smooth',
      'cypher': 'myshell-robot-deep',
    };

    return voiceMap[characterId] || (gender === 'female' ? 'myshell-female-default' : 'myshell-male-default');
  }

  async generateTTS(
    text: string,
    characterId: string,
    options: {
      voiceStyle?: 'aggressive' | 'confident' | 'smooth' | 'intense' | 'playful';
      characterName?: string;
      gender?: string;
      speedMultiplier?: number;
      voiceSample?: Buffer; // For voice cloning
    } = {}
  ): Promise<{ audioUrl: string; duration: number }> {
    console.log(`🎤 MyShell AI TTS generating for ${characterId}: "${text.substring(0, 50)}..."`);
    
    try {
      const voice = this.getVoiceForCharacter(characterId, options.gender);
      const speed = options.speedMultiplier || 1.0;
      
      console.log(`🚀 Using MyShell AI voice: ${voice} with speed: ${speed}x`);
      
      // Clean text for better TTS
      const cleanText = text
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\*.*?\*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Prepare request payload
      const requestBody: any = {
        text: cleanText,
        voice_id: voice,
        speed: speed,
        output_format: 'mp3',
      };

      // Add voice cloning if sample provided
      if (this.voiceCloning && options.voiceSample) {
        requestBody.voice_clone = {
          enabled: true,
          sample: options.voiceSample.toString('base64'),
        };
        console.log(`🎭 MyShell AI: Voice cloning enabled for ${characterId}`);
      }

      // Make API request to MyShell AI
      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`MyShell AI API error: ${response.status} - ${error}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      const timestamp = Date.now();
      const filename = `myshell_tts_${characterId}_${timestamp}.mp3`;
      const outputPath = path.join(this.outputDir, filename);

      fs.writeFileSync(outputPath, audioBuffer);

      console.log(`✅ MyShell AI TTS success: ${audioBuffer.length} bytes`);

      // Convert to base64 for immediate use
      const base64Audio = audioBuffer.toString('base64');
      const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

      // Estimate duration based on text length and speed
      const duration = Math.floor(cleanText.length / (15 * speed));

      return {
        audioUrl,
        duration
      };

    } catch (error: any) {
      console.error(`❌ MyShell AI TTS failed for ${characterId}:`, error.message);
      throw new Error(`MyShell AI TTS generation failed: ${error.message}`);
    }
  }

  // Clone a voice from audio sample
  async cloneVoice(audioSample: Buffer, voiceName: string): Promise<string> {
    console.log(`🎭 MyShell AI: Cloning voice "${voiceName}"...`);
    
    try {
      const response = await fetch(`${this.baseUrl}/voice-clone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: voiceName,
          sample: audioSample.toString('base64'),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`MyShell AI voice clone error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log(`✅ MyShell AI: Voice cloned successfully as "${result.voice_id}"`);
      
      return result.voice_id;
    } catch (error: any) {
      console.error(`❌ MyShell AI voice cloning failed:`, error.message);
      throw new Error(`Voice cloning failed: ${error.message}`);
    }
  }

  // Test if the API key works
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Test connection',
          voice_id: 'myshell-male-default',
          output_format: 'mp3',
        }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('MyShell AI TTS test failed:', error);
      return false;
    }
  }
}

// Factory function for creating MyShell AI TTS instances
export function createMyShellTTS(apiKey: string, voiceCloning: boolean = false): MyShellTTSService {
  return new MyShellTTSService({ apiKey, voiceCloning });
}
