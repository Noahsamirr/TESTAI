import axios from 'axios';
import { AIProvider, CompleteParams } from './types';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly model: string;

  constructor(
    private apiKey: string,
    model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  ) {
    this.model = model;
  }

  async complete({ system, messages, maxTokens }: CompleteParams): Promise<string> {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    try {
      const { data } = await axios.post(
        `${GEMINI_BASE}/models/${this.model}:generateContent`,
        {
          ...(system
            ? { systemInstruction: { parts: [{ text: system }] } }
            : {}),
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.35,
          },
        },
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 180_000,
        }
      );

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const msg = data?.error?.message || 'Gemini returned an empty response';
        throw new Error(msg);
      }
      return text;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        const detail =
          (err.response.data as { error?: { message?: string } })?.error?.message ||
          'Gemini rate limit exceeded';
        throw new Error(
          `Gemini API rate limit (429): ${detail}. Wait a few minutes, check quota at https://aistudio.google.com/, or enable billing.`
        );
      }
      throw err;
    }
  }
}
