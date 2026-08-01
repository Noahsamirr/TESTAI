import { useChat } from '../../hooks/useChat';
import { useTestSession } from '../../hooks/useTestSession';
import ChatWindow from '../Chat/ChatWindow';
import InputBar from '../Chat/InputBar';
import SessionHistory from '../Sidebar/SessionHistory';
import TestTypeSelector from '../Sidebar/TestTypeSelector';
import TestCaseCard from '../TestPanel/TestCaseCard';
import ScriptViewer from '../TestPanel/ScriptViewer';
import RunButton from '../TestPanel/RunButton';
import TerminalOutput from '../TestPanel/TerminalOutput';
import ReportDashboard from '../Reports/ReportDashboard';
import { useState, useEffect, useMemo } from 'react';
import {
  Bot,
  Terminal,
  FileText,
  Layout,
  Layers,
  CheckCircle2,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Play,
  BrainCircuit,
  ShieldCheck,
  Zap,
  Rocket,
  Target,
  Code2,
  BarChart3,
  Eye,
  Smartphone,
  GitBranch,
  Shield,
  FlaskConical,
  Bug,
  Wand2,
  ChevronRight,
  Clock,
  Gauge,
  Wifi,
  Lock,
  ScanEye,
  Cpu,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Database,
} from 'lucide-react';
import wsService from '../../services/websocket';
import { runScript } from '../../services/api';
import { WSEvent, AgentPhase, AICapability, SuggestedAction } from '../../types';

