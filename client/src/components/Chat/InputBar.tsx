import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Zap, Sparkles, Cpu, ShieldCheck } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  isLoading: boolean;
  onQuickStart: (text: string) => void;
}

const quickStarts = [
  { label: 'E2E Web', icon: Zap, message: 'I want to create E2E web tests' },
  { label: 'Mobile', icon: Sparkles, message: 'I want to create mobile tests' },
  { label: 'API', icon: Cpu, message: 'I want to create API tests' },
  { label: 'Security', icon: ShieldCheck, message: 'I want to create security tests' },
];

export default function InputBar({ onSend, isLoading, onQuickStart }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 pb-2">
      <div className="flex flex-wrap gap-1.5 mb-3 px-1">
        {quickStarts.map((qs) => (
          <button
            key={qs.label}
            onClick={() => onQuickStart(qs.message)}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black bg-surface-900/40 hover:bg-surface-800 text-slate-500 hover:text-brand-500 rounded-lg border border-surface-600/20 disabled:opacity-50 transition-all uppercase tracking-widest"
          >
            <qs.icon size={10} />
            {qs.label}
          </button>
        ))}
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500/10 to-accent-info/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
        <div className="relative flex items-end gap-2 bg-surface-900/80 border border-surface-600/30 rounded-xl p-1.5 shadow-2xl focus-within:border-brand-500/40 transition-all">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent border-none rounded-lg px-3 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-0 disabled:opacity-50 min-h-[42px]"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !text.trim()}
            className={`p-2.5 rounded-lg transition-all duration-300 ${
              text.trim() 
                ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/20 scale-100' 
                : 'bg-surface-800 text-slate-700 scale-95 opacity-40'
            }`}
          >
            <Send size={16} className={text.trim() ? 'animate-in fade-in slide-in-from-left-2' : ''} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 px-1">
         <div className="flex items-center gap-3">
            <span className="text-[9px] text-slate-600 font-bold tracking-tight uppercase">
               <span className="text-slate-500">Enter</span> send
            </span>
            <span className="text-[9px] text-slate-600 font-bold tracking-tight uppercase">
               <span className="text-slate-500">Shift+Enter</span> line
            </span>
         </div>
         <span className="text-[9px] text-slate-700 font-mono font-bold tracking-tighter">{text.length} ch</span>
      </div>
    </div>
  );
}
