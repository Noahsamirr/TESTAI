import { v4 as uuidv4 } from 'uuid';
import { getPlan } from '../config/plans';
import { getUserById, getMonthlyTokenUsage, recordTokenUsage } from '../db/authQueries';

export interface TokenUsageSummary {
  plan: string;
  planLabel: string;
  priceLabel: string;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  percentUsed: number;
  periodStart: string;
  periodEnd: string;
}

export function estimateTokens(input: string, output: string): number {
  const chars = input.length + output.length;
  return Math.max(100, Math.ceil(chars / 4));
}

export function getCurrentBillingPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getUsageSummary(userId: string): TokenUsageSummary {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found');

  const plan = getPlan(user.plan);
  const { start, end } = getCurrentBillingPeriod();
  const tokensUsed = getMonthlyTokenUsage(userId, start);
  const tokensLimit = plan.monthlyTokens;
  const tokensRemaining = Math.max(0, tokensLimit - tokensUsed);
  const percentUsed = tokensLimit > 0 ? Math.min(100, Math.round((tokensUsed / tokensLimit) * 100)) : 0;

  return {
    plan: plan.id,
    planLabel: plan.label,
    priceLabel: plan.priceLabel,
    tokensUsed,
    tokensLimit,
    tokensRemaining,
    percentUsed,
    periodStart: start,
    periodEnd: end,
  };
}

export function assertHasTokens(userId: string, estimated: number): void {
  const summary = getUsageSummary(userId);
  if (summary.tokensRemaining < estimated) {
    throw new Error(
      `Monthly token limit reached (${summary.tokensUsed.toLocaleString()} / ${summary.tokensLimit.toLocaleString()} used). Upgrade your plan to continue.`
    );
  }
}

export function consumeTokens(
  userId: string,
  tokens: number,
  action: string
): TokenUsageSummary {
  assertHasTokens(userId, tokens);
  recordTokenUsage(uuidv4(), userId, tokens, action);
  return getUsageSummary(userId);
}
