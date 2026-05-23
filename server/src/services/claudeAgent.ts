import '../loadEnv';
import { getMessages, getSessionMeta, appendSessionContext } from '../db/queries';
import { getSystemPrompt } from '../prompts/systemPrompt';
import { stripEmojis } from '../utils/stripEmojis';
import { getTestCasePrompt } from '../prompts/testCasePrompt';
import { getScriptPrompt } from '../prompts/scriptPrompt';
import { getReportPrompt } from '../prompts/reportPrompt';
import { createAIProvider } from './providers';
import type { AIProvider } from './providers/types';
import {
  AgentResponse,
  AgentPhase,
  Message,
  TestCase,
  GeneratedScript,
  TestReport,
  TestResult,
} from '../types';

const MAX_HISTORY = 30;

class ClaudeAgent {
  private provider: AIProvider;
  private conversationHistory: Map<string, Message[]>;
  private sessionPhases: Map<string, AgentPhase>;

  constructor() {
    this.provider = createAIProvider();
    this.conversationHistory = new Map();
    this.sessionPhases = new Map();
  }

  getProviderInfo(): { provider: string; model: string } {
    return { provider: this.provider.name, model: this.provider.model };
  }

  private async complete(
    messages: { role: 'user' | 'assistant'; content: string }[],
    maxTokens: number,
    system?: string
  ): Promise<string> {
    const raw = await this.provider.complete({ system, messages, maxTokens });
    return stripEmojis(raw);
  }

  async completeUserPrompt(prompt: string, maxTokens = 16384): Promise<string> {
    return this.complete([{ role: 'user', content: prompt }], maxTokens);
  }

  private hydrateHistory(sessionId: string): Message[] {
    const cached = this.conversationHistory.get(sessionId);
    if (cached && cached.length > 0) return [...cached];

    const fromDb = getMessages(sessionId)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    this.conversationHistory.set(sessionId, fromDb);
    return [...fromDb];
  }

