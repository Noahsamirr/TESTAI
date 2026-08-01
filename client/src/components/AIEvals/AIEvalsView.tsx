import { useState, useEffect } from 'react';
import {
  FlaskConical, Plus, Trash2, Play, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Info, ChevronDown, ChevronRight, BookOpen
} from 'lucide-react';
import { getAiEvalTemplates, runAiEvals } from '../../services/api';
import ExportReportButton from '../common/ExportReportButton';
import { exportToPdf, exportToExcel } from '../../utils/exportUtils';

const EVAL_TYPE_CONFIG = {
  'prompt-injection': { label: 'Prompt Injection', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  'jailbreak': { label: 'Jailbreak', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  'factuality': { label: 'Factuality', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  'custom': { label: 'Custom Quality', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
};

type EvalType = keyof typeof EVAL_TYPE_CONFIG;

interface EvalCase {
  id: string;
  name: string;
  prompt: string;
  goldenAnswer?: string;
  evalType: EvalType;
  threshold: number;
}

export default function AIEvalsView() {
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant. Answer questions accurately and safely.');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  useEffect(() => {
    getAiEvalTemplates().then(setTemplates).catch(() => {});
  }, []);

  const addCase = () => {
    const id = `case-${Date.now()}`;
    setCases(prev => [...prev, {
      id, name: `Eval Case ${prev.length + 1}`, prompt: '', evalType: 'custom', threshold: 0.7,
    }]);
  };

  const updateCase = (id: string, patch: Partial<EvalCase>) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const removeCase = (id: string) => setCases(prev => prev.filter(c => c.id !== id));

  const loadTemplate = (tmpl: any) => {
    const id = `tmpl-${Date.now()}`;
    setCases(prev => [...prev, { id, ...tmpl }]);
  };

  const runEvals = async () => {
    if (cases.length === 0) return;
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const data = await runAiEvals({ cases, systemPrompt });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Eval run failed');
    } finally {
      setRunning(false);
    }
  };

  const handleExportPdf = () => {
    if (!result || !result.cases) return;
    const columns = ['Case Name', 'Type', 'Status', 'Score', 'Latency (ms)'];
    const data = result.cases.map((c: any) => [
      c.caseName,
      EVAL_TYPE_CONFIG[c.evalType as EvalType]?.label || 'Custom',
      c.status,
      (c.judgeScore * 100).toFixed(0) + '%',
      c.latencyMs.toString()
    ]);
    exportToPdf('AI Evals Report', columns, data);
  };

  const handleExportExcel = () => {
    if (!result || !result.cases) return;
    const data = result.cases.map((c: any) => ({
      'Case Name': c.caseName,
      Type: EVAL_TYPE_CONFIG[c.evalType as EvalType]?.label || 'Custom',
      Status: c.status,
      Score: parseFloat((c.judgeScore * 100).toFixed(0)),
      'Latency (ms)': c.latencyMs
    }));
    exportToExcel('AI Evals Report', data);
  };

  const scoreBar = (score: number) => (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full bg-surface-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 0.7 ? 'bg-emerald-500' : score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{(score * 100).toFixed(0)}%</span>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-1 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <FlaskConical size={20} className="text-cyan-400" />
            </div>
            AI Feature Testing
          </h1>
          <p className="text-slate-400 text-sm">
            LLM-as-judge evals via Claude — prompt-injection resistance, jailbreak, hallucination/factuality, and custom quality grading.
          </p>
        </div>
        {result && (
          <ExportReportButton onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
        )}
      </div>

      {/* System Prompt Config */}
      <div className="panel p-5">
        <button
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span className="text-sm font-bold text-slate-200">System-Under-Test Prompt</span>
          {showSystemPrompt ? <ChevronDown size={16} className="text-slate-500 ml-auto" /> : <ChevronRight size={16} className="text-slate-500 ml-auto" />}
          <span className="text-xs text-slate-500 ml-2 truncate max-w-[400px]">{!showSystemPrompt && systemPrompt}</span>
        </button>
        {showSystemPrompt && (
          <textarea
            className="input-field w-full mt-3 h-24 resize-none font-mono text-xs"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Define the system prompt of the AI feature being evaluated..."
          />
        )}
        <div className="flex items-start gap-2 mt-3 p-3 bg-surface-800/50 rounded-lg border border-surface-600/50 text-xs text-slate-500">
          <Info size={13} className="shrink-0 mt-0.5 text-cyan-400" />
          <span>
            <strong className="text-slate-400">How it works:</strong> Claude plays both roles — (1) the AI system-under-test responding to your prompt, then (2) an independent judge scoring the response. Real dual-call API evaluation.
          </span>
        </div>
      </div>

      {/* Templates */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <BookOpen size={14} className="text-cyan-400" />
            Quick Templates
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {templates.map((t: any) => {
            const cfg = EVAL_TYPE_CONFIG[t.evalType as EvalType] || EVAL_TYPE_CONFIG.custom;
            return (
              <button
                key={t.id}
                onClick={() => loadTemplate(t)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:opacity-90 ${cfg.bg} ${cfg.color}`}
              >
                <Plus size={11} />
                {t.name}
              </button>
            );
          })}
          <button
            onClick={addCase}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-surface-600 text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition-all"
          >
            <Plus size={11} /> Custom Case
          </button>
        </div>
      </div>

      {/* Eval Cases */}
      {cases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Eval Cases ({cases.length})</h2>
            <button
              id="ai-evals-run-btn"
              onClick={runEvals}
              disabled={running || cases.filter(c => c.prompt.trim()).length === 0}
              className="btn-primary px-5 py-2.5 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? <><Loader2 size={14} className="animate-spin" /> Running…</> : <><Play size={14} /> Run {cases.length} Eval{cases.length !== 1 ? 's' : ''}</>}
            </button>
          </div>

          {cases.map((c) => {
            const cfg = EVAL_TYPE_CONFIG[c.evalType] || EVAL_TYPE_CONFIG.custom;
            return (
              <div key={c.id} className="panel p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    className="input-field flex-1 text-sm font-semibold"
                    value={c.name}
                    onChange={(e) => updateCase(c.id, { name: e.target.value })}
                    placeholder="Case name"
                  />
                  <select
                    className="input-field text-xs"
                    value={c.evalType}
                    onChange={(e) => updateCase(c.id, { evalType: e.target.value as EvalType })}
                  >
                    {Object.entries(EVAL_TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <button onClick={() => removeCase(c.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  className="input-field w-full h-20 resize-none text-sm font-mono"
                  value={c.prompt}
                  onChange={(e) => updateCase(c.id, { prompt: e.target.value })}
                  placeholder="Enter the prompt to evaluate..."
                />
                {c.evalType === 'factuality' && (
                  <input
                    className="input-field w-full text-sm"
                    value={c.goldenAnswer || ''}
                    onChange={(e) => updateCase(c.id, { goldenAnswer: e.target.value })}
                    placeholder="Golden answer (reference truth)..."
                  />
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Pass threshold</span>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={c.threshold}
                    onChange={(e) => updateCase(c.id, { threshold: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono text-slate-400 w-10">{(c.threshold * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cases.length === 0 && !result && (
        <div className="panel p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
            <FlaskConical size={32} className="text-cyan-400/60" />
          </div>
          <h3 className="text-slate-300 font-bold">Add eval cases to start</h3>
          <p className="text-xs text-slate-500 max-w-sm">Load a template above or create a custom eval case to test your AI feature's safety and quality.</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400 flex gap-2">
          <XCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Results */}
      {result && !running && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="panel p-5 text-center">
              <p className="text-4xl font-black text-emerald-400 mb-1">{result.passed}</p>
              <p className="text-xs text-slate-500">Passed</p>
            </div>
            <div className="panel p-5 text-center">
              <p className="text-4xl font-black text-red-400 mb-1">{result.failed}</p>
              <p className="text-xs text-slate-500">Failed</p>
            </div>
            <div className="panel p-5 text-center">
              <p className={`text-4xl font-black mb-1 ${result.avgScore >= 0.7 ? 'text-emerald-400' : result.avgScore >= 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                {(result.avgScore * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-slate-500">Avg Score</p>
            </div>
          </div>

          {/* AI Summary */}
          <div className="panel p-5">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">AI Summary</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
            <p className="text-xs text-slate-600 mt-2">Model: {result.model}</p>
          </div>

          {/* Per-case results */}
          <div className="space-y-3">
            {result.cases?.map((r: any) => {
              const cfg = EVAL_TYPE_CONFIG[r.evalType as EvalType] || EVAL_TYPE_CONFIG.custom;
              const expanded = expandedCase === r.caseId;
              return (
                <div key={r.caseId} className="panel p-4">
                  <button
                    onClick={() => setExpandedCase(expanded ? null : r.caseId)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      {r.status === 'pass'
                        ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        : <XCircle size={16} className="text-red-400 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{r.caseName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          {scoreBar(r.judgeScore)}
                          <span className="text-xs text-slate-600">{r.latencyMs}ms</span>
                        </div>
                      </div>
                      {expanded ? <ChevronDown size={14} className="text-slate-500 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                      {r.injectionDetected !== undefined && (
                        <div className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                          r.injectionDetected
                            ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {r.injectionDetected
                            ? <><AlertTriangle size={12} /> Injection/jailbreak detected — model was vulnerable</>
                            : <><CheckCircle2 size={12} /> Model resisted the injection attempt</>
                          }
                        </div>
                      )}
                      <div className="bg-surface-900/80 rounded-xl p-3 space-y-1">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">Model Response</p>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">{r.modelResponse}</p>
                      </div>
                      <div className="bg-surface-900/80 rounded-xl p-3 space-y-1">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">Judge Reasoning</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{r.judgeReasoning}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
