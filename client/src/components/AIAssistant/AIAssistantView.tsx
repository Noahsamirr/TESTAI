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
import Visualizer from '../TestPanel/Visualizer';
import CoverageHeatmap from '../Reports/CoverageHeatmap';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bot, 
  Terminal, 
  FileText, 
  Layout, 
  Layers, 
  CheckCircle2, 
} from 'lucide-react';
import wsService from '../../services/websocket';
import { runScript } from '../../services/api';
import { WSEvent } from '../../types';

export default function AIAssistantView() {
  const {
    messages,
    isLoading: chatLoading,
    sessionId,
    testCases,
    currentScript,
    currentReport,
    setCurrentReport,
    sendMessage,
    clearSession,
  } = useChat();

  const {
    isRunning,
    setIsRunning,
    setRunnerId,
  } = useTestSession();

  const [selectedTestType, setSelectedTestType] = useState<string>();
  const [terminalLogs, setTerminalLogs] = useState<{ text: string; isError: boolean; type?: 'passed' | 'failed' | 'skipped' }[]>([]);
  const [terminalSummary, setTerminalSummary] = useState<string>();
  const [activeRightTab, setActiveRightTab] = useState<'cases' | 'script' | 'terminal' | 'report' | 'visual' | 'coverage'>('cases');
  
  // Resizable state
  const [rightPanelWidth, setRightPanelWidth] = useState(500);
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 300 && newWidth < window.innerWidth * 0.7) {
      setRightPanelWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    if (isRunning) setActiveRightTab('terminal');
    else if (currentReport) setActiveRightTab('report');
    else if (currentScript) setActiveRightTab('script');
    else if (testCases.length > 0) setActiveRightTab('cases');
  }, [isRunning, currentReport, currentScript, testCases.length]);

  const handleRunTests = async () => {
    setIsRunning(true);
    setTerminalLogs([{ text: 'Initializing test runner...', isError: false }]);
    wsService.connect();

    try {
      const scriptId = currentScript?.id || 'demo';
      const { runnerId: id } = await runScript(scriptId, currentScript?.framework || 'playwright');
      setRunnerId(id);
      wsService.subscribe(id);

      const unsub = wsService.onMessage((event: WSEvent) => {
        if (event.runnerId !== id) return;

        switch (event.type) {
          case 'runner:log':
            setTerminalLogs((prev) => [...prev, { text: event.line, isError: event.isError }]);
            break;
          case 'runner:progress':
            setTerminalLogs((prev) => [...prev, { text: `Progress: ${event.passed}/${event.total} passed, ${event.failed} failed`, isError: false }]);
            break;
          case 'runner:complete':
            setCurrentReport(event.report);
            setTerminalSummary(`Complete: ${event.report.passed} passed, ${event.report.failed} failed — ${event.report.passRate}`);
            setIsRunning(false);
            unsub();
            break;
          case 'runner:error':
            setTerminalLogs((prev) => [...prev, { text: event.error, isError: true }]);
            setIsRunning(false);
            unsub();
            break;
        }
      });
    } catch (error) {
      setTerminalLogs((prev) => [...prev, { text: error instanceof Error ? error.message : 'Run failed', isError: true }]);
      setIsRunning(false);
    }
  };

  const handleQuickStart = (text: string) => sendMessage(text);

  return (
    <div className="flex h-full w-full bg-surface-950 overflow-hidden">
      {/* Left Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-950 relative overflow-hidden">
        <div className="p-3 border-b border-surface-600/30 flex gap-3 items-center bg-surface-900/40 backdrop-blur-md sticky top-0 z-20 shrink-0">
           <SessionHistory sessionId={sessionId} onNewSession={clearSession} />
           <div className="h-5 border-l border-surface-600/30"></div>
           <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
             <TestTypeSelector
                selected={selectedTestType}
                onSelect={(type) => {
                  setSelectedTestType(type);
                  handleQuickStart(`I want to create ${type} tests`);
                }}
              />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto relative no-scrollbar scroll-smooth">
           <ChatWindow messages={messages} isLoading={chatLoading} onQuickStart={handleQuickStart} />
        </div>

        <div className="p-4 bg-gradient-to-t from-surface-950 via-surface-950 to-transparent shrink-0">
          <InputBar onSend={sendMessage} isLoading={chatLoading} onQuickStart={handleQuickStart} />
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        onMouseDown={startResizing}
        className="w-1 cursor-col-resize hover:bg-brand-500/50 bg-surface-600/20 transition-colors z-30 shrink-0"
      />

      {/* Right Output Area */}
      <div 
        style={{ width: `${rightPanelWidth}px` }}
        className="shrink-0 bg-surface-900/50 border-l border-surface-600/30 flex flex-col shadow-2xl z-10 overflow-hidden"
      >
         {/* Tab header */}
         <div className="flex border-b border-surface-600/30 bg-surface-900/80 backdrop-blur-md p-1.5 overflow-x-auto sticky top-0 z-20 shrink-0 no-scrollbar">
            {['cases', 'script', 'terminal', 'report'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveRightTab(tab as any)}
                className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all mr-1 capitalize tracking-wider flex items-center gap-1.5 ${
                  activeRightTab === tab
                    ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/20'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-surface-800'
                }`}
              >
                {tab === 'cases' && <Layers size={12} />}
                {tab === 'script' && <FileText size={12} />}
                {tab === 'terminal' && <Terminal size={12} />}
                {tab === 'report' && <CheckCircle2 size={12} />}
                {tab}
              </button>
            ))}
         </div>
         
         {/* Output Content */}
         <div className="flex-1 overflow-y-auto relative no-scrollbar scroll-smooth p-6">
            {activeRightTab === 'terminal' && (
               <TerminalOutput logs={terminalLogs} isRunning={isRunning} summary={terminalSummary} />
             )}
             {activeRightTab === 'report' && currentReport && (
               <ReportDashboard report={currentReport} />
             )}
             {activeRightTab === 'script' && currentScript && (
               <div className="space-y-4 max-w-5xl mx-auto">
                 <ScriptViewer script={currentScript} />
                 <RunButton onRun={handleRunTests} isRunning={isRunning} />
               </div>
             )}
             {activeRightTab === 'cases' && testCases.length > 0 && (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-5xl mx-auto">
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="text-lg font-black text-white tracking-tight italic">Test Suite</h3>
                   <span className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[10px] font-black border border-brand-500/20 uppercase tracking-widest">
                     {testCases.length} Scenarios
                   </span>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                   {testCases.map((tc, i) => (
                     <div key={tc.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
                       <TestCaseCard testCase={tc} />
                     </div>
                   ))}
                 </div>
               </div>
             )}
             {testCases.length === 0 && !currentScript && !currentReport && !isRunning && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
                  <div className="w-14 h-14 rounded-2xl bg-surface-900 border border-surface-600/30 flex items-center justify-center mb-6 shadow-panel">
                     <Layout size={28} className="text-slate-700" />
                  </div>
                  <h3 className="text-slate-300 font-black mb-2 italic">Ready to Generate</h3>
                  <p className="text-[11px] text-slate-600 max-w-[280px] font-medium leading-relaxed">
                    Interact with the AI assistant to generate test cases and automation scripts.
                  </p>
                </div>
             )}
         </div>
      </div>
    </div>
  );
}
