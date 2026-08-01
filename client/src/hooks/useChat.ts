import { useState, useCallback } from 'react';
const uuid = () => crypto.randomUUID();
import { sendChatMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Message,
  TestCase,
  GeneratedScript,
  TestReport,
  AgentPhase,
  SuggestedAction,
  AICapability,
} from '../types';

export const WELCOME_MESSAGE =
  "Hi — I'm QualityForge AI, your Senior QA Architect and Test Automation Lead. I help teams design bulletproof test strategies, generate end-to-end automation scripts (Playwright, Cypress, Appium, k6, Jest), analyze results, and produce professional quality reports.\n\nI can help you with:\n• **Test Planning & Strategy** — comprehensive coverage matrices tailored to your stack\n• **Test Case Generation** — structured scenarios covering happy paths, edge cases, and security\n• **Automation Scripts** — Playwright, Cypress, Appium, k6 load tests, API testing\n• **Execution & Triage** — run scripts, analyze failures, distinguish bugs from flakes\n• **Reporting & CI** — executive reports, bug triage, GitHub Actions/GitLab CI pipelines\n\nTell me what you're building, paste a URL, or describe the flows that need testing. What would you like to start with?";

export function useChat() {
  const { setUsage } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
      phase: 'questioning',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<AgentPhase>('questioning');
  const [sessionId, setSessionId] = useState<string>(() => uuid());
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [currentScript, setCurrentScript] = useState<GeneratedScript | null>(null);
  const [currentReport, setCurrentReport] = useState<TestReport | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [capabilitiesUsed, setCapabilitiesUsed] = useState<AICapability[]>([]);
  const [confidence, setConfidence] = useState<number>(1);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = {
        id: uuid(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const response = await sendChatMessage(sessionId, text.trim());
        setSessionId(response.sessionId);

        const assistantMsg: Message = {
          id: uuid(),
          role: 'assistant',
          content: response.reply,
          timestamp: new Date(),
          phase: response.phase as AgentPhase,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setCurrentPhase(response.phase as AgentPhase);

        if (response.testCases?.length) {
          setTestCases((prev) => {
            const existingIds = new Set(prev.map((tc) => tc.id));
            const newCases = response.testCases!.filter((tc) => !existingIds.has(tc.id));
            return [...prev, ...newCases];
          });
        }
        if (response.script) setCurrentScript(response.script);
        if (response.report) setCurrentReport(response.report);
        if (response.usage) setUsage(response.usage);
        if (response.suggestedActions?.length) setSuggestedActions(response.suggestedActions);
        if (response.capabilitiesUsed?.length) setCapabilitiesUsed(response.capabilitiesUsed);
        if (typeof response.confidence === 'number') setConfidence(response.confidence);
      } catch (error) {
        let detail = 'Something went wrong on our end.';
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosErr = error as { response?: { data?: { error?: string } } };
          detail = axiosErr.response?.data?.error ?? detail;
        } else if (error instanceof Error) {
          detail = error.message;
        }

        const errMsg: Message = {
          id: uuid(),
          role: 'assistant',
          content: `I couldn't complete that request: ${detail}`,
          timestamp: new Date(),
          phase: 'questioning',
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading, setUsage]
  );

  const clearSession = useCallback(() => {
    const newId = uuid();
    setSessionId(newId);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
        phase: 'questioning',
      },
    ]);
    setCurrentPhase('questioning');
    setTestCases([]);
    setCurrentScript(null);
    setCurrentReport(null);
    setSuggestedActions([]);
    setCapabilitiesUsed([]);
    setConfidence(1);
  }, []);

  return {
    messages,
    isLoading,
    currentPhase,
    sessionId,
    testCases,
    currentScript,
    currentReport,
    suggestedActions,
    capabilitiesUsed,
    confidence,
    setCurrentScript,
    setCurrentReport,
    setTestCases,
    setSuggestedActions,
    sendMessage,
    clearSession,
  };
}
