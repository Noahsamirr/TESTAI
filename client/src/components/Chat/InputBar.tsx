import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  isLoading: boolean;
  onQuickStart: (text: string) => void;
}

const quickStarts = [
  { label: 'E2E Web Test', message: 'I want to create E2E web tests' },
  { label: 'Mobile Test', message: 'I want to create mobile tests' },
  { label: 'API Test', message: 'I want to create API tests' },
  { label: 'Performance Test', message: 'I want to create performance tests' },
];

export default function InputBar({ onSend, isLoading, onQuickStart }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
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
    <div className="border-t border-surface-600 p-4 bg-surface-800">
      <div className="flex flex-wrap gap-2 mb-3">
        {quickStarts.map((qs) => (
          <button
            key={qs.label}
            onClick={() => onQuickStart(qs.message)}
            disabled={isLoading}
            className="px-3 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-full border border-surface-600 disabled:opacity-50 transition-colors"
          >
            {qs.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Describe your testing needs..."
          rows={1}
          className="flex-1 resize-none bg-surface-700 border border-surface-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-accent-green disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !text.trim()}
          className="p-3 bg-accent-green text-black rounded-xl hover:bg-brand-500 disabled:opacity-50 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-1 text-right">{text.length} chars · Enter to send · Shift+Enter for newline</p>
    </div>
  );
}
