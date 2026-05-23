import { useEffect, useState } from 'react';
import { MonitorPlay, Smartphone, ActivitySquare, CheckCircle, XCircle } from 'lucide-react';
import { getPlatformDashboard } from '../../services/api';
import type { DashboardStats, TestRun } from '../../types/platform';

export default function DashboardView({
  onNavigate,
}: {
  onNavigate?: (view: string) => void;
}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformDashboard()
      .then((data) => {
        setStats(data.stats);
        setRecentRuns(data.recentRuns || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">Loading dashboard…</p>
      </div>
    );
  }

  const s = stats || {
    activeVms: 0,
    availableDevices: 5,
    passedTests: 0,
    failedTests: 0,
    totalRuns: 0,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">TestMind Cloud</h1>
        <p className="text-slate-400">
          Cross-browser testing, real devices, CI/CD, and AI-powered automation — Sauce Labs–style platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="panel p-6 border-l-4 border-l-brand-500">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <MonitorPlay size={20} />
            <h3 className="font-semibold text-sm uppercase">Live Sessions</h3>
          </div>
          <p className="text-3xl font-bold text-slate-100">{s.activeVms}</p>
        </div>
        <div className="panel p-6 border-l-4 border-l-accent-primary">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <Smartphone size={20} />
            <h3 className="font-semibold text-sm uppercase">Devices Available</h3>
          </div>
          <p className="text-3xl font-bold text-slate-100">{s.availableDevices}</p>
        </div>
        <div className="panel p-6 border-l-4 border-l-accent-success">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <CheckCircle size={20} className="text-accent-success" />
            <h3 className="font-semibold text-sm uppercase">Tests Passed</h3>
          </div>
          <p className="text-3xl font-bold text-slate-100">{s.passedTests}</p>
        </div>
        <div className="panel p-6 border-l-4 border-l-accent-danger">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
            <XCircle size={20} className="text-accent-danger" />
            <h3 className="font-semibold text-sm uppercase">Tests Failed</h3>
          </div>
          <p className="text-3xl font-bold text-slate-100">{s.failedTests}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="panel p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <ActivitySquare className="text-brand-500" /> Recent Runs
          </h2>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-slate-500">
              No runs yet. Use AI Assistant to generate tests, then run them from Automated Runs.
            </p>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 bg-surface-900 rounded-lg border border-surface-700"
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-200">{run.name}</span>
                    <span className="block text-xs text-slate-500">
                      {run.browser} on {run.os} • {new Date(run.executedAt).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      run.status === 'passed'
                        ? 'bg-accent-success/10 text-accent-success'
                        : run.status === 'failed'
                          ? 'bg-accent-danger/10 text-accent-danger'
                          : 'bg-surface-700 text-slate-400'
                    }`}
                  >
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel p-6 flex flex-col items-center justify-center min-h-[320px]">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-brand-500/20 text-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MonitorPlay size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Live Cross-Browser Testing</h3>
            <p className="text-sm text-slate-400 mb-6">
              Spin up a session on any browser/OS combo and capture screenshots instantly.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.('live')}
              className="btn-primary w-full py-3"
            >
              Launch Live Testing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
