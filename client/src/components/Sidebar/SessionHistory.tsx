import { Plus, MessageSquare } from 'lucide-react';

interface Props {
  sessionId: string;
  onNewSession: () => void;
}

export default function SessionHistory({ sessionId, onNewSession }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</h3>
        <button
          onClick={onNewSession}
          className="p-1 hover:bg-surface-700 rounded transition-colors"
          title="New session"
        >
          <Plus size={14} className="text-accent-green" />
        </button>
      </div>

      <div className="bg-surface-700 border border-accent-green/30 rounded-lg p-3 cursor-pointer">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-accent-green" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">Current Session</p>
            <p className="text-xs text-gray-500 truncate font-mono">{sessionId.slice(0, 8)}...</p>
          </div>
        </div>
        <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-accent-green/10 text-accent-green rounded-full">
          Active
        </span>
      </div>
    </div>
  );
}
