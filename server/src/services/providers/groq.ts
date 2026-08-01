import axios, { AxiosError } from 'axios';
import { AIProvider, CompleteParams } from './types';

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GroqProvider implements AIProvider {
  readonly name = 'groq';
  readonly model: string;

  constructor(
    private apiKey: string,
    model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  ) {
    this.model = model;
  }

  async complete({ system, messages, maxTokens }: CompleteParams): Promise<string> {
    const payload = [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { data } = await axios.post(
          `${GROQ_BASE}/chat/completions`,
          {
            model: this.model,
            messages: payload,
            max_tokens: maxTokens,
            temperature: 0.4,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 120_000,
          }
        );

        const text = data?.choices?.[0]?.message?.content;
        if (!text) {
          throw new Error('Groq returned an empty response');
        }
        return text;
      } catch (err) {
        const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
        const status = axiosErr.response?.status;
        if (status === 429 && attempt < MAX_RETRIES - 1) {
          const retryAfter = parseInt(String(axiosErr.response?.headers?.['retry-after'] || '5'), 10);
          await sleep(Math.min(retryAfter, 30) * 1000);
          continue;
        }
        const msg = axiosErr.response?.data?.error?.message || axiosErr.message;
        lastError = new Error(
          status === 429
            ? `Groq rate limit reached. Wait a moment and try again, or switch AI_PROVIDER to gemini in .env. (${msg})`
            : `Groq API error: ${msg}`
        );
        break;
      }
    }

    throw lastError || new Error('Groq request failed');
  }
}
