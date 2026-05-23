import { useState, useCallback } from 'react';
const uuid = () => crypto.randomUUID();
import { sendChatMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Message, TestCase, GeneratedScript, TestReport, AgentPhase } from '../types';

export const WELCOME_MESSAGE =
  "Hi — I'm here to help you design and automate tests. Tell me what you're building or what you need to verify, and we'll work through it together. What would you like to test first?";

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
          setTestCases(prev => {
            const existingIds = new Set(prev.map(tc => tc.id));
            const newCases = response.testCases!.filter(tc => !existingIds.has(tc.id));
            return [...prev, ...newCases];
          });
        }
        if (response.script) setCurrentScript(response.script);
        if (response.report) setCurrentReport(response.report);
        if (response.usage) setUsage(response.usage);
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
          content: `I couldn't complete that request: ${detail} If this keeps happening, check your account and API settings, then try again.`,
          timestamp: new Date(),
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
  }, []);

  return {
    messages,
    isLoading,
    currentPhase,
    sessionId,
    testCases,
    currentScript,
    currentReport,
    setCurrentScript,
    setCurrentReport,
    setTestCases,
    sendMessage,
    clearSession,
  };
}
