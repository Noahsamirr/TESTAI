import { useEffect, useState } from 'react';
import {
  MonitorPlay, Smartphone, ActivitySquare, CheckCircle2, XCircle,
  Eye, Zap, Shield, FlaskConical, TrendingUp, ArrowRight,
  ShieldCheck, Play, Clock, BarChart2,
} from 'lucide-react';
import { getPlatformDashboard } from '../../services/api';
import type { DashboardStats, TestRun } from '../../types/platform';

const MODULES = [
  { id: 'live',        label: 'Live Testing',   icon: MonitorPlay,   color: '#6366f1', lightBg: '#eef2ff', desc: 'Cross-browser sessions' },
  { id: 'automated',  label: 'Automated Runs',  icon: ActivitySquare,color: '#10b981', lightBg: '#ecfdf5', desc: 'Run history & CI' },
  { id: 'mobile',     label: 'Real Devices',    icon: Smartphone,    color: '#3b82f6', lightBg: '#eff6ff', desc: 'Appium device cloud' },
  { id: 'visual',     label: 'Visual & A11y',   icon: Eye,           color: '#8b5cf6', lightBg: '#f5f3ff', desc: 'WCAG 2.2 axe-core' },
  { id: 'performance',label: 'Performance',     icon: Zap,           color: '#f59e0b', lightBg: '#fffbeb', desc: 'k6 load testing' },
  { id: 'security',   label: 'Security',        icon: Shield,        color: '#ef4444', lightBg: '#fef2f2', desc: 'DAST + SCA' },
  { id: 'ai-evals',   label: 'AI Evals',        icon: FlaskConical,  color: '#06b6d4', lightBg: '#ecfeff', desc: 'LLM-as-judge' },
  { id: 'ci',         label: 'CI / CD',         icon: TrendingUp,    color: '#64748b', lightBg: '#f8fafc', desc: 'Pipeline integrations' },
];

const STATUS_BADGE: Record<string, string> = {
  passed:  'badge badge-passed',
  failed:  'badge badge-failed',
  pending: 'badge badge-pending',
  skipped: 'badge badge-skipped',
  running: 'badge badge-info',
};

export default function DashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformDashboard()
      .then(data => { setStats(data.stats); setRecentRuns(data.recentRuns || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const s = stats || { activeVms: 0, availableDevices: 5, passedTests: 0, failedTests: 0, totalRuns: 0 };
  const total = s.passedTests + s.failedTests;
  const passRate = total > 0 ? Math.round((s.passedTests / total) * 100) : 0;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">

      {/* ── Project Summary (Testomat top card) ───────────────────────────── */}
      <div className="tm-card p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>QualityForge AI</h2>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Unified Quality Engineering Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-success">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              All systems operational
            </span>
            <button
              onClick={() => onNavigate?.('automated')}
              className="btn-tm-primary"
            >
              <Play size={13} />
              New Run
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Live Sessions',   value: s.activeVms,        icon: MonitorPlay,  color: '#6366f1', bg: '#eef2ff' },
            { label: 'Tests Passed',    value: s.passedTests,      icon: CheckCircle2, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Tests Failed',    value: s.failedTests,      icon: XCircle,      color: '#ef4444', bg: '#fef2f2' },
            { label: 'Devices Ready',   value: s.availableDevices, icon: Smartphone,   color: '#3b82f6', bg: '#eff6ff' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-lg" style={{ background: bg }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-[22px] font-black leading-none" style={{ color }}>{value}</p>
                <p className="text-[11px] mt-0.5 font-medium" style={{ color: '#64748b' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pass rate bar */}
        {total > 0 && (
          <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                <BarChart2 size={13} className="inline mr-1.5" style={{ color: '#6366f1' }} />
                Overall Pass Rate
              </span>
              <span className="text-[13px] font-bold" style={{
                color: passRate >= 80 ? '#10b981' : passRate >= 60 ? '#f59e0b' : '#ef4444'
              }}>
                {passRate}% · {total} runs
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f0f2f5' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${passRate}%`,
                  background: passRate >= 80 ? '#10b981' : passRate >= 60 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Module Grid ───────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-[12px] font-700 uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)', fontWeight: 700 }}>
          Test Modules
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODULES.map(({ id, label, icon: Icon, color, lightBg, desc }) => (
            <button
              key={id}
              id={`dash-module-${id}`}
              onClick={() => onNavigate?.(id)}
              className="tm-card p-4 text-left group hover:border-indigo-200 transition-all"
              style={{ cursor: 'pointer' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                style={{ background: lightBg }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-[12px] font-700 mb-0.5" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{label}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[11px]" style={{ color }}>Open</span>
                <ArrowRight size={10} style={{ color }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Runs */}
        <div className="tm-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-2">
              <Clock size={15} style={{ color: '#6366f1' }} />
              <span className="text-[13px] font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Recent Runs</span>
            </div>
            <button
              onClick={() => onNavigate?.('automated')}
              className="text-[12px] font-semibold flex items-center gap-1"
              style={{ color: '#6366f1' }}
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          {recentRuns.length === 0 ? (
            <div className="py-12 text-center">
              <ActivitySquare size={32} className="mx-auto mb-3" style={{ color: '#d1d5db' }} />
              <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>No runs yet</p>
              <button
                onClick={() => onNavigate?.('ai')}
                className="text-[12px] font-semibold flex items-center gap-1 mx-auto mt-2"
                style={{ color: '#6366f1' }}
              >
                Generate your first test with AI <ArrowRight size={11} />
              </button>
            </div>
          ) : (
            <table className="tm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Environment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.slice(0, 6).map(run => (
                  <tr key={run.id}>
                    <td>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 12 }}>{run.name}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11 }}>{run.browser} · {run.os}</span>
                    </td>
                    <td>
                      <span className={STATUS_BADGE[run.status] || 'badge badge-neutral'}>
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Launch */}
        <div className="tm-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <Play size={15} style={{ color: '#6366f1' }} />
            <span className="text-[13px] font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Quick Launch</span>
          </div>
          <div className="p-3 space-y-1">
            {[
              { label: 'WCAG accessibility scan',  view: 'visual',      color: '#8b5cf6', Icon: Eye },
              { label: 'k6 load test',              view: 'performance', color: '#f59e0b', Icon: Zap },
              { label: 'Security DAST scan',        view: 'security',    color: '#ef4444', Icon: Shield },
              { label: 'AI eval suite',             view: 'ai-evals',    color: '#06b6d4', Icon: FlaskConical },
              { label: 'AI Assistant chat',         view: 'ai',          color: '#6366f1', Icon: MonitorPlay },
              { label: 'Live browser session',      view: 'live',        color: '#10b981', Icon: MonitorPlay },
            ].map(({ label, view, color, Icon }) => (
              <button
                key={view}
                onClick={() => onNavigate?.(view)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group text-left"
              >
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <span className="text-[12px] font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#9ca3af' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
