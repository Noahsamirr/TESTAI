import { GoogleGenAI } from "@google/genai";
import { AIProvider, CompleteParams } from './types';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly model: string;
  private client: any;

  constructor(
    private apiKey: string,
    model = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
  ) {
    this.model = model;
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async complete({ system, messages, maxTokens }: CompleteParams): Promise<string> {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          maxOutputTokens: maxTokens,
          // Thinking is enabled by default in 3.5 Flash, setting to MEDIUM as recommended
          thinkingConfig: {
            thinkingLevel: "MEDIUM",
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Gemini returned an empty response');
      }
      return text;
    } catch (err: unknown) {
      // Basic error handling for the new SDK
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('429')) {
        throw new Error(
          `Gemini API rate limit (429): ${errorMessage}. Wait a few minutes, check quota at https://aistudio.google.com/, or enable billing.`
        );
      }
      throw err;
    }
  }
}
