/**
 * @service AgentOrchestratorService
 * @description Server-side wrapper that bridges the HTTP API to the agent system.
 *
 * This service initialises the AgentBus, registers all built-in agents, and
 * exposes a clean async interface for the Express route handlers.
 *
 * It also persists agent task results to the database and broadcasts
 * real-time events via WebSocket so the dashboard can show live agent activity.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/schema';

// Inline the agent types and bus to avoid monorepo import issues in the server
// (until the packages are properly linked via pnpm workspaces)
import type { AgentTask, AgentResult, AgentCapabilityType } from '../../../packages/ai/agents/src/types';
import { AgentBus } from '../../../packages/ai/agents/src/AgentBus';
import { bootstrapAgents } from '../../../packages/ai/agents/src/index';
import claudeAgent from './claudeAgent';

export interface AgentRunRecord {
  id: string;
  capability: string;
  agentId: string;
  agentName: string;
  status: 'running' | 'success' | 'failed';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  reasoning?: string;
  confidence?: number;
  durationMs?: number;
  userId?: string;
  sessionId?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

class AgentOrchestratorService extends EventEmitter {
  private bus: AgentBus;
  private initialized = false;

  constructor() {
    super();
    this.setMaxListeners(100);
    this.bus = AgentBus.getInstance({ taskTimeoutMs: 120_000, maxConcurrency: 8, verbose: true });
  }

  /** Must be called once at server startup */
  initialize(): void {
    if (this.initialized) return;
    bootstrapAgents();
    this.initialized = true;
    console.log('[AgentOrchestrator] Initialized with', this.bus.listAgents().length, 'agents');
  }

  /** Run a single agent task and persist the result */
  async runTask(
    capability: AgentCapabilityType,
    input: Record<string, unknown>,
    options: { userId?: string; sessionId?: string; description?: string } = {}
  ): Promise<AgentRunRecord> {
    if (!this.initialized) this.initialize();

    const taskId = uuidv4();
    const record: AgentRunRecord = {
      id: taskId,
      capability,
      agentId: 'pending',
      agentName: 'Pending',
      status: 'running',
      input,
      userId: options.userId,
      sessionId: options.sessionId,
      createdAt: new Date().toISOString(),
    };

    // Persist "running" state
    this.persistRecord(record);
    this.emit('agent:started', record);

    const task: Omit<AgentTask, 'id' | 'createdAt'> = {
      capability,
      description: options.description ?? `Run ${capability}`,
      input,
      sessionId: options.sessionId,
      userId: options.userId,
    };

    const result: AgentResult = await this.bus.dispatch({ ...task, id: taskId });

    // Update record with result
    record.agentId = result.agentId;
    record.agentName = result.agentName;
    record.status = result.success ? 'success' : 'failed';
    record.output = result.output;
    record.reasoning = result.reasoning;
    record.confidence = result.confidence;
    record.durationMs = result.durationMs;
    record.completedAt = result.completedAt;
    record.error = result.error;

    // Persist final state
    this.persistRecord(record);
    this.emit('agent:completed', record);

    return record;
  }

  /**
   * Natural Language → Executable Tests shortcut
   * Uses the NLTestGenerator agent under the hood.
   */
  async generateFromNaturalLanguage(
    naturalLanguage: string,
    opts: {
      appContext?: Record<string, unknown>;
      outputFormat?: string;
      instructions?: string;
      userId?: string;
      sessionId?: string;
    } = {}
  ): Promise<AgentRunRecord> {
    return this.runTask(
      'nl_test_generation',
      {
        naturalLanguage,
        appContext: opts.appContext,
        outputFormat: opts.outputFormat ?? 'playwright',
        instructions: opts.instructions,
      },
      { userId: opts.userId, sessionId: opts.sessionId, description: 'Generate tests from natural language' }
    );
  }

  /**
   * Self-healing: attempt to recover a broken selector.
   */
  async healSelector(
    brokenSelector: string,
    domElements: unknown[],
    opts: { elementContext?: Record<string, string>; targetDescription?: string; userId?: string } = {}
  ): Promise<AgentRunRecord> {
    return this.runTask(
      'self_healing',
      { brokenSelector, domElements, elementContext: opts.elementContext, targetDescription: opts.targetDescription },
      { userId: opts.userId, description: `Heal selector: ${brokenSelector}` }
    );
  }

  /**
   * Bug investigation: analyse a failure and suggest a fix.
   */
  async investigateBug(
    errorLog: string,
    opts: { stackTrace?: string; testCode?: string; testName?: string; retryCount?: number; userId?: string } = {}
  ): Promise<AgentRunRecord> {
    return this.runTask(
      'bug_investigation',
      {
        errorLog,
        stackTrace: opts.stackTrace,
        testCode: opts.testCode,
        testName: opts.testName,
        retryCount: opts.retryCount ?? 0,
      },
      { userId: opts.userId, description: 'Investigate test failure' }
    );
  }

  /**
   * Plan tests from requirements.
   */
  async planTests(
    requirements: string,
    opts: { appType?: string; techStack?: string; userId?: string } = {}
  ): Promise<AgentRunRecord> {
    return this.runTask(
      'test_planning',
      { requirements, appType: opts.appType ?? 'web', techStack: opts.techStack ?? '' },
      { userId: opts.userId, description: 'Generate test plan from requirements' }
    );
  }

  /** List all registered agents */
  listAgents() {
    if (!this.initialized) this.initialize();
    return this.bus.listAgents();
  }

  /** Get recent agent runs from DB */
  getRecentRuns(userId?: string, limit = 20): AgentRunRecord[] {
    try {
      const db = getDB();
      if (userId) {
        return db
          .prepare(`SELECT * FROM agent_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
          .all(userId, limit) as AgentRunRecord[];
      }
      return db
        .prepare(`SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?`)
        .all(limit) as AgentRunRecord[];
    } catch {
      return [];
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private persistRecord(record: AgentRunRecord): void {
    try {
      const db = getDB();
      db.prepare(`
        INSERT OR REPLACE INTO agent_runs (
          id, capability, agent_id, agent_name, status,
          input_json, output_json, reasoning, confidence,
          duration_ms, user_id, session_id, created_at, completed_at, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id,
        record.capability,
        record.agentId,
        record.agentName,
        record.status,
        JSON.stringify(record.input),
        record.output ? JSON.stringify(record.output) : null,
        record.reasoning ?? null,
        record.confidence ?? null,
        record.durationMs ?? null,
        record.userId ?? null,
        record.sessionId ?? null,
        record.createdAt,
        record.completedAt ?? null,
        record.error ?? null
      );
    } catch {
      // DB table may not exist yet — schema migration will add it
    }
  }
}

export default new AgentOrchestratorService();
