import { useAuth } from '../../context/AuthContext';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface Props {
  onManagePlan?: () => void;
}

export default function TokenBar({ onManagePlan }: Props) {
  const { usage, user } = useAuth();
  if (!usage || !user) return null;

  const { tokensUsed, tokensLimit, tokensRemaining, percentUsed, planLabel } = usage;
  const isLow = percentUsed >= 85;
  const isEmpty = tokensRemaining <= 0;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="hidden md:block text-right shrink-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-500">{planLabel} plan</p>
        <p className="text-xs text-gray-400">
          <span className={isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-accent-green'}>
            {formatTokens(tokensRemaining)}
          </span>
          {' left · '}
          {formatTokens(tokensUsed)} / {formatTokens(tokensLimit)}
        </p>
      </div>
      <div className="w-28 sm:w-36 shrink-0" title={`${tokensRemaining.toLocaleString()} tokens remaining`}>
        <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isEmpty ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-accent-green'
            }`}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5 text-center md:hidden">
          {formatTokens(tokensRemaining)} left
        </p>
      </div>
      {onManagePlan && (
        <button
          type="button"
          onClick={onManagePlan}
          className="text-xs px-2 py-1 rounded-md border border-surface-600 text-gray-400 hover:text-accent-green hover:border-accent-green/50 transition-colors shrink-0"
        >
          Plan
        </button>
      )}
    </div>
  );
}