  private rememberSessionFacts(sessionId: string, userMessage: string): void {
    const lower = userMessage.toLowerCase();
    const urlMatch = userMessage.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      appendSessionContext(sessionId, `URL mentioned: ${urlMatch[0]}`);
    }
    if (lower.includes('staging') || lower.includes('production') || lower.includes('dev environment')) {
      appendSessionContext(sessionId, `Environment note: ${userMessage.slice(0, 200)}`);
    }
  }

  async chat(sessionId: string, userMessage: string): Promise<AgentResponse> {
    const history = this.hydrateHistory(sessionId);
    const last = history[history.length - 1];
    if (!last || last.role !== 'user' || last.content !== userMessage) {
      history.push({ role: 'user', content: userMessage });
    }
    this.rememberSessionFacts(sessionId, userMessage);

    const trimmed = history.slice(-MAX_HISTORY);
    this.conversationHistory.set(sessionId, trimmed);

    const meta = getSessionMeta(sessionId);
    const systemPrompt = getSystemPrompt({
      testType: meta.testType,
      appContext: meta.appContext,
      messageCount: trimmed.length,
    });

    const text = await this.complete(
      trimmed.map((m) => ({ role: m.role, content: m.content })),
      8192,
      systemPrompt
    );

    trimmed.push({ role: 'assistant', content: text });
    this.conversationHistory.set(sessionId, trimmed.slice(-MAX_HISTORY));

    const phase = this.detectPhase(sessionId, text);
    this.sessionPhases.set(sessionId, phase);

    const result: AgentResponse = { message: text, phase };

    if (text.includes('TEST CASES:') || phase === 'generating') {
      const cases = this.parseTestCasesFromResponse(text);
      if (cases.length > 0) result.testCases = cases;
    }

    // Always attempt script parse if code-like content is present
    if (
      text.includes('SCRIPT:') ||
      text.includes('```typescript') ||
      text.includes('```javascript') ||
      text.includes('```ts') ||
      phase === 'reviewing'
    ) {
      const script = this.parseScriptFromResponse(text);
      if (script.code && script.code.length > 50) result.script = script;
    }

    // Always attempt report parse when reporting phase or explicit prefix
    if (text.includes('REPORT:') || phase === 'reporting') {
      const report = this.parseReportFromResponse(text);
      if (report.testSuite && report.testSuite !== 'Test Suite') result.report = report;
    }

    return result;
  }

  async generateTestCases(sessionId: string, context: string, testType = 'E2E'): Promise<TestCase[]> {
    const prompt = getTestCasePrompt(context, testType);
    const text = await this.complete([{ role: 'user', content: prompt }], 8192);
    return this.parseTestCasesFromResponse(text);
  }

  async generateScript(
    sessionId: string,
    testCases: TestCase[],
    framework: string,
    appContext = ''
  ): Promise<GeneratedScript> {
    const prompt = getScriptPrompt(testCases, framework, appContext);
    const text = await this.complete([{ role: 'user', content: prompt }], 16384);
    return this.parseScriptFromResponse(text);
  }

  async generateReport(sessionId: string, results: TestResult[], context = ''): Promise<TestReport> {
    const prompt = getReportPrompt(results, context);
    const text = await this.complete([{ role: 'user', content: prompt }], 8192);
    return this.parseReportFromResponse(text);
  }

  private detectPhase(sessionId: string, text: string): AgentPhase {
    const lower = text.toLowerCase();
    if (lower.includes('report:') || lower.includes('bug report') || lower.includes('test results')) {
      return 'reporting';
    }
    if (lower.includes('script:') || lower.includes('```typescript') || lower.includes('playwright')) {
      return 'reviewing';
    }
    if (lower.includes('test cases:') || lower.includes('tc001') || lower.includes('"id": "tc')) {
      return 'generating';
    }
    if (lower.includes('what type') || lower.includes('?') || lower.includes('could you')) {
      return 'questioning';
    }
    return this.sessionPhases.get(sessionId) || 'questioning';
  }

  private extractJson<T>(text: string): T | null {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : text;

    const start = raw.indexOf('[') >= 0 ? raw.indexOf('[') : raw.indexOf('{');
    if (start < 0) return null;

    const isArray = raw[start] === '[';
    let depth = 0;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === '[' || raw[i] === '{') depth++;
      if (raw[i] === ']' || raw[i] === '}') depth--;
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  parseTestCasesFromResponse(text: string): TestCase[] {
    const parsed = this.extractJson<TestCase[] | TestCase>(text);
    if (!parsed) return [];
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  parseScriptFromResponse(text: string): GeneratedScript {
    const parsed = this.extractJson<GeneratedScript>(text);
    if (parsed?.code) return parsed;

    const codeMatch = text.match(/```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)```/);
    return {
      code: codeMatch?.[1]?.trim() || text,
      framework: 'playwright',
      runCommand: 'npx playwright test',
      explanation: [],
      dependencies: ['@playwright/test'],
    };
  }

  private extractMarkdown(text: string): string | null {
    const fenced = text.match(/```markdown\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();
    if (text.includes('## Executive Summary') || text.includes('# ')) {
      const jsonStart = text.indexOf('```json');
      return jsonStart > 0 ? text.slice(0, jsonStart).trim() : text.trim();
    }
    return null;
  }

  parseReportFromResponse(text: string): TestReport {
    const markdownReport = this.extractMarkdown(text);
    const parsed = this.extractJson<TestReport>(text);

    const base: TestReport = parsed?.testSuite
      ? { ...parsed }
      : {
          testSuite: 'Test Suite',
          executionDate: new Date().toISOString(),
          environment: 'development',
          totalTests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          passRate: '0%',
          bugs: [],
          recommendations: [],
        };

    if (markdownReport) base.markdownReport = markdownReport;
    if (!base.releaseStatus) {
      const fail = base.failed > 0;
      base.releaseStatus = fail ? 'FAILED WITH BLOCKERS' : 'PASSED';
    }
    return base;
  }

  clearSession(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
    this.sessionPhases.delete(sessionId);
  }
}

export default new ClaudeAgent();
