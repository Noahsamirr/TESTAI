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
import { useState, useEffect } from 'react';
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
    <div className="flex h-full w-full">
      {/* Left Chat Area */}
      <div className="flex-1 flex flex-col border-r border-surface-600 min-w-0">
        <div className="p-4 border-b border-surface-600 flex gap-4 items-center bg-surface-900">
           <SessionHistory sessionId={sessionId} onNewSession={clearSession} />
           <div className="h-8 border-l border-surface-600"></div>
           <TestTypeSelector
              selected={selectedTestType}
              onSelect={(type) => {
                setSelectedTestType(type);
                handleQuickStart(`I want to create ${type} tests`);
              }}
            />
        </div>
        <div className="flex-1 overflow-hidden relative">
           <ChatWindow messages={messages} isLoading={chatLoading} onQuickStart={handleQuickStart} />
        </div>
        <InputBar onSend={sendMessage} isLoading={chatLoading} onQuickStart={handleQuickStart} />
      </div>

      {/* Right Output Area */}
      <div className="w-[500px] shrink-0 bg-surface-800 flex flex-col">
         {/* Simple header */}
         <div className="flex border-b border-surface-600 bg-surface-800 p-2 overflow-x-auto">
            {['cases', 'script', 'terminal', 'report'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveRightTab(tab as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all mr-1 capitalize ${
                  activeRightTab === tab
                    ? 'bg-brand-500/10 text-brand-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
         </div>
         
         <div className="flex-1 overflow-y-auto p-4">
            {activeRightTab === 'terminal' && (
              <TerminalOutput logs={terminalLogs} isRunning={isRunning} summary={terminalSummary} />
            )}
            {activeRightTab === 'report' && currentReport && (
              <ReportDashboard report={currentReport} />
            )}
            {activeRightTab === 'script' && currentScript && (
              <>
                <ScriptViewer script={currentScript} />
                <RunButton onRun={handleRunTests} isRunning={isRunning} />
              </>
            )}
            {activeRightTab === 'cases' && testCases.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-brand-500 mb-3">Test Cases ({testCases.length})</h3>
                {testCases.map((tc) => (
                  <TestCaseCard key={tc.id} testCase={tc} />
                ))}
              </div>
            )}
            {testCases.length === 0 && !currentScript && !currentReport && !isRunning && (
               <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-4">
                 <p className="text-sm">Outputs will appear here.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
