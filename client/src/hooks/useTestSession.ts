import { useState } from 'react';
import { AgentPhase } from '../types';

export function useTestSession() {
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runnerId, setRunnerId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'empty' | 'cases' | 'script' | 'terminal' | 'report'>('empty');

  const updatePanelMode = (phase: AgentPhase, hasScript: boolean, hasReport: boolean, running: boolean) => {
    if (running) {
      setPanelMode('terminal');
    } else if (hasReport) {
      setPanelMode('report');
    } else if (hasScript) {
      setPanelMode('script');
    } else if (phase === 'generating' || phase === 'reviewing') {
      setPanelMode('cases');
    } else {
      setPanelMode('empty');
    }
  };

  return {
    rightPanelCollapsed,
    setRightPanelCollapsed,
    isRunning,
    setIsRunning,
    runnerId,
    setRunnerId,
    panelMode,
    setPanelMode,
    updatePanelMode,
  };
}
