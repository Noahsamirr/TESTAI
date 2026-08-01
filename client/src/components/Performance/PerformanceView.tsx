import { useState, useRef, useEffect } from 'react';
import {
  Zap, Play, Square, Loader2, Info, AlertTriangle, CheckCircle2,
  TrendingUp, Activity, Clock, AlertCircle, Download, ChevronDown, ChevronRight,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  checkPerformanceK6, generatePerformanceScript, startPerformanceRun,
  getPerformanceRun, stopPerformanceRun,
} from '../../services/api';
import websocket from '../../services/websocket';
import ExportReportButton from '../common/ExportReportButton';
import { exportToPdf, exportToExcel } from '../../utils/exportUtils';

export default function PerformanceView() {
  const [url, setUrl]           = useState('');
  const [vus, setVus]           = useState(20);
  const [duration, setDuration] = useState(30);
  const [rampUp, setRampUp]     = useState(10);
  const [p95, setP95]           = useState(2000);
  const [errRate, setErrRate]   = useState(5);
  const [running, setRunning]   = useState(false);
  const [runnerId, setRunnerId] = useState<string | null>(null);
  const [logs, setLogs]         = useState<string[]>([]);
  const [result, setResult]     = useState<any>(null);
  const [k6, setK6]             = useState<{ installed: boolean; version?: string; installGuide?: string } | null>(null);
  const [script, setScript]     = useState('');
  const [showScript, setShowScript] = useState(false);
  const [error, setError]       = useState('');
  const logsEnd = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    checkPerformanceK6().then(setK6).catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      websocket.unsubscribe();
    };
  }, []);

  useEffect(() => { logsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const genScript = async () => {
    if (!url.trim()) return;
    const data = await generatePerformanceScript({
      url: url.trim(), duration, vus, rampUpSeconds: rampUp, thresholdP95: p95, thresholdErrorRate: errRate / 100,
    });
    setScript(data.script); setShowScript(true);
  };

  const startRun = async () => {
    if (!url.trim()) return;
    setRunning(true); setLogs([]); setResult(null); setError('');
    try {
      const data = await startPerformanceRun({
        url: url.trim(), duration, vus, rampUpSeconds: rampUp,
        thresholdP95: p95, thresholdErrorRate: errRate / 100,
      });
      setRunnerId(data.runnerId);
      websocket.connect();
      websocket.subscribe(data.runnerId);
      websocket.onMessage((event) => {
        if ('runnerId' in event && event.runnerId === data.runnerId && 'line' in event) {
          setLogs((prev) => [...prev.slice(-200), event.line.trim()].filter(Boolean));
        }
      });
      pollRef.current = setInterval(async () => {
        try {
          const res = await getPerformanceRun(data.runnerId);
          setResult(res); setRunning(false);
          if (pollRef.current) clearInterval(pollRef.current);
        } catch { /* not ready */ }
      }, 2000);
    } catch (e: any) { setError(e.message); setRunning(false); }
  };

  const stopRun = async () => {
    if (runnerId) { await stopPerformanceRun(runnerId).catch(() => {}); }
    setRunning(false);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const chartData = result?.metrics?.map((m: any) => ({
    t: `${Math.round(m.timestamp / 1000)}s`,
    'P50 (ms)': Math.round(m.p50),
    'VUs': m.vus,
  })) || [];

  const fields = [
    { label: 'Virtual Users', val: vus,      set: setVus,      unit: 'VUs', min: 1,   max: 1000  },
    { label: 'Duration',      val: duration, set: setDuration, unit: 'sec', min: 10,  max: 600   },
    { label: 'Ramp-up',       val: rampUp,   set: setRampUp,   unit: 'sec', min: 0,   max: 120   },
    { label: 'P95 threshold', val: p95,      set: setP95,      unit: 'ms',  min: 100, max: 30000 },
    { label: 'Max error rate',val: errRate,  set: setErrRate,  unit: '%',   min: 0,   max: 100   },
  ];

  const handleExportPdf = () => {
    if (!result) return;
    const columns = ['Timestamp (s)', 'VUs', 'P50 (ms)', 'P90 (ms)', 'P95 (ms)', 'Requests/s', 'Error Rate'];
    const data = (result.metrics || []).map((m: any) => [
      Math.round(m.timestamp / 1000).toString(),
      m.vus.toString(),
      Math.round(m.p50).toString(),
      Math.round(m.p90).toString(),
      Math.round(m.p95).toString(),
      m.rps.toFixed(1),
      (m.errorRate * 100).toFixed(2) + '%'
    ]);
    exportToPdf('Performance Test Report', columns, data);
  };

  const handleExportExcel = () => {
    if (!result) return;
    const data = (result.metrics || []).map((m: any) => ({
      'Timestamp (s)': Math.round(m.timestamp / 1000),
      'VUs': m.vus,
      'P50 (ms)': Math.round(m.p50),
      'P90 (ms)': Math.round(m.p90),
      'P95 (ms)': Math.round(m.p95),
      'Requests/s': parseFloat(m.rps.toFixed(1)),
      'Error Rate (%)': parseFloat((m.errorRate * 100).toFixed(2))
    }));
    exportToExcel('Performance Test Report', data);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Performance & Load Testing</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>k6 load test runner · configure VUs, ramp-up, and thresholds</p>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <ExportReportButton onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
          )}
          {k6 && (
            <span className={`badge ${k6.installed ? 'badge-passed' : 'badge-pending'}`}>
              {k6.installed ? `k6 ${k6.version}` : 'k6 not installed'}
            </span>
          )}
        </div>
      </div>

      {k6 && !k6.installed && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
          <p className="text-[12px] text-amber-800">{k6.installGuide}</p>
        </div>
      )}

      {/* Config */}
      <div className="tm-card p-5 space-y-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Configuration</h3>
        <div>
          <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Target URL</label>
          <input id="perf-url-input" type="url" className="tm-input"
            placeholder="https://yourapp.com/api/health" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {fields.map(({ label, val, set, unit, min, max }) => (
            <div key={label}>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
              <div className="flex items-center gap-1.5">
                <input type="number" min={min} max={max} value={val}
                  onChange={e => set(Number(e.target.value))}
                  className="tm-input text-center font-mono flex-1" style={{ fontSize: 13 }} />
                <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button id="perf-run-btn" onClick={running ? stopRun : startRun}
            disabled={!url.trim() || !k6?.installed}
            className={running ? 'btn-tm-secondary' : 'btn-tm-primary'}
            style={running ? { borderColor: '#fca5a5', color: '#dc2626', background: '#fef2f2' } : {}}>
            {running ? <><Square size={13} /> Stop</> : <><Play size={13} /> Start Load Test</>}
          </button>
          <button onClick={genScript} disabled={!url.trim()} className="btn-tm-secondary">
            <Download size={13} /> View k6 Script
          </button>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e5e9f0' }}>
          <Info size={13} className="shrink-0 mt-0.5" style={{ color: '#6366f1' }} />
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Requires <strong>k6</strong> binary · macOS: <code style={{ background: '#eef2ff', color: '#4338ca', padding: '1px 4px', borderRadius: 3 }}>brew install k6</code>
            · Linux: <code style={{ background: '#eef2ff', color: '#4338ca', padding: '1px 4px', borderRadius: 3 }}>snap install k6</code>
            · <a href="https://k6.io/docs/get-started/installation/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">k6.io/docs</a>
          </p>
        </div>
      </div>

      {showScript && script && (
        <div className="tm-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>Generated k6 Script</span>
            <button onClick={() => setShowScript(false)} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Hide</button>
          </div>
          <pre className="text-[11px] font-mono p-5 overflow-x-auto max-h-[320px] overflow-y-auto" style={{ background: '#0f1629', color: '#a5f3fc' }}>
            {script}
          </pre>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-700">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* Live logs */}
      {(running || logs.length > 0) && (
        <div className="tm-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <Activity size={14} style={{ color: '#f59e0b' }} />
            <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>Live Output</span>
            {running && <Loader2 size={13} className="animate-spin ml-auto" style={{ color: '#f59e0b' }} />}
          </div>
          <div className="font-mono text-[11px] p-4 max-h-[240px] overflow-y-auto" style={{ background: '#0f1629', color: '#86efac' }}>
            {logs.map((l, i) => <div key={i}>{l}</div>)}
            <div ref={logsEnd} />
          </div>
        </div>
      )}

      {result && !running && (
        <>
          <div className={`flex items-center gap-3 p-4 rounded-lg border text-[13px] font-semibold ${
            result.passed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {result.passed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {result.passed ? 'All thresholds passed' : `${result.thresholdBreaches?.length} threshold breach(es)`}
            {result.thresholdBreaches?.map((b: string, i: number) => (
              <span key={i} className="text-[11px] font-normal">— {b}</span>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg RPS',       value: result.avgRPS?.toFixed(1),    color: '#6366f1', bg: '#eef2ff' },
              { label: 'P95 Latency',   value: `${result.p95?.toFixed(0)}ms`, color: result.p95 > p95 ? '#ef4444' : '#10b981', bg: result.p95 > p95 ? '#fef2f2' : '#ecfdf5' },
              { label: 'Error Rate',    value: `${((result.errorRate ?? 0) * 100).toFixed(2)}%`, color: (result.errorRate ?? 0) > errRate / 100 ? '#ef4444' : '#10b981', bg: (result.errorRate ?? 0) > errRate / 100 ? '#fef2f2' : '#ecfdf5' },
              { label: 'Total Requests',value: result.totalRequests?.toLocaleString(), color: '#374151', bg: '#f8fafc' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="tm-card p-4" style={{ background: bg }}>
                <p className="text-[22px] font-black" style={{ color }}>{value}</p>
                <p className="text-[11px] mt-0.5 font-medium" style={{ color: '#64748b' }}>{label}</p>
              </div>
            ))}
          </div>

          {chartData.length > 0 && (
            <div className="tm-card p-5">
              <h3 className="text-[12px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Response Time Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e9f0', borderRadius: 6, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="P50 (ms)" stroke="#6366f1" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
