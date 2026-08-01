import { useState } from 'react';
import {
  Eye, AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink,
  Monitor, Tablet, Smartphone, Play, Loader2, RefreshCw, ChevronDown, ChevronRight,
} from 'lucide-react';
import { runAccessibilityScan } from '../../services/api';
import ExportReportButton from '../common/ExportReportButton';
import { exportToPdf, exportToExcel } from '../../utils/exportUtils';

const VIEWPORTS = [
  { name: 'Desktop 1920', width: 1920, height: 1080, icon: Monitor },
  { name: 'Desktop 1280', width: 1280, height: 800,  icon: Monitor },
  { name: 'Tablet 768',   width: 768,  height: 1024, icon: Tablet },
  { name: 'Mobile 390',   width: 390,  height: 844,  icon: Smartphone },
];

const IMPACT: Record<string, { badgeClass: string; dotColor: string; borderColor: string; bg: string }> = {
  critical: { badgeClass: 'badge badge-failed',   dotColor: '#ef4444', borderColor: '#fecaca', bg: '#fef2f2' },
  serious:  { badgeClass: 'badge',                dotColor: '#f97316', borderColor: '#fed7aa', bg: '#fff7ed' },
  moderate: { badgeClass: 'badge badge-pending',  dotColor: '#f59e0b', borderColor: '#fde68a', bg: '#fffbeb' },
  minor:    { badgeClass: 'badge badge-info',     dotColor: '#3b82f6', borderColor: '#bfdbfe', bg: '#eff6ff' },
};

