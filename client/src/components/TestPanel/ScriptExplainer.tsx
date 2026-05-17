import { ScriptSection } from '../../types';

interface Props {
  sections: ScriptSection[];
}

export default function ScriptExplainer({ sections }: Props) {
  if (!sections.length) return null;

  return (
    <div className="space-y-2 mt-4">
      <h4 className="text-sm font-medium text-accent-green">Script Breakdown</h4>
      {sections.map((section, i) => (
        <div key={i} className="bg-surface-700 rounded-lg p-3 border border-surface-600">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{section.section}</span>
            <span className="text-xs px-2 py-0.5 bg-surface-900 text-gray-500 rounded font-mono">
              L{section.lineRange}
            </span>
          </div>
          <p className="text-xs text-gray-400">{section.description}</p>
        </div>
      ))}
    </div>
  );
}
