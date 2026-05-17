export type PlanId = 'free' | 'pro' | 'team';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: PlanId;
  createdAt: string;
}

export interface TokenUsage {
  plan: PlanId;
  planLabel: string;
  priceLabel: string;
  tokensUsed: number;
  tokensLimit: number;
  tokensRemaining: number;
  percentUsed: number;
  periodStart: string;
  periodEnd: string;
}

export interface PlanInfo {
  id: PlanId;
  label: string;
  monthlyTokens: number;
  priceLabel: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  usage: TokenUsage;
}
