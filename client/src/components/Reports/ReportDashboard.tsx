import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckCircle, XCircle, MinusCircle, BarChart2, ExternalLink, FileText } from 'lucide-react';
import { TestReport, Bug } from '../../types';
import SummaryChart from './SummaryChart';
import BugCard from './BugCard';
import ExportButton from './ExportButton';

interface Props {
  report: TestReport;
  aiSummary?: string;
  htmlReportUrl?: string;
}

function statusBadgeClass(status?: string): string {
  const s = (status || '').toUpperCase();
  if (s.includes('PASSED') && !s.includes('FAILED')) {
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  }
  if (s.includes('BLOCKER')) {
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

export default function ReportDashboard({ report, aiSummary, htmlReportUrl }: Props) {
  const [tab, setTab] = useState<'report' | 'dashboard'>(
    report.markdownReport ? 'report' : 'dashboard'
  );
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [expandedBug, setExpandedBug] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'severity' | 'title'>('severity');

  const releaseStatus =
    report.releaseStatus || (report.failed > 0 ? 'FAILED WITH BLOCKERS' : 'PASSED');

  const filteredBugs = report.bugs
    .filter((b) => !severityFilter || b.severity === severityFilter)
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      const order = ['Critical', 'High', 'Medium', 'Low'];
      return order.indexOf(a.severity) - order.indexOf(b.severity);
    });

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${Date.now()}.json`;
    a.click();
  };

  const exportMarkdown = () => {
    const md = report.markdownReport || `# ${report.testSuite}\n\nNo markdown body stored.`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${Date.now()}.md`;
    a.click();
  };

  const exportCSV = () => {
    const headers = ['ID', 'Title', 'Severity', 'Status', 'Expected', 'Actual'];
    const rows = report.bugs.map((b: Bug) =>
      [b.id, b.title, b.severity, b.status, b.expectedResult, b.actualResult]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bugs-${Date.now()}.csv`;
    a.click();
  };

  const stats = [
    { label: 'Total', value: report.totalTests, icon: BarChart2, color: 'text-slate-300' },
    { label: 'Passed', value: report.passed, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Failed', value: report.failed, icon: XCircle, color: 'text-red-400' },
    { label: 'Skipped', value: report.skipped, icon: MinusCircle, color: 'text-slate-500' },
  ];

  let displaySummary = aiSummary;
  if (!displaySummary && report.recommendations && report.recommendations.length > 0) {
    displaySummary = report.recommendations.join('\n\n');
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-brand-400">{report.testSuite}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(report.executionDate).toLocaleString()} · {report.environment}
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border shrink-0 ${statusBadgeClass(releaseStatus)}`}
        >
          {releaseStatus}
        </span>
      </div>

      {report.markdownReport && (
        <div className="flex gap-1 mb-3 p-0.5 bg-surface-900 rounded-lg">
          {(['report', 'dashboard'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-md transition-colors ${
                tab === t
                  ? 'bg-brand-500/20 text-brand-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'report' ? (
                <>
                  <FileText size={12} /> Full report
                </>
              ) : (
                'Summary'
              )}
            </button>
          ))}
        </div>
      )}

      {tab === 'report' && report.markdownReport ? (
        <div className="report-prose flex-1 overflow-y-auto pr-1">
          <ReactMarkdown>{report.markdownReport}</ReactMarkdown>
          <div className="mt-4 pt-3 border-t border-surface-600">
            <button
              type="button"
              onClick={exportMarkdown}
              className="text-xs text-brand-400 hover:underline"
            >
              Download markdown report
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {stats.map((s) => (
              <div key={s.label} className="panel p-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon size={14} className={s.color} />
                  <span className="text-xs text-slate-500">{s.label}</span>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {report.automationCoverage && (
            <p className="text-xs text-slate-500 mb-3">
              Automation coverage:{' '}
              <span className="text-brand-400 font-medium">{report.automationCoverage}</span>
            </p>
          )}

          <SummaryChart report={report} />

          <div className="flex items-center justify-between mt-4 mb-2">
            <h4 className="text-sm font-medium text-slate-200">Defects ({filteredBugs.length})</h4>
            <ExportButton onExportJSON={exportJSON} onExportCSV={exportCSV} />
          </div>

          <div className="flex gap-1 mb-2 flex-wrap">
            {['Critical', 'High', 'Medium', 'Low'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverityFilter(severityFilter === s ? null : s)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  severityFilter === s
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                    : 'bg-surface-700 text-slate-400 border-surface-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setSortBy('severity')}
              className={`text-xs ${sortBy === 'severity' ? 'text-brand-400' : 'text-slate-500'}`}
            >
              Sort: Severity
            </button>
            <button
              type="button"
              onClick={() => setSortBy('title')}
              className={`text-xs ${sortBy === 'title' ? 'text-brand-400' : 'text-slate-500'}`}
            >
              Sort: Title
            </button>
          </div>

          <div className="panel overflow-hidden mb-4">
            {filteredBugs.map((bug) => (
              <BugCard
                key={bug.id}
                bug={bug}
                expanded={expandedBug === bug.id}
                onToggle={() => setExpandedBug(expandedBug === bug.id ? null : bug.id)}
              />
            ))}
            {filteredBugs.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-4">No defects logged</p>
            )}
          </div>

          {htmlReportUrl && (
            <a
              href={htmlReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-brand-400 hover:underline mb-4"
            >
              <ExternalLink size={14} /> View HTML export
            </a>
          )}

          {report.recommendations.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-200 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-2">
                    <span className="text-brand-400 font-mono text-[10px]">·</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiSummary && (
            <div className="panel p-3">
              <h4 className="text-sm font-medium text-brand-400 mb-2">Executive summary</h4>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
