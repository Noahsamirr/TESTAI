export type PlanId = 'free' | 'pro' | 'team';

export interface Plan {
  id: PlanId;
  label: string;
  monthlyTokens: number;
  priceLabel: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    label: 'Free',
    monthlyTokens: 10_000,
    priceLabel: '$0/mo',
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthlyTokens: 100_000,
    priceLabel: '$19/mo',
  },
  team: {
    id: 'team',
    label: 'Team',
    monthlyTokens: 500_000,
    priceLabel: '$49/mo',
  },
};

export function getPlan(planId: string): Plan {
  if (planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.free;
}
