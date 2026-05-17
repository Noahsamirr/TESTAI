import axios from 'axios';
import { AIProvider, CompleteParams } from './types';

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  readonly model: string;

  constructor(
    private baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model = process.env.OLLAMA_MODEL || 'llama3.2'
  ) {
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async complete({ system, messages, maxTokens }: CompleteParams): Promise<string> {
    const payload = [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const { data } = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: this.model,
        messages: payload,
        stream: false,
        options: { num_predict: maxTokens },
      },
      { timeout: 300_000 }
    );

    const text = data?.message?.content;
    if (!text) {
      throw new Error(
        'Ollama returned an empty response. Is Ollama running? Try: ollama pull llama3.2'
      );
    }
    return text;
  }
}
