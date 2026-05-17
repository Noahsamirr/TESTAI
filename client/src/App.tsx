import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import SubscriptionModal from './components/Auth/SubscriptionModal';
import { useChat } from './hooks/useChat';
import { useTestSession } from './hooks/useTestSession';
import MainLayout from './components/Layout/MainLayout';
import SessionHistory from './components/Sidebar/SessionHistory';
import TestTypeSelector from './components/Sidebar/TestTypeSelector';
import ChatWindow from './components/Chat/ChatWindow';
import InputBar from './components/Chat/InputBar';
import TestCaseCard from './components/TestPanel/TestCaseCard';
import ScriptViewer from './components/TestPanel/ScriptViewer';
import RunButton from './components/TestPanel/RunButton';
import TerminalOutput from './components/TestPanel/TerminalOutput';
import ReportDashboard from './components/Reports/ReportDashboard';
import { runScript } from './services/api';
import wsService from './services/websocket';
import { WSEvent } from './types';

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();
  const [showPlans, setShowPlans] = useState(false);

  const {
    messages,
    isLoading: chatLoading,
    currentPhase,
    sessionId,
    testCases,
    currentScript,
    currentReport,
    setCurrentReport,
    sendMessage,
    clearSession,
  } = useChat();

  const {
    rightPanelCollapsed,
    setRightPanelCollapsed,
    isRunning,
    setIsRunning,
    runnerId,
    setRunnerId,
    panelMode,
    updatePanelMode,
  } = useTestSession();

  const [selectedTestType, setSelectedTestType] = useState<string>();
  const [terminalLogs, setTerminalLogs] = useState<{ text: string; isError: boolean; type?: 'passed' | 'failed' | 'skipped' }[]>([]);
  const [terminalSummary, setTerminalSummary] = useState<string>();

  useEffect(() => {
    updatePanelMode(currentPhase, !!currentScript, !!currentReport, isRunning);
  }, [currentPhase, currentScript, currentReport, isRunning, updatePanelMode]);

  const handleQuickStart = useCallback(
    (text: string) => sendMessage(text),
    [sendMessage]
  );

  const handleRunTests = async () => {
    if (!currentScript?.id) {
      setTerminalLogs([{ text: 'No saved script ID — run will use simulated results', isError: false }]);
    }

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
            setTerminalLogs((prev) => [
              ...prev,
              {
                text: `Progress: ${event.passed}/${event.total} passed, ${event.failed} failed`,
                isError: false,
              },
            ]);
            break;
          case 'runner:complete':
            setCurrentReport(event.report);
            setTerminalSummary(
              `Complete: ${event.report.passed} passed, ${event.report.failed} failed — ${event.report.passRate}`
            );
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
      setTerminalLogs((prev) => [
        ...prev,
        { text: error instanceof Error ? error.message : 'Run failed', isError: true },
      ]);
      setIsRunning(false);
    }
  };

  const renderRightPanel = () => {
    if (isRunning || panelMode === 'terminal') {
      return <TerminalOutput logs={terminalLogs} isRunning={isRunning} summary={terminalSummary} />;
    }

    if (currentReport) {
      return <ReportDashboard report={currentReport} />;
    }

    if (currentScript || panelMode === 'script') {
      return (
        <>
          <ScriptViewer script={currentScript!} />
          <RunButton onRun={handleRunTests} isRunning={isRunning} />
        </>
      );
    }

    if (testCases.length > 0 || panelMode === 'cases') {
      return (
        <div>
          <h3 className="text-sm font-semibold text-accent-green mb-3">
            Test Cases ({testCases.length})
          </h3>
          {testCases.map((tc) => (
            <TestCaseCard key={tc.id} testCase={tc} />
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-12">
        <p className="text-sm leading-relaxed">Test cases, scripts, and reports will show up here as we work through your scenario.</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <>
      <MainLayout
        rightPanelCollapsed={rightPanelCollapsed}
        onToggleRightPanel={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        onManagePlan={() => setShowPlans(true)}
        sidebar={
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-accent-green text-lg">TestMind</span>
              </div>
              <p className="text-xs text-gray-500">Testing assistant</p>
            </div>
            <SessionHistory sessionId={sessionId} onNewSession={clearSession} />
            <div className="mt-6">
              <TestTypeSelector
                selected={selectedTestType}
                onSelect={(type) => {
                  setSelectedTestType(type);
                  handleQuickStart(`I want to create ${type} tests`);
                }}
              />
            </div>
          </>
        }
        chat={
          <>
            <ChatWindow messages={messages} isLoading={chatLoading} onQuickStart={handleQuickStart} />
            <InputBar onSend={sendMessage} isLoading={chatLoading} onQuickStart={handleQuickStart} />
          </>
        }
        rightPanel={renderRightPanel()}
      />
      <SubscriptionModal open={showPlans} onClose={() => setShowPlans(false)} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
