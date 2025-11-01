import fetch from 'node-fetch';

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Hugging Face Inference API client for face swap
class HuggingFaceService {
  private apiKey: string;

  constructor() {
    if (!HUGGINGFACE_API_KEY) {
      console.warn('⚠️ HUGGINGFACE_API_KEY not set - Face swap features will use demo mode');
    }
    this.apiKey = HUGGINGFACE_API_KEY || '';
  }

  /**
   * Generate a face-swapped profile picture using Hugging Face inference
   * @param sourceImageUrl URL of the user's uploaded photo (their face)
   * @param targetImageUrl URL of the rapper template image to swap onto
   * @returns URL of the generated face-swapped image
   */
  async faceSwap(sourceImageUrl: string, targetImageUrl: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      // Download both images as buffers
      const [sourceResponse, targetResponse] = await Promise.all([
        fetch(sourceImageUrl),
        fetch(targetImageUrl),
      ]);

      if (!sourceResponse.ok || !targetResponse.ok) {
        throw new Error('Failed to download images');
      }

      const sourceBuffer = await sourceResponse.buffer();
      const targetBuffer = await targetResponse.buffer();

      // Call Hugging Face face-swap model
      const response = await fetch(
        'https://api-inference.huggingface.co/models/felixrosberg/face-swap',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: {
              source_image: sourceBuffer.toString('base64'),
              target_image: targetBuffer.toString('base64'),
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
      }

      // The response is the generated image
      const imageBuffer = await response.buffer();
      
      // Convert to base64 data URL for easy storage/display
      const base64Image = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Image}`;

    } catch (error: any) {
      console.error('🔴 Face swap error:', error);
      throw new Error(`Face swap failed: ${error.message}`);
    }
  }

  /**
   * Generate face-swapped profile picture with local file buffers
   * @param sourceBuffer Buffer of the user's uploaded photo
   * @param targetBuffer Buffer of the rapper template
   * @returns Data URL of the generated image
   */
  async faceSwapFromBuffers(sourceBuffer: Buffer, targetBuffer: Buffer): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/felixrosberg/face-swap',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: {
              source_image: sourceBuffer.toString('base64'),
              target_image: targetBuffer.toString('base64'),
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 HF API Error Response:', errorText);
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
      }

      const imageBuffer = await response.buffer();
      const base64Image = imageBuffer.toString('base64');
      
      console.log('✅ Face swap successful, image size:', imageBuffer.length, 'bytes');
      
      return `data:image/png;base64,${base64Image}`;

    } catch (error: any) {
      console.error('🔴 Face swap from buffers error:', error);
      throw new Error(`Face swap failed: ${error.message}`);
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const huggingFaceService = new HuggingFaceService();
