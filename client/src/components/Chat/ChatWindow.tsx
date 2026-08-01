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
    <div className="min-h-full py-4 px-4">
      {showWelcome && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in duration-500">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center mb-5 shadow-xl shadow-orange-500/25">
             <Bot size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">How can TestMind AI assist your testing today?</h2>
          <p className="text-slate-500 text-xs mb-8 max-w-sm leading-relaxed">
            I can plan structured test suites, write automation scripts, run tests, and generate execution reports.
          </p>
          
          <div className="grid grid-cols-2 gap-3 max-w-md w-full">
            {[
              { text: 'E2E Web Test Suite', icon: Zap, prompt: 'Generate an E2E Playwright test suite for my web app' },
              { text: 'Mobile App Tests', icon: Sparkles, prompt: 'Create Appium test scenarios for mobile testing' },
              { text: 'API Integration Test', icon: Cpu, prompt: 'Write Axios/Jest API integration test cases' },
              { text: 'Security DAST Audit', icon: ShieldCheck, prompt: 'Perform a security DAST & header vulnerability audit' },
            ].map((item) => (
              <button
                key={item.text}
                onClick={() => onQuickStart(item.prompt)}
                className="tm-card p-3.5 flex items-center gap-2.5 text-left hover:border-indigo-500/40 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <item.icon size={15} />
                </div>
                <span className="text-xs font-semibold text-slate-800">{item.text}</span>
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
