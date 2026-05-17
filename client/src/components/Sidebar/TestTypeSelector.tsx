const testTypes = [
  { id: 'e2e', label: 'E2E Web', tag: 'WEB', description: 'Playwright' },
  { id: 'mobile', label: 'Mobile', tag: 'MOB', description: 'Appium' },
  { id: 'api', label: 'API', tag: 'API', description: 'Axios + Jest' },
  { id: 'perf', label: 'Performance', tag: 'PERF', description: 'Load testing' },
  { id: 'security', label: 'Security', tag: 'SEC', description: 'Vuln scanning' },
  { id: 'a11y', label: 'Accessibility', tag: 'A11Y', description: 'WCAG' },
];

interface Props {
  selected?: string;
  onSelect: (type: string) => void;
}

export default function TestTypeSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Test types</h3>
      <div className="space-y-1">
        {testTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type.label)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
              selected === type.label
                ? 'bg-accent-green/10 text-accent-green border border-accent-green/30'
                : 'hover:bg-surface-700 text-gray-400'
            }`}
          >
            <span className="text-[10px] font-mono font-semibold w-8 text-center text-gray-500 shrink-0">
              {type.tag}
            </span>
            <div>
              <p className="text-xs font-medium">{type.label}</p>
              <p className="text-xs text-gray-600">{type.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
