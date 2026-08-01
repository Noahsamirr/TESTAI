import { useState } from 'react';
import { ChevronDown, ChevronRight, Play, Bot } from 'lucide-react';
import { TestCase } from '../../types';

const priorityColors = {
  High: 'bg-accent-red/20 text-accent-red border-accent-red/30',
  Medium: 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30',
  Low: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
};

interface Props {
  testCase: TestCase;
  onRun?: (testCase: TestCase) => void;
}

export default function TestCaseCard({ testCase, onRun }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tm-card p-4 mb-3" style={{ background: '#ffffff', borderColor: 'var(--card-border)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            testCase.priority === 'High' ? 'badge-danger' : testCase.priority === 'Low' ? 'badge-info' : 'badge-pending'
          }`}>
            {testCase.priority}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
            {testCase.type}
          </span>
        </div>
        <Bot size={16} className="text-orange-500 shrink-0" aria-label={testCase.automationStatus} />
      </div>

      <h4 className="font-bold text-sm text-slate-900 mb-2 leading-snug">{testCase.title}</h4>
      {testCase.expectedOutcome && <p className="text-xs text-slate-600 mb-2">{testCase.expectedOutcome}</p>}

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 mb-2"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {(testCase.steps || []).length} test steps
      </button>

      {expanded && testCase.steps && testCase.steps.length > 0 && (
        <ol className="space-y-2 mb-3 pl-2 border-l-2 border-orange-100 ml-1">
          {testCase.steps.map((step) => (
            <li key={step.stepNumber} className="text-xs text-slate-700 pl-2">
              <span className="text-orange-600 font-mono font-bold">{step.stepNumber}.</span> {step.action}
              <p className="text-slate-500 ml-4">→ {step.expectedResult}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(testCase.tags || []).map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
            #{tag}
          </span>
        ))}
      </div>

      {onRun && (
        <button
          onClick={() => onRun(testCase)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-accent-green/10 text-accent-green border border-accent-green/30 rounded-lg hover:bg-accent-green/20 transition-colors"
        >
          <Play size={12} /> Run This Case
        </button>
      )}
    </div>
  );
}
