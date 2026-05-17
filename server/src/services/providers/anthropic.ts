import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, CompleteParams } from './types';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private client: Anthropic;

  constructor(
    apiKey: string,
    model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  ) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete({ system, messages, maxTokens }: CompleteParams): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const block = response.content[0];
    if (block?.type !== 'text') {
      throw new Error('Anthropic returned a non-text response');
    }
    return block.text;
  }
}
