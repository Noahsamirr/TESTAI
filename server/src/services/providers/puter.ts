import { AIProvider, CompleteParams } from './types';

// Puter.js ships init via CJS; server compiles as commonjs
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { init } = require('@heyputer/puter.js/src/init.cjs') as {
  init: (token: string) => PuterClient;
};

interface PuterClient {
  ai: {
    chat(
      prompt: string | PuterMessage[],
      testMode?: boolean,
      options?: PuterChatOptions
    ): Promise<PuterChatResponse>;
  };
}

interface PuterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PuterChatOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

interface PuterChatResponse {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

function extractPuterText(response: PuterChatResponse): string {
  const content = response?.message?.content;
  if (!content) {
    throw new Error('Puter returned an empty response');
  }
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === 'string' ? part : part?.text ?? ''))
      .join('')
      .trim();
    if (text) return text;
  }
  if (typeof (content as { toString?: () => string }).toString === 'function') {
    const text = (content as { toString: () => string }).toString().trim();
    if (text) return text;
  }
  throw new Error('Puter returned an empty response');
}

export class PuterProvider implements AIProvider {
  readonly name = 'puter';
  readonly model: string;
  private client: PuterClient;

  constructor(
    authToken: string,
    model = process.env.PUTER_MODEL || 'claude-sonnet-4-6'
  ) {
    this.model = model;
    this.client = init(authToken);
  }

  async complete({ system, messages, maxTokens }: CompleteParams): Promise<string> {
    const puterMessages: PuterMessage[] = [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await this.client.ai.chat(puterMessages, false, {
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0.4,
    });

    return extractPuterText(response);
  }
}
