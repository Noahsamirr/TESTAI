import React, { useState, useCallback } from 'react';
import {
  Bot, Play, Zap, Shield, Eye, Bug, FileText, GitBranch,
  Loader2, CheckCircle2, XCircle, ChevronRight, Clock, Cpu,
  Layers, Sparkles, Code2, Search, Database, Globe
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

interface AgentRun {
  id: string;
  capability: string;
  agentName: string;
  status: 'running' | 'success' | 'failed';
  reasoning?: string;
  confidence?: number;
  durationMs?: number;
  createdAt: string;
  output?: Record<string, unknown>;
  error?: string;
}

const AGENT_ICON_MAP: Record<string, React.ComponentType<any>> = {
  test_planning: Layers,
  nl_test_generation: Sparkles,
  playwright_generation: Code2,
  bdd_generation: FileText,
  self_healing: Shield,
  bug_investigation: Bug,
  root_cause_analysis: Search,
  report_writing: FileText,
  ci_cd_generation: GitBranch,
  security_analysis: Shield,
  performance_analysis: Zap,
  accessibility_analysis: Eye,
  api_test_generation: Globe,
  sql_test_generation: Database,
};

const CAPABILITY_LABELS: Record<string, string> = {
  nl_test_generation: 'Natural Language → Tests',
  playwright_generation: 'Playwright Code Gen',
  bdd_generation: 'BDD Gherkin',
  test_planning: 'Test Planning',
  self_healing: 'Self-Healing',
  bug_investigation: 'Bug Investigation',
  root_cause_analysis: 'Root Cause Analysis',
  report_writing: 'Report Writing',
  ci_cd_generation: 'CI/CD Pipeline',
  security_analysis: 'Security Analysis',
  performance_analysis: 'Performance Analysis',
  accessibility_analysis: 'Accessibility',
  api_test_generation: 'API Test Gen',
  sql_test_generation: 'SQL Test Gen',
};

const QUICK_TASKS = [
  {
    id: 'nl-playwright',
    label: 'NL → Playwright Test',
    capability: 'nl_test_generation',
    icon: Sparkles,
    color: 'from-indigo-500/20 to-violet-500/20',
    border: 'border-indigo-500/30',
    fields: [
      { key: 'naturalLanguage', label: 'Test Scenario', type: 'textarea', placeholder: 'e.g. Login as Admin, open Dashboard, create a new Customer, verify they appear in the list' },
      { key: 'appContext.url', label: 'App URL (optional)', type: 'text', placeholder: 'https://your-app.com' },
      { key: 'outputFormat', label: 'Output Format', type: 'select', options: ['playwright', 'gherkin', 'jest', 'pytest', 'k6', 'appium'] },
    ],
  },
  {
    id: 'test-plan',
    label: 'Generate Test Plan',
    capability: 'test_planning',
    icon: Layers,
    color: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    fields: [
      { key: 'requirements', label: 'Requirements / Feature Description', type: 'textarea', placeholder: 'e.g. User authentication with email/password, social login (Google), password reset flow, session management...' },
      { key: 'appType', label: 'App Type', type: 'select', options: ['web', 'mobile', 'api', 'desktop'] },
      { key: 'techStack', label: 'Tech Stack (optional)', type: 'text', placeholder: 'e.g. React, Node.js, PostgreSQL' },
    ],
  },
  {
    id: 'bug-investigate',
    label: 'Investigate Bug',
    capability: 'bug_investigation',
    icon: Bug,
    color: 'from-red-500/20 to-orange-500/20',
    border: 'border-red-500/30',
    fields: [
      { key: 'errorLog', label: 'Error Log / Stack Trace', type: 'textarea', placeholder: 'Paste the full error log or stack trace here...' },
      { key: 'testName', label: 'Test Name (optional)', type: 'text', placeholder: 'e.g. LoginPage > should login as admin' },
      { key: 'retryCount', label: 'Retry Count', type: 'number', placeholder: '0' },
    ],
  },
  {
    id: 'self-heal',
    label: 'Heal Broken Selector',
    capability: 'self_healing',
    icon: Shield,
    color: 'from-amber-500/20 to-yellow-500/20',
    border: 'border-amber-500/30',
    fields: [
      { key: 'brokenSelector', label: 'Broken Selector', type: 'text', placeholder: 'e.g. #login-btn or .submit-button or //button[@class="btn-primary"]' },
      { key: 'targetDescription', label: 'Element Description', type: 'text', placeholder: 'e.g. Submit login form button' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentsView() {
  const [activeTask, setActiveTask] = useState(QUICK_TASKS[0]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [agents] = useState<Agent[]>([
    { id: 'planner-agent', name: 'Planner Agent', description: 'Generates structured test plans from requirements', capabilities: ['test_planning', 'regression_planning'] },
    { id: 'nl-test-generator', name: 'NL Test Generator', description: 'Converts natural language to executable test code', capabilities: ['nl_test_generation', 'bdd_generation', 'playwright_generation'] },
    { id: 'self-healing-agent', name: 'Self-Healing Agent', description: 'Recovers broken selectors using 9-strategy chain', capabilities: ['self_healing'] },
    { id: 'bug-investigation-agent', name: 'Bug Investigation Agent', description: 'Classifies failures and generates fix suggestions', capabilities: ['bug_investigation', 'root_cause_analysis', 'flaky_detection'] },
  ]);

  const getToken = () => localStorage.getItem('testmind_token') ?? '';

  const buildInput = useCallback((fields: typeof QUICK_TASKS[0]['fields'], values: Record<string, string>): Record<string, unknown> => {
    const input: Record<string, unknown> = {};
    for (const field of fields) {
      const val = values[field.key] ?? '';
      if (!val) continue;
      // Handle nested keys like 'appContext.url'
      if (field.key.includes('.')) {
        const [parent, child] = field.key.split('.');
        input[parent] = { ...(input[parent] as Record<string, unknown> ?? {}), [child]: val };
      } else if (field.type === 'number') {
        input[field.key] = parseInt(val, 10) || 0;
      } else {
        input[field.key] = val;
      }
    }
    return input;
  }, []);

  const runTask = async () => {
    setIsRunning(true);
    setCurrentRun(null);

    const input = buildInput(activeTask.fields, formValues);

    // Map to the correct endpoint
    const endpointMap: Record<string, string> = {
      nl_test_generation: '/api/agents/nl-tests',
      test_planning: '/api/agents/plan',
      bug_investigation: '/api/agents/investigate',
      self_healing: '/api/agents/heal',
    };
    const endpoint = endpointMap[activeTask.capability] ?? '/api/agents/run';

    // Build body
    let body: Record<string, unknown> = input;
    if (endpoint === '/api/agents/run') body = { capability: activeTask.capability, input };

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await resp.json() as { run?: AgentRun; error?: string };
      if (!resp.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      if (data.run) {
        setCurrentRun(data.run);
        setRecentRuns((prev) => [data.run!, ...prev.slice(0, 9)]);
      }
    } catch (err) {
      setCurrentRun({
        id: 'error',
        capability: activeTask.capability,
        agentName: 'Error',
        status: 'failed',
        error: String(err),
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsRunning(false);
    }
  };

  const renderOutput = (run: AgentRun) => {
    if (run.status === 'failed') {
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-red-400 font-medium text-sm mb-1">Agent Failed</p>
          <p className="text-red-300 text-xs font-mono">{run.error}</p>
        </div>
      );
    }

    const output = run.output;
    if (!output) return null;

    // NL Test output
    if (output['nlTest']) {
      const nlTest = output['nlTest'] as Record<string, unknown>;
      return (
        <div className="space-y-4">
          {!!nlTest['gherkin'] && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Gherkin BDD</p>
              <pre className="bg-slate-900/80 rounded-lg p-4 text-xs text-emerald-300 font-mono overflow-auto max-h-48 border border-slate-700/50">
                {String(nlTest['gherkin'])}
              </pre>
            </div>
          )}
          {!!nlTest['code'] && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Generated {String(nlTest['framework'] ?? '')} Code
              </p>
              <pre className="bg-slate-900/80 rounded-lg p-4 text-xs text-indigo-300 font-mono overflow-auto max-h-64 border border-slate-700/50">
                {String(nlTest['code'])}
              </pre>
            </div>
          )}
          {Array.isArray(nlTest['dependencies']) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Dependencies</p>
              <div className="flex flex-wrap gap-2">
                {(nlTest['dependencies'] as string[]).map((dep) => (
                  <span key={dep} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded font-mono border border-slate-700/50">{dep}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Test plan output
    if (output['plan']) {
      const plan = output['plan'] as Record<string, unknown>;
      const testTypes = (plan['testTypes'] as Array<Record<string, unknown>>) ?? [];
      const riskAreas = (plan['riskAreas'] as Array<Record<string, unknown>>) ?? [];
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-emerald-400 font-semibold text-sm">{String(plan['title'] ?? 'Test Plan')}</p>
            <p className="text-slate-300 text-xs mt-1">{String(plan['objective'] ?? '')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {testTypes.slice(0, 6).map((tt) => (
              <div key={String(tt['type'])} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-200">{String(tt['type'])}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    tt['priority'] === 'Critical' ? 'bg-red-500/20 text-red-400' :
                    tt['priority'] === 'High' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{String(tt['priority'])}</span>
                </div>
                <p className="text-[11px] text-slate-400">{String(tt['estimatedCases'])} test cases</p>
              </div>
            ))}
          </div>
          {riskAreas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Risk Areas</p>
              {riskAreas.map((r) => (
                <div key={String(r['area'])} className="flex items-center gap-3 py-1.5 border-b border-slate-800 last:border-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r['risk'] === 'High' ? 'bg-red-500' : r['risk'] === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="text-xs text-slate-300 flex-1">{String(r['area'])}</span>
                  <span className={`text-[10px] font-medium ${r['risk'] === 'High' ? 'text-red-400' : r['risk'] === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>{String(r['risk'])}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Bug investigation output
    if (output['analysis']) {
      const analysis = output['analysis'] as Record<string, unknown>;
      const failureClass = String(analysis['failureClass'] ?? '').replace(/_/g, ' ');
      const riskColor = analysis['regressionRisk'] === 'High' ? 'red' : analysis['regressionRisk'] === 'Medium' ? 'amber' : 'emerald';
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-orange-400 font-semibold text-sm capitalize">{failureClass}</p>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-semibold">
                {Math.round((analysis['confidence'] as number ?? 0) * 100)}% confidence
              </span>
            </div>
            <p className="text-slate-300 text-xs">{String(analysis['rootCause'] ?? '')}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
            <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Fix Suggestion</p>
            <p className="text-slate-300 text-xs">{String(analysis['fixSuggestion'] ?? '')}</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">Regression Risk:</span>
            <span className={`font-semibold text-${riskColor}-400`}>{String(analysis['regressionRisk'] ?? '')}</span>
            <span className="text-slate-400 ml-auto">~{String(analysis['estimatedFixTimeMinutes'] ?? '')} min fix time</span>
          </div>
        </div>
      );
    }

    // Self-healing output
    if (output['healing']) {
      const healing = output['healing'] as Record<string, unknown>;
      const success = healing['healedSelector'] !== null;
      return (
        <div className="space-y-3">
          <div className={`rounded-xl border p-4 ${success ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
            <p className={`font-semibold text-sm mb-2 ${success ? 'text-emerald-400' : 'text-red-400'}`}>
              {success ? '✓ Selector Healed' : '✗ Healing Failed'}
            </p>
            {success && (
              <>
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-slate-400">Original: <span className="text-red-400">{String(healing['originalSelector'])}</span></p>
                  <p className="text-slate-400">Healed: <span className="text-emerald-400">{String(healing['healedSelector'])}</span></p>
                  <p className="text-slate-400">Strategy: <span className="text-indigo-400">{String(healing['successfulStrategy'])}</span></p>
                  <p className="text-slate-400">Confidence: <span className="text-amber-400">{Math.round((healing['confidence'] as number) * 100)}%</span></p>
                </div>
              </>
            )}
          </div>
          {Array.isArray(healing['attempts']) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Strategies Attempted</p>
              <div className="space-y-1">
                {(healing['attempts'] as Array<Record<string, unknown>>).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    {a['successful'] ? <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" /> : <XCircle size={12} className="text-slate-600 flex-shrink-0" />}
                    <span className={a['successful'] ? 'text-emerald-400' : 'text-slate-500'}>{String(a['strategy'])}</span>
                    {Boolean(a['successful']) && <span className="ml-auto text-amber-400">{Math.round(((a['confidence'] as number) ?? 0) * 100)}%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <pre className="bg-slate-900/80 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-auto max-h-64 border border-slate-700/50">
        {JSON.stringify(output, null, 2)}
      </pre>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot size={22} className="text-indigo-400" />
            AI Agent Orchestrator
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Specialised AI agents for every testing task</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
          <Cpu size={13} className="text-indigo-400" />
          <span className="text-xs text-indigo-300 font-medium">{agents.length} Agents Active</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Task Selector + Form */}
        <div className="col-span-5 space-y-4">
          {/* Quick task cards */}
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TASKS.map((task) => {
              const Icon = task.icon;
              const isActive = activeTask.id === task.id;
              return (
                <button
                  key={task.id}
                  onClick={() => { setActiveTask(task); setFormValues({}); setCurrentRun(null); }}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 bg-gradient-to-br ${task.color} ${task.border} ${isActive ? 'ring-1 ring-white/20 scale-[1.02]' : 'hover:scale-[1.01] opacity-70 hover:opacity-100'}`}
                >
                  <Icon size={16} className="text-white mb-1.5" />
                  <p className="text-[11px] font-semibold text-white leading-tight">{task.label}</p>
                </button>
              );
            })}
          </div>

          {/* Dynamic form */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              {React.createElement(activeTask.icon, { size: 15, className: 'text-indigo-400' })}
              <h3 className="text-sm font-semibold text-white">{activeTask.label}</h3>
            </div>

            {activeTask.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={4}
                    placeholder={field.placeholder}
                    value={formValues[field.key] ?? ''}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="tm-input w-full resize-none text-sm"
                    style={{ minHeight: 100 }}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formValues[field.key] ?? (field.options?.[0] ?? '')}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="tm-input w-full text-sm"
                  >
                    {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formValues[field.key] ?? ''}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="tm-input w-full text-sm"
                  />
                )}
              </div>
            ))}

            <button
              onClick={runTask}
              disabled={isRunning}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
            >
              {isRunning ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {isRunning ? 'Running Agent…' : `Run ${activeTask.label}`}
            </button>
          </div>
        </div>

        {/* Right: Output + Recent Runs */}
        <div className="col-span-7 space-y-4">
          {/* Current run output */}
          {isRunning && (
            <div className="bg-slate-800/40 border border-indigo-500/30 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Loader2 size={20} className="text-indigo-400 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Agent is running…</p>
                <p className="text-xs text-slate-400 mt-0.5">Analysing input and generating output</p>
              </div>
            </div>
          )}

          {currentRun && !isRunning && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
              {/* Run header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentRun.status === 'success'
                    ? <CheckCircle2 size={16} className="text-emerald-400" />
                    : <XCircle size={16} className="text-red-400" />
                  }
                  <span className="text-sm font-semibold text-white">{currentRun.agentName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${currentRun.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {currentRun.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {currentRun.confidence && (
                    <span className="text-amber-400 font-medium">{Math.round(currentRun.confidence * 100)}% confidence</span>
                  )}
                  {currentRun.durationMs && (
                    <span className="flex items-center gap-1"><Clock size={11} />{currentRun.durationMs}ms</span>
                  )}
                </div>
              </div>

              {/* Reasoning */}
              {currentRun.reasoning && (
                <div className="bg-slate-900/60 rounded-lg px-4 py-2.5 border border-slate-700/50">
                  <p className="text-[11px] text-slate-400 font-medium mb-0.5">Agent Reasoning</p>
                  <p className="text-xs text-slate-300">{currentRun.reasoning}</p>
                </div>
              )}

              {/* Main output */}
              {renderOutput(currentRun)}
            </div>
          )}

          {/* Agents registry */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Cpu size={14} className="text-indigo-400" />
              Registered Agents
            </h3>
            <div className="space-y-2">
              {agents.map((agent) => {
                const cap = agent.capabilities[0] ?? '';
                const Icon = AGENT_ICON_MAP[cap] ?? Bot;
                return (
                  <div key={agent.id} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700/40 hover:border-slate-600/60 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{agent.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{agent.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {agent.capabilities.map((cap) => (
                          <span key={cap} className="text-[10px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">
                            {CAPABILITY_LABELS[cap] ?? cap}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-slate-600 flex-shrink-0 mt-1" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent runs */}
          {recentRuns.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Recent Runs</h3>
              <div className="space-y-2">
                {recentRuns.slice(0, 5).map((run) => (
                  <button
                    key={run.id}
                    onClick={() => setCurrentRun(run)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-700/40 transition-colors text-left"
                  >
                    {run.status === 'success'
                      ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                      : <XCircle size={13} className="text-red-400 flex-shrink-0" />
                    }
                    <span className="text-xs text-slate-300 flex-1 truncate">{CAPABILITY_LABELS[run.capability] ?? run.capability}</span>
                    {run.durationMs && <span className="text-[10px] text-slate-500">{run.durationMs}ms</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