const PHASE_CONFIG: Record<AgentPhase, { label: string; color: string; bg: string; dot: string }> = {
  questioning: { label: 'Ready', color: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-500' },
  analyzing: { label: 'Analyzing', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  generating: { label: 'Generating', color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-500' },
  reviewing: { label: 'Reviewing', color: 'text-violet-700', bg: 'bg-violet-50', dot: 'bg-violet-500' },
  executing: { label: 'Running', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  debugging: { label: 'Debugging', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  reporting: { label: 'Reporting', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  optimizing: { label: 'Optimizing', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500' },
};

const CAPABILITY_META: Record<AICapability, { label: string; icon: any; color: string; bg: string }> = {
  test_planning: { label: 'Test Planning', icon: Target, color: 'text-indigo-700', bg: 'bg-indigo-50' },
  test_case_generation: { label: 'Test Cases', icon: Layers, color: 'text-violet-700', bg: 'bg-violet-50' },
  script_generation: { label: 'Script Gen', icon: Code2, color: 'text-blue-700', bg: 'bg-blue-50' },
  script_execution: { label: 'Execute', icon: Play, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  result_analysis: { label: 'Analysis', icon: BrainCircuit, color: 'text-cyan-700', bg: 'bg-cyan-50' },
  report_generation: { label: 'Reports', icon: BarChart3, color: 'text-amber-700', bg: 'bg-amber-50' },
  bug_triage: { label: 'Bug Triage', icon: Bug, color: 'text-red-700', bg: 'bg-red-50' },
  accessibility_testing: { label: 'A11y', icon: Eye, color: 'text-teal-700', bg: 'bg-teal-50' },
  performance_testing: { label: 'Perf', icon: Gauge, color: 'text-orange-700', bg: 'bg-orange-50' },
  security_testing: { label: 'Security', icon: Shield, color: 'text-rose-700', bg: 'bg-rose-50' },
  api_testing: { label: 'API', icon: Wifi, color: 'text-sky-700', bg: 'bg-sky-50' },
  visual_testing: { label: 'Visual', icon: ScanEye, color: 'text-fuchsia-700', bg: 'bg-fuchsia-50' },
  mobile_testing: { label: 'Mobile', icon: Smartphone, color: 'text-green-700', bg: 'bg-green-50' },
  load_testing: { label: 'Load/Stress', icon: Cpu, color: 'text-yellow-700', bg: 'bg-yellow-50' },
  regression_suggestions: { label: 'Regression', icon: ArrowRight, color: 'text-slate-700', bg: 'bg-slate-50' },
  code_review: { label: 'Code Review', icon: Wand2, color: 'text-indigo-700', bg: 'bg-indigo-50' },
  test_data_generation: { label: 'Test Data', icon: Database, color: 'text-violet-700', bg: 'bg-violet-50' },
  ci_cd_integration: { label: 'CI/CD', icon: GitBranch, color: 'text-blue-700', bg: 'bg-blue-50' },
  test_optimization: { label: 'Optimize', icon: Zap, color: 'text-amber-700', bg: 'bg-amber-50' },
  flaky_test_detection: { label: 'Flaky Detector', icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-50' },
};

export default function AIAssistantView() {
  const {
    messages,
    isLoading: chatLoading,
    sessionId,
    testCases,
    currentScript,
    setCurrentScript,
    currentReport,
    setCurrentReport,
    suggestedActions,
    capabilitiesUsed,
    currentPhase,
    sendMessage,
    clearSession,
  } = useChat();

  const {
    isRunning,
    setIsRunning,
    setRunnerId,
  } = useTestSession();

  const [selectedTestType, setSelectedTestType] = useState<string>();
  const [terminalLogs, setTerminalLogs] = useState<{ text: string; isError: boolean }[]>([]);
  const [terminalSummary, setTerminalSummary] = useState<string>();
  const [activeRightTab, setActiveRightTab] = useState<'cases' | 'script' | 'terminal' | 'report'>('cases');
  const [showWorkspace, setShowWorkspace] = useState(false);

  const phaseConfig = PHASE_CONFIG[currentPhase] || PHASE_CONFIG.questioning;

  useEffect(() => {
    if (isRunning) {
      setShowWorkspace(true);
      setActiveRightTab('terminal');
    } else if (currentReport) {
      setShowWorkspace(true);
      setActiveRightTab('report');
    } else if (currentScript) {
      setShowWorkspace(true);
      setActiveRightTab('script');
    } else if (testCases.length > 0) {
      setShowWorkspace(true);
      setActiveRightTab('cases');
    }
  }, [isRunning, currentReport, currentScript, testCases.length]);

  const handleRunTests = async () => {
    if (!currentScript?.id) {
      setTerminalLogs([{ text: 'No script available to run. Please generate a script first.', isError: true }]);
      setShowWorkspace(true);
      setActiveRightTab('terminal');
      return;
    }

    setIsRunning(true);
    setShowWorkspace(true);
    setActiveRightTab('terminal');
    setTerminalLogs([
      { text: '[runner] Initializing test runner environment…', isError: false },
      { text: '[runner] Preparing script and dependencies…', isError: false },
    ]);
    wsService.connect();

    try {
      const { runnerId: id } = await runScript(currentScript.id, currentScript.framework || 'playwright');
      setRunnerId(id);
      wsService.subscribe(id);

      const unsub = wsService.onMessage((event: WSEvent) => {
        if (event.runnerId !== id) return;

        switch (event.type) {
          case 'runner:log':
            setTerminalLogs((prev) => [...prev, { text: event.line, isError: event.isError }]);
            break;
          case 'runner:progress':
            setTerminalLogs((prev) => [
              ...prev,
              {
                text: `[progress] ${event.passed} passed, ${event.failed} failed / ${event.total} total tests`,
                isError: false,
              },
            ]);
            break;
          case 'runner:complete':
            setCurrentReport(event.report);
            setTerminalSummary(
              `Complete: ${event.report.passed} passed, ${event.report.failed} failed, ${event.report.skipped} skipped — Pass Rate: ${event.report.passRate}`
            );
            setIsRunning(false);
            unsub();
            break;
          case 'runner:error':
          case 'runner:timeout':
          case 'runner:stopped':
            setTerminalLogs((prev) => [
              ...prev,
              {
                text: `[${event.type.replace('runner:', '')}] ${'error' in event ? event.error : 'Operation stopped'}`,
                isError: true,
              },
            ]);
            setIsRunning(false);
            unsub();
            break;
        }
      });
    } catch (error) {
      setTerminalLogs((prev) => [
        ...prev,
        { text: error instanceof Error ? error.message : 'Run failed', isError: true },
      ]);
      setIsRunning(false);
    }
  };

  const handleQuickStart = (text: string) => sendMessage(text);

  const capabilityChips = useMemo(() => {
    return capabilitiesUsed.slice(0, 6);
  }, [capabilitiesUsed]);

  return (
    <div className="flex h-full w-full overflow-hidden font-sans" style={{ background: 'var(--content-bg)' }}>
      {/* Central Chat Workspace */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Top Control Bar with Brand Identity */}
        <div
          className="px-6 py-3 border-b flex items-center justify-between z-20 shrink-0 tm-card rounded-none border-x-0 border-t-0"
          style={{ background: '#ffffff', borderColor: 'var(--card-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Bot size={18} className="text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                TestMind AI Copilot
                <span className={`phase-indicator ${phaseConfig.bg} ${phaseConfig.color}`}>
                  <span className={`phase-dot ${phaseConfig.dot}`} />
                  {phaseConfig.label}
                </span>
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                {capabilityChips.length > 0 ? (
                  capabilityChips.map((cap) => {
                    const meta = CAPABILITY_META[cap] || CAPABILITY_META.test_planning;
                    const Icon = meta.icon;
                    return (
                      <span
                        key={cap}
                        className={`capability-chip ${meta.bg} ${meta.color}`}
                        title={meta.label}
                      >
                        <Icon size={9} />
                        {meta.label}
                      </span>
                    );
                  })
                ) : (
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    Autonomous QA Planner & Script Architect — 14 capabilities ready
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SessionHistory sessionId={sessionId} onNewSession={clearSession} />

            <button
              onClick={() => setShowWorkspace(!showWorkspace)}
              className="btn-tm-secondary flex items-center gap-2"
              style={showWorkspace ? { borderColor: '#6366f1', color: '#4f46e5', background: '#eef2ff' } : {}}
            >
              {showWorkspace ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              <span>{showWorkspace ? 'Hide Artifacts' : 'View Artifacts'}</span>
              {(testCases.length > 0 || currentScript || currentReport) && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Selector Strip */}
        <div
          className="px-6 py-2.5 border-b flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0"
          style={{ background: '#ffffff', borderColor: 'var(--card-border)' }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Sparkles size={12} className="text-indigo-600" /> Mode:
          </span>
          <TestTypeSelector
            selected={selectedTestType}
            onSelect={(type) => {
              setSelectedTestType(type);
              handleQuickStart(`Generate a comprehensive ${type} test suite`);
            }}
          />
        </div>

        {/* Suggested Actions Panel (after assistant replies) */}
        {suggestedActions.length > 0 && !chatLoading && (
          <div
            className="px-6 py-3 border-b bg-gradient-to-r from-indigo-50/80 via-violet-50/40 to-transparent shrink-0 workspace-slide-in"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={13} className="text-amber-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Suggested Next Actions
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedActions.map((action: SuggestedAction, i: number) => {
                const meta = CAPABILITY_META[action.capability] || CAPABILITY_META.test_planning;
                const Icon = meta.icon || Rocket;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleQuickStart(action.prompt)}
                    className={`suggested-action-card stagger-${i + 1} chat-bubble-enter group flex items-center gap-2 px-3 py-2 rounded-lg border bg-white shadow-sm hover:shadow-md ${meta.bg} border-opacity-50`}
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    <div className={`w-6 h-6 rounded-md ${meta.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon size={12} className={meta.color} />
                    </div>
                    <div className="text-left pr-1">
                      <p className={`text-[12px] font-bold leading-tight ${meta.color}`}>{action.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight max-w-[240px] truncate">
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight size={12} className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all ml-1 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-6" style={{ background: 'var(--content-bg)' }}>
          <div className="max-w-3xl mx-auto">
            <ChatWindow messages={messages} isLoading={chatLoading} onQuickStart={handleQuickStart} />
          </div>
        </div>

        {/* Input Bar Dock */}
        <div className="p-4 border-t shrink-0" style={{ background: '#ffffff', borderColor: 'var(--card-border)' }}>
          <div className="max-w-3xl mx-auto">
            <InputBar onSend={sendMessage} isLoading={chatLoading} onQuickStart={handleQuickStart} />
          </div>
        </div>
      </div>

      {/* Collapsible Artifacts & Reports Drawer */}
      <div
        className={`transition-all duration-300 ease-in-out border-l bg-white flex flex-col shadow-lg z-30 ${
          showWorkspace ? 'w-[480px] lg:w-[560px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
        }`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        {/* Workspace Navigation Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 shrink-0"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'cases', label: 'Test Suite', icon: Layers, count: testCases.length, accent: 'indigo' },
              { id: 'script', label: 'Script Code', icon: FileText, active: !!currentScript, accent: 'violet' },
              { id: 'terminal', label: 'Terminal', icon: Terminal, active: isRunning, accent: 'emerald' },
              { id: 'report', label: 'Report', icon: CheckCircle2, active: !!currentReport, accent: 'amber' },
            ].map((tab, tabIdx) => {
              const Icon = tab.icon;
              const isActive = activeRightTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveRightTab(tab.id as any)}
                  className={`stagger-${tabIdx + 1} workspace-slide-in px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.active && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulseSoft" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowWorkspace(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-2 shrink-0"
            title="Hide drawer"
          >
            <PanelRightClose size={16} />
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5" style={{ background: '#f8fafc' }}>
          {activeRightTab === 'terminal' && (
            <TerminalOutput logs={terminalLogs} isRunning={isRunning} summary={terminalSummary} />
          )}

          {activeRightTab === 'report' &&
            (currentReport ? (
              <ReportDashboard report={currentReport} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 text-center">
                <CheckCircle2 size={36} className="mb-3 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No Execution Report Available</p>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Run an automation script to view complete pass/fail diagnostics, bug triage, and actionable recommendations.
                </p>
              </div>
            ))}

          {activeRightTab === 'script' &&
            (currentScript ? (
              <div className="space-y-4 max-w-full workspace-slide-in">
                {currentScript.setupInstructions && currentScript.setupInstructions.length > 0 && (
                  <div className="tm-card p-3 stagger-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Rocket size={12} className="text-indigo-600" />
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Setup Instructions</p>
                    </div>
                    <ol className="space-y-1">
                      {currentScript.setupInstructions.map((step, i) => (
                        <li key={i} className="text-[11px] text-slate-600 flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <ScriptViewer
                  script={currentScript}
                  onCodeChange={(newCode) => {
                    setCurrentScript({
                      ...currentScript,
                      code: newCode,
                    });
                  }}
                />
                <RunButton onRun={handleRunTests} isRunning={isRunning} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 text-center">
                <FileText size={36} className="mb-3 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No Script Generated Yet</p>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Ask the assistant to write a Playwright, Cypress, Appium, k6, or Jest/Axios automation script.
                </p>
              </div>
            ))}

          {activeRightTab === 'cases' &&
            testCases.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Generated Test Suite</h3>
                    <p className="text-[11px] text-slate-500">Structured scenarios ready for script conversion</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">
                    {testCases.length} Scenarios
                  </span>
                </div>
                <div className="space-y-3">
                  {testCases.map((tc, idx) => (
                    <div key={tc.id} className={`stagger-${Math.min(idx + 1, 6)}`}>
                      <TestCaseCard testCase={tc} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 text-center">
                <Layout size={36} className="mb-3 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">Workspace Empty</p>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Type your app URL, describe the feature, or use a quick-start mode above to generate structured test scenarios.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
