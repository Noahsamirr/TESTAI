import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface LogLine {
  text: string;
  isError: boolean;
  type?: 'passed' | 'failed' | 'skipped';
}

interface Props {
  logs: LogLine[];
  isRunning: boolean;
  summary?: string;
}

export default function TerminalOutput({ logs, isRunning, summary }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const formatLine = (line: LogLine) => {
    if (line.type === 'passed') return <span className="text-accent-green font-bold">PASS</span>;
    if (line.type === 'failed') return <span className="text-accent-red font-bold">FAIL</span>;
    if (line.type === 'skipped') return <span className="text-gray-500 font-bold">SKIP</span>;
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 font-mono">terminal</span>
        {isRunning && <Loader2 size={14} className="animate-spin text-accent-green" />}
      </div>
      <div
        className="flex-1 overflow-y-auto rounded-lg p-3 font-mono text-xs leading-relaxed"
        style={{ background: '#000', minHeight: '200px' }}
      >
        {logs.length === 0 && isRunning && (
          <p className="text-accent-green">Starting test runner...</p>
        )}
        {logs.map((line, i) => (
          <div key={i} className="mb-0.5">
            {line.type ? (
              <span>
                {formatLine(line)} <span className="text-gray-400">{line.text}</span>
              </span>
            ) : (
              <span className={line.isError ? 'text-accent-red' : 'text-accent-green'}>
                {line.text}
              </span>
            )}
          </div>
        ))}
        {summary && (
          <p className="mt-3 font-bold text-white border-t border-gray-800 pt-2">{summary}</p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
