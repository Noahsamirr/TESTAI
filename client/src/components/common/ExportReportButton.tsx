import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table } from 'lucide-react';

interface ExportReportButtonProps {
  onExportPdf: () => void;
  onExportExcel: () => void;
}

export default function ExportReportButton({
  onExportPdf,
  onExportExcel,
}: ExportReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost py-2 px-4 flex items-center gap-2"
      >
        <Download size={18} /> Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-surface-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={() => {
                setIsOpen(false);
                onExportPdf();
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-surface-700 hover:text-white flex items-center gap-2"
              role="menuitem"
            >
              <FileText size={16} className="text-brand-500" /> Export as PDF
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onExportExcel();
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-surface-700 hover:text-white flex items-center gap-2"
              role="menuitem"
            >
              <Table size={16} className="text-accent-success" /> Export as Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
