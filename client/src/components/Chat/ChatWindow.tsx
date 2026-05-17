import { useEffect, useRef } from 'react';
import { Message } from '../../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

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
    <div className="flex-1 overflow-y-auto py-4">
      {showWelcome && (
        <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
          <h2 className="text-xl font-semibold text-accent-green mb-2">TestMind</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md leading-relaxed">
            Describe what you want to test, or choose a starting point below. I will remember what you share as we go.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'I want to create E2E web tests',
              'I want to create mobile tests',
              'I want to create API tests',
              'I want to create performance tests',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => onQuickStart(prompt)}
                className="px-3 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-accent-green border border-surface-600 rounded-full transition-colors"
              >
                {prompt.replace('I want to create ', '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
