import { Layers, Smartphone, Cpu, ShieldCheck, Accessibility, Gauge } from 'lucide-react';

const testTypes = [
  { id: 'e2e', label: 'E2E Web', tag: 'WEB', icon: Layers },
  { id: 'mobile', label: 'Mobile', tag: 'MOB', icon: Smartphone },
  { id: 'api', label: 'API', tag: 'API', icon: Cpu },
  { id: 'perf', label: 'Performance', tag: 'PERF', icon: Gauge },
  { id: 'security', label: 'Security', tag: 'SEC', icon: ShieldCheck },
  { id: 'a11y', label: 'Accessibility', tag: 'A11Y', icon: Accessibility },
];

interface Props {
  selected?: string;
  onSelect: (type: string) => void;
}

export default function TestTypeSelector({ selected, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {testTypes.map((type) => {
        const Icon = type.icon;
        const isActive = selected === type.label;
        return (
          <button
            key={type.id}
            onClick={() => onSelect(type.label)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 border ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
            <span className="text-[11px] font-semibold tracking-tight">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
