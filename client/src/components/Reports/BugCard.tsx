import { Bug } from '../../types';
import BugTriage from './BugTriage';

const severityColors: Record<string, string> = {
  Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

interface Props {
  bug: Bug;
  expanded: boolean;
  onToggle: () => void;
}

export default function BugCard({ bug, expanded, onToggle }: Props) {
  return (
    <div className="border-b border-surface-600">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-700 text-left text-sm"
      >
        <span className="text-gray-500 font-mono text-xs w-24">{bug.id}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[bug.severity]}`}>
          {bug.severity}
        </span>
        <span className="flex-1 truncate">{bug.title}</span>
        <span className="text-xs text-gray-500">{bug.status}</span>
      </button>
      {expanded && (
        <div className="px-4 py-3 bg-surface-900 text-xs text-gray-400 space-y-2">
          <div>
            <p className="text-gray-500 mb-1">Steps to Reproduce</p>
            <ol className="list-decimal ml-4">
              {(bug.stepsToReproduce || []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <p><strong className="text-gray-300">Expected:</strong> {bug.expectedResult || '—'}</p>
          <p><strong className="text-gray-300">Actual:</strong> {bug.actualResult || '—'}</p>
          <BugTriage bug={bug} />
        </div>
      )}
    </div>
  );
}
