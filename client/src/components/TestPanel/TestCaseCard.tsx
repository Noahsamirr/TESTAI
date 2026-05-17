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
  const priorityClass = priorityColors[testCase.priority] || priorityColors.Medium;

  return (
    <div className="bg-surface-700 border border-surface-600 rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityClass}`}>
            {testCase.priority}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-600 text-gray-400">
            {testCase.type}
          </span>
        </div>
        <Bot size={14} className="text-accent-green shrink-0" aria-label={testCase.automationStatus} />
      </div>

      <h4 className="font-semibold text-sm text-gray-100 mb-2">{testCase.title}</h4>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-accent-green mb-2"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {testCase.steps.length} steps
      </button>

      {expanded && (
        <ol className="space-y-2 mb-3 pl-2">
          {testCase.steps.map((step) => (
            <li key={step.stepNumber} className="text-xs text-gray-400">
              <span className="text-accent-green font-mono">{step.stepNumber}.</span> {step.action}
              <p className="text-gray-500 ml-4">→ {step.expectedResult}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {testCase.tags.map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 bg-surface-900 text-gray-500 rounded">
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
