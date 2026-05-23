import { Plus, MessageSquare, History } from 'lucide-react';

interface Props {
  sessionId: string;
  onNewSession: () => void;
}

export default function SessionHistory({ sessionId, onNewSession }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onNewSession}
        className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-black rounded-lg text-xs font-bold hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/20 active:scale-95"
      >
        <Plus size={14} />
        New Chat
      </button>

      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-800 border border-surface-600/50 rounded-lg max-w-[180px]">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-500/10 text-brand-500">
           <MessageSquare size={12} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-300 truncate">Session</p>
          <p className="text-[9px] text-slate-500 truncate font-mono tracking-tighter">{sessionId.slice(0, 12)}</p>
        </div>
      </div>
    </div>
  );
}
