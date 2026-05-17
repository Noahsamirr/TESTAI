/**
 * DeepSeek integration constants aligned with:
 * https://github.com/deepseek-ai/awesome-deepseek-agent
 * (WorkBuddy / OpenCode / Claude Code guides)
 */

export const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

/** Models documented in awesome-deepseek-agent integration guides */
export const DEEPSEEK_MODELS = [
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'deepseek-chat',
  'deepseek-reasoner',
] as const;

export type DeepSeekModelId = (typeof DEEPSEEK_MODELS)[number];

export const DEEPSEEK_DEFAULT_MODEL: DeepSeekModelId = 'deepseek-v4-pro';

export const AWESOME_DEEPSEEK_AGENT_REPO =
  'https://github.com/deepseek-ai/awesome-deepseek-agent';

export const DEEPSEEK_PLATFORM_URL = 'https://platform.deepseek.com/api_keys';
