import { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, SkipForward } from 'lucide-react';

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

function parseProgress(logs: LogLine[]) {
  let passed = 0, failed = 0, skipped = 0;
  const testLines: { name: string; status: 'passed' | 'failed' | 'skipped' }[] = [];
  
  for (const log of logs) {
    if (log.type === 'passed') { passed++; testLines.push({ name: log.text, status: 'passed' }); }
    else if (log.type === 'failed') { failed++; testLines.push({ name: log.text, status: 'failed' }); }
    else if (log.type === 'skipped') { skipped++; testLines.push({ name: log.text, status: 'skipped' }); }
    // Also try to parse from text
    else if (log.text.match(/✓|passed/i) && !log.isError) { passed++; }
    else if (log.text.match(/✗|failed|error/i) && log.isError) { failed++; }
  }
  
  const total = Math.max(passed + failed + skipped, 1);
  return { passed, failed, skipped, total, testLines };
}

export default function TerminalOutput({ logs, isRunning, summary }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const { passed, failed, skipped, total, testLines } = parseProgress(logs);
  const passPercent = Math.round((passed / total) * 100);
  const failPercent = Math.round((failed / total) * 100);
  const hasProgress = passed + failed + skipped > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 font-mono uppercase tracking-wide">Test Runner</span>
        {isRunning && <Loader2 size={13} className="animate-spin text-accent-green" />}
        {!isRunning && summary && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-accent-green/30 text-accent-green bg-accent-green/10">
            Complete
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {(hasProgress || isRunning) && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>{isRunning ? 'Running…' : 'Finished'}</span>
            <span>{passPercent}% pass rate</span>
          </div>
          <div className="h-2 bg-surface-900 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${passPercent}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${failPercent}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 size={11} /> {passed} passed
            </div>
            <div className="flex items-center gap-1 text-xs text-red-400">
              <XCircle size={11} /> {failed} failed
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <SkipForward size={11} /> {skipped} skipped
            </div>
          </div>
        </div>
      )}

      {/* Named test results */}
      {testLines.length > 0 && (
        <div className="mb-3 space-y-1">
          {testLines.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-surface-900/60">
              {t.status === 'passed' && <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />}
              {t.status === 'failed' && <XCircle size={11} className="text-red-400 shrink-0" />}
              {t.status === 'skipped' && <SkipForward size={11} className="text-slate-500 shrink-0" />}
              <span className={`truncate ${t.status === 'failed' ? 'text-red-300' : t.status === 'skipped' ? 'text-slate-500' : 'text-slate-300'}`}>
                {t.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Raw terminal log */}
      <div
        className="flex-1 overflow-y-auto rounded-lg p-3 font-mono text-xs leading-relaxed"
        style={{ background: '#000', minHeight: '120px' }}
      >
        {logs.length === 0 && isRunning && (
          <p className="text-accent-green">Initialising test runner…</p>
        )}
        {logs.map((line, i) => (
          <div key={i} className={`mb-0.5 ${line.isError ? 'text-red-400' : line.type === 'passed' ? 'text-emerald-400' : line.type === 'failed' ? 'text-red-400' : 'text-green-300'}`}>
            {line.text}
          </div>
        ))}
        {summary && (
          <p className="mt-3 font-bold text-white border-t border-gray-800 pt-2">
            <Clock size={11} className="inline mr-1" />
            {summary}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
