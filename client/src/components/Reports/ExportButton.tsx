import { Download } from 'lucide-react';

interface Props {
  onExportJSON: () => void;
  onExportCSV: () => void;
}

export default function ExportButton({ onExportJSON, onExportCSV }: Props) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onExportJSON}
        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded-lg border border-surface-600 transition-colors"
      >
        <Download size={14} /> Export JSON
      </button>
      <button
        onClick={onExportCSV}
        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded-lg border border-surface-600 transition-colors"
      >
        <Download size={14} /> Export CSV
      </button>
    </div>
  );
}
