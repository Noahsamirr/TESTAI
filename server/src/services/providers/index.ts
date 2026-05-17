import { AnthropicProvider } from './anthropic';
import { DeepSeekProvider } from './deepseek';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
import { OllamaProvider } from './ollama';
import { PuterProvider } from './puter';
import { DEEPSEEK_PLATFORM_URL } from '../../config/deepseek';
import { AIProvider } from './types';

export type AIProviderName =
  | 'gemini'
  | 'gemeni'
  | 'deepseek'
  | 'puter'
  | 'groq'
  | 'ollama'
  | 'anthropic';

function normalizeEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/^["']|["']$/g, '').trim();
}

function isPlaceholder(value: string | undefined): boolean {
  const v = normalizeEnv(value);
  if (!v) return true;
  return (
    v.includes('your_') ||
    v.includes('_here') ||
    v === 'sk-ant-your-key-here'
  );
}

function env(name: string): string | undefined {
  return normalizeEnv(process.env[name]);
}

function resolveGeminiKey(): string | undefined {
  const gemini = env('GEMINI_API_KEY');
  if (!isPlaceholder(gemini)) return gemini;
  const puter = env('PUTER_AUTH_TOKEN');
  if (puter?.startsWith('AIza')) return puter;
  return undefined;
}

export function resolveProviderName(): AIProviderName {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === 'gemeni') return 'gemini';
  if (
    explicit === 'gemini' ||
    explicit === 'deepseek' ||
    explicit === 'puter' ||
    explicit === 'groq' ||
    explicit === 'ollama' ||
    explicit === 'anthropic'
  ) {
    return explicit as AIProviderName;
  }

  if (resolveGeminiKey()) return 'gemini';
  if (!isPlaceholder(env('DEEPSEEK_API_KEY'))) return 'deepseek';
  if (!isPlaceholder(env('PUTER_AUTH_TOKEN'))) return 'puter';
  if (!isPlaceholder(env('GROQ_API_KEY'))) return 'groq';
  if (!isPlaceholder(env('ANTHROPIC_API_KEY'))) return 'anthropic';
  return 'gemini';
}

export function createAIProvider(): AIProvider {
  const name = resolveProviderName();
  const effective = name === 'gemeni' ? 'gemini' : name;

  if (effective === 'gemini') {
    const key = resolveGeminiKey();
    if (!key) {
      throw new Error(
        'GEMINI_API_KEY is required for AI_PROVIDER=gemini. Get a key at https://aistudio.google.com/apikey'
      );
    }
    return new GeminiProvider(key);
  }

  if (effective === 'deepseek') {
    const key = env('DEEPSEEK_API_KEY');
    if (isPlaceholder(key)) {
      throw new Error(
        `DEEPSEEK_API_KEY is required. Get a key at ${DEEPSEEK_PLATFORM_URL}`
      );
    }
    return new DeepSeekProvider(key!);
  }

  if (effective === 'puter') {
    const token = env('PUTER_AUTH_TOKEN');
    if (isPlaceholder(token)) {
      throw new Error(
        'PUTER_AUTH_TOKEN is required. Get a token at https://puter.com/dashboard#account'
      );
    }
    return new PuterProvider(token!);
  }

  if (effective === 'groq') {
    const key = env('GROQ_API_KEY');
    if (isPlaceholder(key)) {
      throw new Error('GROQ_API_KEY is required. Get a free key at https://console.groq.com');
    }
    return new GroqProvider(key!);
  }

  if (effective === 'anthropic') {
    const key = env('ANTHROPIC_API_KEY');
    if (isPlaceholder(key)) {
      throw new Error('ANTHROPIC_API_KEY is required at https://console.anthropic.com');
    }
    return new AnthropicProvider(key!);
  }

  return new OllamaProvider();
}

export function getProviderSetupHint(): string {
  return [
    'Configure one AI provider in .env:',
    '  • gemini (recommended): GEMINI_API_KEY from https://aistudio.google.com/apikey',
    '  • deepseek: DEEPSEEK_API_KEY from https://platform.deepseek.com/api_keys',
    '  • puter: PUTER_AUTH_TOKEN from https://puter.com/dashboard#account',
    '  • groq: GROQ_API_KEY from https://console.groq.com',
    '  • ollama (local): AI_PROVIDER=ollama',
    '  • anthropic: ANTHROPIC_API_KEY from https://console.anthropic.com',
  ].join('\n');
}
