import axios from 'axios';
import { AIProvider, CompleteParams } from './types';
import {
  DEEPSEEK_API_BASE,
  DEEPSEEK_DEFAULT_MODEL,
  DEEPSEEK_MODELS,
} from '../../config/deepseek';

/**
 * DeepSeek provider — configured per official integration guides from:
 * https://github.com/deepseek-ai/awesome-deepseek-agent
 * API: https://api-docs.deepseek.com/
 */
export class DeepSeekProvider implements AIProvider {
  readonly name = 'deepseek';
  readonly model: string;

  constructor(
    private apiKey: string,
    model = process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL
  ) {
    if (!DEEPSEEK_MODELS.includes(model as (typeof DEEPSEEK_MODELS)[number])) {
      console.warn(
        `DEEPSEEK_MODEL="${model}" is not in the recommended list [${DEEPSEEK_MODELS.join(', ')}]. Proceeding anyway.`
      );
    }
    this.model = model;
  }

  async complete({ system, messages, maxTokens }: CompleteParams): Promise<string> {
    const payload = [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const { data } = await axios.post(
      `${DEEPSEEK_API_BASE}/chat/completions`,
      {
        model: this.model,
        messages: payload,
        max_tokens: maxTokens,
        temperature: 0.4,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 180_000,
      }
    );

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      const errMsg = data?.error?.message;
      throw new Error(errMsg || 'DeepSeek returned an empty response');
    }
    return text;
  }
}
