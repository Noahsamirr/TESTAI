import axios from 'axios';
import { AIProvider, CompleteParams } from './types';

const GROQ_BASE = 'https://api.groq.com/openai/v1';

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
  }
}
