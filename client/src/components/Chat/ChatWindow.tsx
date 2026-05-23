import { useEffect, useRef } from 'react';
import { Message } from '../../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { Bot, Sparkles, MessageSquare, Zap, ShieldCheck, Cpu } from 'lucide-react';

interface Props {
  messages: Message[];
  isLoading: boolean;
  onQuickStart: (text: string) => void;
}

export default function ChatWindow({ messages, isLoading, onQuickStart }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const showWelcome = messages.length <= 1;

  return (
    <div className="min-h-full py-6 px-4">
      {showWelcome && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in duration-700">
          <div className="w-16 h-16 rounded-[2rem] bg-brand-500 flex items-center justify-center mb-6 shadow-2xl shadow-brand-500/20 group hover:rotate-12 transition-transform duration-500">
             <Bot size={32} className="text-black" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight italic">TestMind AI</h2>
          <p className="text-slate-500 text-sm mb-10 max-w-md leading-relaxed font-medium">
            Your senior QA partner for automated testing. Describe your scenario, and I'll generate test cases, scripts, and reports.
          </p>
          
          <div className="grid grid-cols-2 gap-2.5 max-w-lg w-full">
            {[
              { text: 'E2E web tests', icon: Zap, prompt: 'I want to create E2E web tests' },
              { text: 'Mobile tests', icon: Sparkles, prompt: 'I want to create mobile tests' },
              { text: 'API testing', icon: Cpu, prompt: 'I want to create API tests' },
              { text: 'Performance', icon: ShieldCheck, prompt: 'I want to create performance tests' },
            ].map((item) => (
              <button
                key={item.text}
                onClick={() => onQuickStart(item.prompt)}
                className="group flex items-center gap-2.5 px-4 py-3 bg-surface-900/50 hover:bg-surface-800 text-slate-400 hover:text-brand-500 border border-surface-600/30 rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:border-brand-500/20"
              >
                <div className="p-1.5 rounded-lg bg-surface-800 group-hover:bg-brand-500/10 transition-colors">
                  <item.icon size={14} className="group-hover:animate-pulse" />
                </div>
                <span className="text-xs font-bold tracking-tight">{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-1.5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {isLoading && (
        <div className="max-w-3xl mx-auto px-4 py-3">
          <TypingIndicator />
        </div>
      )}
      <div ref={bottomRef} className="h-2" />
    </div>
  );
}
