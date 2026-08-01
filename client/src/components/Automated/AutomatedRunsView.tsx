import { useEffect, useState } from 'react';
import { ActivitySquare, PlayCircle, RefreshCw } from 'lucide-react';
import { getPlatformRuns } from '../../services/api';
import type { TestRun } from '../../types/platform';
import ExportReportButton from '../common/ExportReportButton';
import { exportToPdf, exportToExcel } from '../../utils/exportUtils';

export default function AutomatedRunsView({
  onGoToAi,
}: {
  onGoToAi?: () => void;
}) {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getPlatformRuns()
      .then(setRuns)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleExportPdf = () => {
    const columns = ['Suite', 'Status', 'Environment', 'Results', 'Duration', 'Executed'];
    const data = runs.map(r => [
      r.name,
      r.status,
      `${r.browser} on ${r.os}`,
      `${r.passed}P / ${r.failed}F / ${r.skipped}S`,
      r.duration,
      new Date(r.executedAt).toLocaleString()
    ]);
    exportToPdf('Automated Runs Report', columns, data);
  };

  const handleExportExcel = () => {
    const data = runs.map(r => ({
      Suite: r.name,
      Status: r.status,
      Environment: `${r.browser} on ${r.os}`,
      Results: `${r.passed}P / ${r.failed}F / ${r.skipped}S`,
      Duration: r.duration,
      Executed: new Date(r.executedAt).toLocaleString()
    }));
    exportToExcel('Automated Runs Report', data);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
            <ActivitySquare className="text-brand-500" /> Automated Test Runs
          </h1>
          <p className="text-slate-400">
            History, logs, and artifacts from Playwright, Appium, and API test executions.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportReportButton onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
          <button
            type="button"
            onClick={load}
            className="btn-ghost py-2 px-4 flex items-center gap-2"
          >
            <RefreshCw size={18} /> Refresh
          </button>
          <button
            type="button"
            onClick={onGoToAi}
            className="btn-primary py-2 px-6 flex items-center gap-2"
          >
            <PlayCircle size={18} /> New Test Run
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <p className="p-8 text-slate-500 text-center">Loading runs…</p>
        ) : runs.length === 0 ? (
          <p className="p-8 text-slate-500 text-center">
            No automated runs yet. Generate a script in AI Assistant and click Run Tests.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-900 border-b border-surface-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-400 uppercase">Suite</th>
                <th className="px-6 py-4 font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-400 uppercase">Environment</th>
                <th className="px-6 py-4 font-semibold text-slate-400 uppercase">Results</th>
                <th className="px-6 py-4 font-semibold text-slate-400 uppercase">Duration</th>
                <th className="px-6 py-4 font-semibold text-slate-400 uppercase">Executed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700 bg-surface-800">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-surface-900">
                  <td className="px-6 py-4 font-medium text-slate-200">{run.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        run.status === 'passed'
                          ? 'bg-accent-success/10 text-accent-success'
                          : run.status === 'failed'
                            ? 'bg-accent-danger/10 text-accent-danger'
                            : 'bg-surface-700 text-slate-400'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {run.browser} on {run.os}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {run.passed}P / {run.failed}F / {run.skipped}S
                  </td>
                  <td className="px-6 py-4 text-slate-300">{run.duration}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(run.executedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
