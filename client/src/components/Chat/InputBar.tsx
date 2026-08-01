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
    <div className="max-w-3xl mx-auto w-full px-2">
      <div className="flex flex-wrap gap-1.5 mb-2.5 px-1">
        {quickStarts.map((qs) => (
          <button
            key={qs.label}
            onClick={() => onQuickStart(qs.message)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200/60 disabled:opacity-50 transition-all shadow-sm"
          >
            <qs.icon size={11} className="text-indigo-600" />
            {qs.label}
          </button>
        ))}
      </div>

      <div className="relative group">
        <div className="relative flex items-end gap-2 bg-white border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl p-2 shadow-md transition-all">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Type your testing goal or ask a question..."
            rows={1}
            className="flex-1 resize-none bg-transparent border-none px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 disabled:opacity-50 min-h-[40px]"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !text.trim()}
            className={`p-2.5 rounded-xl transition-all ${
              text.trim() 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30' 
                : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
            }`}
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 px-2 text-[10px] text-slate-500 font-medium">
         <span>Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono">Enter</kbd> to send</span>
         <span className="font-mono text-slate-500">{text.length} chars</span>
      </div>
    </div>
  );
}
