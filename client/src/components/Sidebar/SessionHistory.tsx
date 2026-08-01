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
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95"
      >
        <Plus size={14} />
        New Chat
      </button>

      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg max-w-[180px]">
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-100 text-indigo-600">
           <MessageSquare size={12} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-700 truncate leading-tight">Session</p>
          <p className="text-[9px] text-slate-500 truncate font-mono tracking-tighter leading-tight">{sessionId.slice(0, 12)}</p>
        </div>
      </div>
    </div>
  );
}
