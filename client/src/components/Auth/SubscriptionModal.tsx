import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { PlanId } from '../../types/auth';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({ open, onClose }: Props) {
  const { user, usage, plans, subscribe } = useAuth();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSelect = async (planId: PlanId) => {
    setError('');
    setLoading(planId);
    try {
      await subscribe(planId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change plan');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg bg-surface-800 border border-surface-600 rounded-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-300"
        >
          <X size={18} />
        </button>
        <h2 className="text-lg font-semibold text-accent-green mb-1">Subscription plans</h2>
        <p className="text-sm text-gray-500 mb-6">
          Current: <span className="text-gray-300">{usage?.planLabel ?? user?.plan}</span>
          {' · '}
          {usage?.tokensRemaining.toLocaleString()} tokens left this month
        </p>
        <div className="space-y-3">
          {plans.map((plan) => {
            const isCurrent = user?.plan === plan.id;
            return (
              <div
                key={plan.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  isCurrent ? 'border-accent-green/50 bg-accent-green/5' : 'border-surface-600'
                }`}
              >
                <div>
                  <p className="font-medium">{plan.label}</p>
                  <p className="text-xs text-gray-500">
                    {plan.monthlyTokens.toLocaleString()} tokens/mo · {plan.priceLabel}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isCurrent || loading !== null}
                  onClick={() => handleSelect(plan.id)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-accent-green text-surface-900 font-medium disabled:opacity-40"
                >
                  {loading === plan.id ? '…' : isCurrent ? 'Current' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
        <p className="text-xs text-gray-600 mt-4">Demo billing — plans switch instantly for testing.</p>
      </div>
    </div>
  );
}
