import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronRight, AlertTriangle, Wrench, Layers, Clock } from 'lucide-react';
import { Bug } from '../../types';
import api from '../../services/api';

interface TriageResult {
  rootCause: string;
  suggestedFix: string;
  affectedComponents: string[];
  estimatedEffort: 'Low' | 'Medium' | 'High';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}

interface Props {
  bug: Bug;
}

const effortColors: Record<string, string> = {
  Low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  High: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const priorityColors: Record<string, string> = {
  P1: 'text-red-400',
  P2: 'text-orange-400',
  P3: 'text-yellow-400',
  P4: 'text-slate-400',
};

export default function BugTriage({ bug }: Props) {
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const runTriage = async () => {
    setLoading(true);
    setError(null);
    setExpanded(true);
    try {
      const prompt = `You are a senior QA engineer performing bug triage. Analyse this bug and respond ONLY with valid JSON matching the schema below. No markdown.

Bug ID: ${bug.id}
Title: ${bug.title}
Severity: ${bug.severity}
Steps to Reproduce: ${(bug.stepsToReproduce || []).join(' → ')}
Expected: ${bug.expectedResult || 'N/A'}
Actual: ${bug.actualResult || 'N/A'}

Schema:
{
  "rootCause": "string (1-2 sentences)",
  "suggestedFix": "string (actionable fix in 2-3 sentences)",
  "affectedComponents": ["string"],
  "estimatedEffort": "Low | Medium | High",
  "priority": "P1 | P2 | P3 | P4"
}`;

      const { data } = await api.post('/chat', {
        sessionId: null,
        message: prompt,
      });

      // Try to parse JSON from the reply
      const jsonMatch = data.reply.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse triage response');
      const result: TriageResult = JSON.parse(jsonMatch[0]);
      setTriage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Triage failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 border-t border-surface-600/50 pt-2">
      {!triage && !loading && (
        <button
          onClick={runTriage}
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          <Sparkles size={12} />
          AI Triage this bug
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
          <Loader2 size={12} className="animate-spin text-brand-400" />
          Analysing root cause…
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 py-1">{error}</p>
      )}

      {triage && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 mb-2 transition-colors"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Sparkles size={12} />
            AI Triage — {triage.priority} · Effort: {triage.estimatedEffort}
          </button>

          {expanded && (
            <div className="space-y-2 text-xs rounded-lg bg-surface-900/70 border border-surface-600/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-400 font-medium mb-0.5">Root Cause</p>
                  <p className="text-slate-300">{triage.rootCause}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Wrench size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-400 font-medium mb-0.5">Suggested Fix</p>
                  <p className="text-slate-300">{triage.suggestedFix}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Layers size={12} className="text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-400 font-medium mb-0.5">Affected Components</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(triage.affectedComponents || []).map(c => (
                      <span key={c} className="px-1.5 py-0.5 bg-surface-700 text-slate-300 rounded text-[10px]">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-slate-400 shrink-0" />
                <span className="text-slate-400 font-medium">Effort:</span>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${effortColors[triage.estimatedEffort]}`}>
                  {triage.estimatedEffort}
                </span>
                <span className={`font-bold ml-1 ${priorityColors[triage.priority]}`}>{triage.priority}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
