import { useState, useEffect } from 'react';
import {
  Shield, Play, Loader2, Info, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, ExternalLink, Lock
} from 'lucide-react';
import { runSecurityScan, getSecurityComplianceMap } from '../../services/api';
import ExportReportButton from '../common/ExportReportButton';
import { exportToPdf, exportToExcel } from '../../utils/exportUtils';

const SEVERITY_CONFIG = {
  Critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500' },
  High: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-500' },
  Medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-500' },
  Low: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-400' },
  Info: { color: 'text-slate-400', bg: 'bg-surface-700 border-surface-600', dot: 'bg-slate-500' },
};

const COMPLIANCE_FRAMEWORKS = ['owasp', 'soc2', 'pci', 'hipaa', 'gdpr', 'iso27001'];

export default function SecurityView() {
  const [url, setUrl] = useState('');
  const [scanType, setScanType] = useState<'full' | 'dast' | 'sca'>('full');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [frameworks, setFrameworks] = useState<any[]>([]);

  useEffect(() => {
    getSecurityComplianceMap()
      .then((data) => setFrameworks(data.frameworks || []))
      .catch(() => {});
  }, []);

  const runScan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setError('');
    setResult(null);
    try {
      const data = await runSecurityScan({ url: url.trim(), scanType });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';

  const filtered = result?.findings?.filter((f: any) => !severityFilter || f.severity === severityFilter) || [];

  const handleExportPdf = () => {
    if (!result || !result.findings) return;
    const columns = ['Severity', 'Title', 'Category', 'CWE'];
    const data = result.findings.map((f: any) => [
      f.severity,
      f.title,
      f.category || '-',
      f.cwe || '-'
    ]);
    exportToPdf('Security Scan Report', columns, data);
  };

  const handleExportExcel = () => {
    if (!result || !result.findings) return;
    const data = result.findings.map((f: any) => ({
      Severity: f.severity,
      Title: f.title,
      Category: f.category || '-',
      CWE: f.cwe || '-'
    }));
    exportToExcel('Security Scan Report', data);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-1 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Shield size={20} className="text-red-400" />
            </div>
            Security Testing
          </h1>
          <p className="text-slate-400 text-sm">
            Playwright-powered DAST (headers, XSS, cookies, open redirects) + retire.js SCA for vulnerable dependencies.
          </p>
        </div>
        {result && (
          <ExportReportButton onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
        )}
      </div>

      {/* Config */}
      <div className="panel p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Scan Configuration</h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="security-url-input"
            type="url"
            className="input-field flex-1"
            placeholder="https://staging.yourapp.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runScan()}
          />
          <button
            id="security-scan-btn"
            onClick={runScan}
            disabled={scanning || !url.trim()}
            className="btn-primary px-6 py-3 flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>

        {/* Scan type */}
        <div className="flex gap-2">
          {(['full', 'dast', 'sca'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setScanType(t)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all uppercase tracking-wider ${
                scanType === t
                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                  : 'border-surface-600 text-slate-400 hover:text-slate-200 hover:border-surface-500'
              }`}
            >
              {t === 'full' ? 'Full (DAST + SCA)' : t.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 bg-surface-800/50 rounded-lg border border-surface-600/50 text-xs text-slate-500">
          <Info size={14} className="shrink-0 mt-0.5 text-red-400" />
          <span>
            <strong className="text-slate-400">DAST:</strong> Playwright headless browser — checks headers, cookies, XSS reflection, open redirects. 
            <strong className="text-slate-400 ml-2">SCA:</strong> retire.js scans installed npm packages for known CVEs.
            <strong className="text-slate-400 ml-2">Staging only</strong> — never run against production without explicit approval.
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400 flex gap-2">
          <XCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {scanning && (
        <div className="panel p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
          <Loader2 size={36} className="animate-spin text-red-400" />
          <p className="text-slate-400 text-sm">Running security scan — launching headless browser, checking headers, probing inputs…</p>
        </div>
      )}

      {result && !scanning && (
        <>
          {/* Score + Summary */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="panel p-5 text-center col-span-2 md:col-span-2">
              <p className={`text-5xl font-black mb-1 ${scoreColor(100 - result.summary.riskScore)}`}>
                {100 - result.summary.riskScore}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Security Score</p>
            </div>
            {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
              const count = result.summary[sev];
              const cfg = SEVERITY_CONFIG[sev.charAt(0).toUpperCase() + sev.slice(1) as keyof typeof SEVERITY_CONFIG];
              return (
                <div key={sev} className="panel p-4 text-center">
                  <p className={`text-3xl font-black mb-1 ${cfg.color}`}>{count}</p>
                  <p className="text-xs text-slate-500 capitalize">{sev}</p>
                </div>
              );
            })}
          </div>

          {/* Pass / Fail badge */}
          <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold ${
            result.passed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {result.passed ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            {result.passed ? 'No critical or high severity findings' : `${result.summary.critical + result.summary.high} blocking findings — do not promote to production`}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Findings */}
            <div className="panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200">Findings ({result.findings?.length})</h2>
                <div className="flex gap-1">
                  {['Critical','High','Medium','Low'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(severityFilter === s ? null : s)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        severityFilter === s
                          ? SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG].bg + ' ' + SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG].color
                          : 'border-surface-600 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 && result.findings?.length > 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No findings for selected filter</p>
              )}
              {result.findings?.length === 0 && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                  <p className="text-sm text-emerald-300 font-semibold">No security findings — great posture!</p>
                </div>
              )}

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filtered.map((f: any) => {
                  const cfg = SEVERITY_CONFIG[f.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.Info;
                  const expanded = expandedId === f.id;
                  return (
                    <div key={f.id} className={`rounded-xl border p-4 ${cfg.bg}`}>
                      <button
                        onClick={() => setExpandedId(expanded ? null : f.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                            <div>
                              <p className="text-xs font-semibold text-slate-200">{f.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{f.category}{f.cwe ? ` · ${f.cwe}` : ''}</p>
                            </div>
                          </div>
                          {expanded ? <ChevronDown size={14} className="text-slate-500 shrink-0 mt-0.5" /> : <ChevronRight size={14} className="text-slate-500 shrink-0 mt-0.5" />}
                        </div>
                      </button>
                      {expanded && (
                        <div className="mt-3 ml-4 space-y-2 animate-in fade-in duration-200">
                          <p className="text-[11px] text-slate-400">{f.description}</p>
                          {f.evidence && (
                            <div className="bg-surface-900/80 rounded-lg p-2">
                              <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase">Evidence</p>
                              <code className="text-[10px] text-orange-300">{f.evidence}</code>
                            </div>
                          )}
                          <div className="bg-surface-900/80 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase">Remediation</p>
                            <p className="text-[11px] text-emerald-300">{f.remediation}</p>
                          </div>
                          {f.compliance?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {f.compliance.map((c: string) => (
                                <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-surface-700 text-slate-400 border border-surface-600 font-mono">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Security Headers + SCA */}
            <div className="space-y-4">
              {result.headerAnalysis?.length > 0 && (
                <div className="panel p-5">
                  <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <Lock size={14} className="text-red-400" />
                    Security Headers
                  </h2>
                  <div className="space-y-2">
                    {result.headerAnalysis.map((h: any) => (
                      <div key={h.header} className="flex items-center gap-3 py-1.5 border-b border-surface-700/50 last:border-0">
                        {h.present
                          ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          : <XCircle size={13} className="text-red-400 shrink-0" />
                        }
                        <span className={`text-xs font-mono flex-1 ${h.present ? 'text-slate-300' : 'text-slate-500'}`}>{h.header}</span>
                        {h.present && h.value && (
                          <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{h.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.scaResults?.length > 0 && (
                <div className="panel p-5">
                  <h2 className="text-sm font-bold text-slate-200 mb-3">SCA — Vulnerable Dependencies ({result.scaResults.length})</h2>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {result.scaResults.map((dep: any, i: number) => (
                      <div key={i} className="p-3 bg-surface-900 rounded-xl border border-surface-600/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-semibold text-slate-200">{dep.package}@{dep.version}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            dep.severity === 'high' || dep.severity === 'critical' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'
                          }`}>{dep.severity}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">{dep.advisory}</p>
                        {dep.fixedIn && <p className="text-[10px] text-emerald-400 mt-1">Fix: upgrade to {dep.fixedIn}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance */}
              {frameworks.length > 0 && (
                <div className="panel p-5">
                  <h2 className="text-sm font-bold text-slate-200 mb-3">Compliance Frameworks</h2>
                  <div className="space-y-1">
                    {frameworks.map((fw: any) => (
                      <a
                        key={fw.id}
                        href={fw.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-800 transition-colors group"
                      >
                        <span className="text-xs text-slate-400 group-hover:text-slate-200">{fw.name}</span>
                        <ExternalLink size={11} className="text-slate-600 group-hover:text-red-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
