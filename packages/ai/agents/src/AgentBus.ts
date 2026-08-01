/**
 * @package @testmind/ai-agents
 * @description Agent Bus — the central event-driven orchestration layer.
 *
 * The AgentBus connects task producers (API routes, the UI) to specialised agents
 * via the AgentRegistry. It enforces concurrency limits, task timeouts, and
 * emits lifecycle events for observability.
 *
 * Usage:
 *   const bus = AgentBus.getInstance();
 *   const result = await bus.dispatch({ capability: 'nl_test_generation', ... });
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistry } from './AgentRegistry';
import type {
  AgentTask,
  AgentResult,
  AgentBusEvent,
  AgentContext,
  AgentCapabilityType,
  OrchestratorOptions,
} from './types';

const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes per task
const DEFAULT_MAX_CONCURRENCY = 5;

export class AgentBus extends EventEmitter {
  private static instance: AgentBus;
  private readonly registry: AgentRegistry;
  private readonly options: Required<OrchestratorOptions>;
  private activeTaskCount = 0;

  private constructor(options: OrchestratorOptions = {}) {
    super();
    this.setMaxListeners(200);
    this.registry = AgentRegistry.getInstance();
    this.options = {
      taskTimeoutMs: options.taskTimeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxConcurrency: options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
      verbose: options.verbose ?? false,
    };
  }

  static getInstance(options?: OrchestratorOptions): AgentBus {
    if (!AgentBus.instance) {
      AgentBus.instance = new AgentBus(options);
    }
    return AgentBus.instance;
  }

  // ─── Core Dispatch ────────────────────────────────────────────────────────

  /**
   * Dispatch a task to the best available agent.
   * Returns a settled AgentResult — never throws.
   */
  async dispatch(
    partial: Omit<AgentTask, 'id' | 'createdAt'> & { id?: string },
    context?: AgentContext
  ): Promise<AgentResult> {
    const task: AgentTask = {
      id: partial.id ?? uuidv4(),
      createdAt: new Date().toISOString(),
      context,
      ...partial,
    };

    this.emit('event', { type: 'task:dispatched', task } satisfies AgentBusEvent);
    if (this.options.verbose) {
      console.log(`[AgentBus] Dispatching ${task.capability} (${task.id})`);
    }

    const agent = this.registry.resolve(task);
    if (!agent) {
      const err = `No agent registered for capability '${task.capability}'`;
      this.emit('event', { type: 'task:failed', taskId: task.id, error: err } satisfies AgentBusEvent);
      return {
        taskId: task.id,
        agentId: 'bus',
        agentName: 'AgentBus',
        success: false,
        output: {},
        error: err,
        durationMs: 0,
        completedAt: new Date().toISOString(),
      };
    }

    // Check concurrency limit
    if (this.activeTaskCount >= this.options.maxConcurrency) {
      const err = `Concurrency limit (${this.options.maxConcurrency}) reached — try again shortly`;
      return {
        taskId: task.id,
        agentId: agent.id,
        agentName: agent.name,
        success: false,
        output: {},
        error: err,
        durationMs: 0,
        completedAt: new Date().toISOString(),
      };
    }

    this.activeTaskCount++;
    this.emit('event', { type: 'task:started', taskId: task.id, agentId: agent.id } satisfies AgentBusEvent);

    try {
      const result = await Promise.race([
        agent.execute(task),
        this.timeoutPromise<AgentResult>(task.id, agent.id, agent.name),
      ]);

      this.emit('event', { type: 'task:completed', taskId: task.id, result } satisfies AgentBusEvent);
      if (this.options.verbose) {
        console.log(`[AgentBus] ${agent.name} completed in ${result.durationMs}ms`);
      }
      return result;
    } finally {
      this.activeTaskCount--;
    }
  }

  /**
   * Dispatch multiple tasks and run them up to the concurrency limit.
   * Results are returned in input order.
   */
  async dispatchAll(
    tasks: (Omit<AgentTask, 'id' | 'createdAt'> & { id?: string })[],
    context?: AgentContext
  ): Promise<AgentResult[]> {
    // Run with bounded concurrency
    const results: AgentResult[] = new Array(tasks.length);
    const queue = tasks.map((task, idx) => ({ task, idx }));

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        results[item.idx] = await this.dispatch(item.task, context);
      }
    };

    const workers = Array.from({ length: Math.min(this.options.maxConcurrency, tasks.length) }, worker);
    await Promise.all(workers);
    return results;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private timeoutPromise<T>(taskId: string, agentId: string, agentName: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out after ${this.options.taskTimeoutMs}ms`));
      }, this.options.taskTimeoutMs);
    }) as Promise<T>;
  }

  /** List all registered agents with their capabilities */
  listAgents() {
    return this.registry.listAll().map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      capabilities: a.capabilities,
    }));
  }

  /** Register a new agent at runtime */
  registerAgent(agent: import('./types').IAgent): void {
    this.registry.register(agent);
    this.emit('event', { type: 'agent:registered', agentId: agent.id } satisfies AgentBusEvent);
  }

  get concurrency(): { active: number; limit: number } {
    return { active: this.activeTaskCount, limit: this.options.maxConcurrency };
  }

  findAgentsByCapability(capability: AgentCapabilityType) {
    return this.registry.findByCapability(capability).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      capabilities: a.capabilities,
    }));
  }
}