export default function VisualAccessibilityView() {
  const [url, setUrl]           = useState('');
  const [viewport, setViewport] = useState(VIEWPORTS[0]);
  const [scanning, setScanning] = useState(false);
  const [result, setResult]     = useState<any>(null);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const run = async () => {
    if (!url.trim()) return;
    setScanning(true); setError(''); setResult(null);
    try {
      const data = await runAccessibilityScan({
        url: url.trim(), viewportWidth: viewport.width, viewportHeight: viewport.height,
      });
      setResult(data);
    } catch (e: any) { setError(e.message || 'Scan failed'); }
    finally { setScanning(false); }
  };

  const scoreColor = (s: number) => s >= 90 ? '#10b981' : s >= 70 ? '#f59e0b' : s >= 50 ? '#f97316' : '#ef4444';

  const byImpact = result?.violations?.reduce((acc: any, v: any) => {
    (acc[v.impact] ||= []).push(v); return acc;
  }, {} as Record<string, any[]>);

  const handleExportPdf = () => {
    if (!result || !result.violations) return;
    const columns = ['Impact', 'Help', 'WCAG', 'Nodes', 'Description'];
    const data = result.violations.map((v: any) => [
      v.impact,
      v.help,
      v.wcag || '-',
      v.nodes.toString(),
      v.description
    ]);
    exportToPdf('Accessibility Scan Report', columns, data);
  };

  const handleExportExcel = () => {
    if (!result || !result.violations) return;
    const data = result.violations.map((v: any) => ({
      Impact: v.impact,
      Help: v.help,
      WCAG: v.wcag || '-',
      Nodes: v.nodes,
      Description: v.description
    }));
    exportToExcel('Accessibility Scan Report', data);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Accessibility Scanner</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            axe-core WCAG 2.2 · A, AA, AAA criteria · headless Playwright Chromium
          </p>
        </div>
        {result && (
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Scan ID: {result.scanId?.slice(0, 8)}</span>
            <ExportReportButton onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
            <button onClick={run} className="btn-tm-secondary">
              <RefreshCw size={13} /> Re-scan
            </button>
          </div>
        )}
      </div>

      {/* Config card */}
      <div className="tm-card p-5 space-y-4">
        <div className="flex gap-3">
          <input id="a11y-url-input" type="url" className="tm-input flex-1" placeholder="https://yourapp.com"
            value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} />
          <button id="a11y-scan-btn" onClick={run} disabled={scanning || !url.trim()} className="btn-tm-primary shrink-0">
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {VIEWPORTS.map(vp => {
            const Icon = vp.icon;
            const active = viewport.name === vp.name;
            return (
              <button key={vp.name} onClick={() => setViewport(vp)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border transition-all ${
                  active ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}>
                <Icon size={13} /> {vp.name} <span className="text-[10px] opacity-60">{vp.width}×{vp.height}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
          <Info size={13} className="shrink-0 mt-0.5 text-indigo-500" />
          <p className="text-[11px] text-indigo-700">axe-core 4.10 injected at runtime · no extra install required · supports WCAG 2.0/2.1/2.2 A, AA, AAA</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-700">
          <XCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {scanning && (
        <div className="tm-card p-12 flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: '#8b5cf6' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Launching headless browser and running axe-core…</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Usually takes 5–15 seconds</p>
        </div>
      )}

      {result && !scanning && (
        <>
          {/* Score tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'A11y Score',     value: result.score,              color: scoreColor(result.score) },
              { label: 'Violations',     value: result.violations?.length, color: result.violations?.length > 0 ? '#ef4444' : '#10b981' },
              { label: 'Passed Checks',  value: result.passedChecks,       color: '#10b981' },
              { label: 'Incomplete',     value: result.incomplete,         color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} className="tm-card p-4 text-center">
                <p className="text-[28px] font-black" style={{ color }}>{value}</p>
                <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Violations */}
            <div className="tm-card overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  Violations ({result.violations?.length ?? 0})
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{new URL(result.url).hostname}</span>
              </div>

              {result.violations?.length === 0 ? (
                <div className="p-8 flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                  <p className="text-[13px] font-semibold" style={{ color: '#059669' }}>No violations — excellent accessibility!</p>
                </div>
              ) : (
                <div className="divide-y max-h-[520px] overflow-y-auto" style={{ borderColor: '#f0f2f5' }}>
                  {(['critical','serious','moderate','minor'] as const).map(impact => {
                    const viols = byImpact?.[impact] || [];
                    if (!viols.length) return null;
                    const cfg = IMPACT[impact];
                    return viols.map((v: any) => (
                      <div key={v.id} style={{ borderColor: '#f0f2f5' }}>
                        <button
                          onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                          className="w-full px-5 py-3 flex items-start gap-3 hover:bg-gray-50 text-left transition-colors"
                        >
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: cfg.dotColor }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{v.help}</span>
                              <span className={cfg.badgeClass}>{impact}</span>
                            </div>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{v.wcag} · {v.nodes} element{v.nodes !== 1 ? 's' : ''}</p>
                          </div>
                          {expanded === v.id ? <ChevronDown size={14} style={{ color: '#9ca3af' }} className="shrink-0" /> : <ChevronRight size={14} style={{ color: '#9ca3af' }} className="shrink-0" />}
                        </button>
                        {expanded === v.id && (
                          <div className="px-5 pb-4 space-y-2" style={{ background: cfg.bg }}>
                            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{v.description}</p>
                            {v.nodeDetails?.slice(0, 2).map((nd: any, i: number) => (
                              <div key={i} className="bg-white rounded-lg p-2 border" style={{ borderColor: cfg.borderColor }}>
                                <code className="text-[10px] text-indigo-700 block truncate">{nd.html}</code>
                                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{nd.failureSummary}</p>
                              </div>
                            ))}
                            <a href={v.helpUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] text-indigo-600 flex items-center gap-1 hover:underline">
                              <ExternalLink size={10} /> Learn more
                            </a>
                          </div>
                        )}
                      </div>
                    ));
                  })}
                </div>
              )}
            </div>

            {/* Scan details */}
            <div className="tm-card p-5">
              <h3 className="text-[13px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Scan Details</h3>
              <div className="space-y-3">
                {[
                  ['URL',       result.url],
                  ['Viewport',  `${viewport.width}×${viewport.height}`],
                  ['Engine',    'axe-core 4.10 + Playwright Chromium'],
                  ['Standards', 'WCAG 2.0/2.1/2.2 A, AA · Best-Practice'],
                  ['Scanned',   new Date(result.timestamp).toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-4">
                    <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--text-tertiary)' }}>{k}</span>
                    <span className="text-[11px] text-right break-all" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
