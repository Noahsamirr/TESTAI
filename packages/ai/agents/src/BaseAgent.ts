/**
 * @package @testmind/ai-agents
 * @description Abstract base class for all TestMind AI agents.
 *
 * Extend this class to create a new specialised agent. Override {@link doExecute}
 * and optionally override {@link validate} for input validation.
 * The base class handles timing, error wrapping, and result structure.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IAgent, AgentTask, AgentResult, AgentCapabilityType } from './types';

export abstract class BaseAgent implements IAgent {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly capabilities: AgentCapabilityType[];

  /**
   * Subclasses implement the core logic here.
   * Should not catch its own errors — the base class will handle them.
   */
  protected abstract doExecute(task: AgentTask): Promise<Omit<AgentResult, 'taskId' | 'agentId' | 'agentName' | 'durationMs' | 'completedAt'>>;

  /**
   * Optional pre-execution validation.
   * Return an error message string if validation fails, or null if OK.
   */
  protected validate(_task: AgentTask): string | null {
    return null;
  }

  /**
   * Check if this agent can handle the given task.
   * Default implementation checks that the capability is in the agent's list.
   * Subclasses may override to add input schema checks.
   */
  canHandle(task: AgentTask): boolean {
    return this.capabilities.includes(task.capability);
  }

  /**
   * Execute the task with timing, error handling, and result wrapping.
   * This method never throws.
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const start = Date.now();

    // Validate capability
    if (!this.canHandle(task)) {
      return this.errorResult(task, start, `Agent '${this.id}' does not handle capability '${task.capability}'`);
    }

    // Run optional validation
    const validationError = this.validate(task);
    if (validationError) {
      return this.errorResult(task, start, validationError);
    }

    try {
      const partial = await this.doExecute(task);
      const durationMs = Date.now() - start;

      return {
        taskId: task.id,
        agentId: this.id,
        agentName: this.name,
        durationMs,
        completedAt: new Date().toISOString(),
        ...partial,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.errorResult(task, start, message);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  protected errorResult(task: AgentTask, startMs: number, error: string): AgentResult {
    console.error(`[${this.name}] Task ${task.id} failed: ${error}`);
    return {
      taskId: task.id,
      agentId: this.id,
      agentName: this.name,
      success: false,
      output: {},
      error,
      durationMs: Date.now() - startMs,
      completedAt: new Date().toISOString(),
    };
  }

  /** Utility: generate a new UUID */
  protected newId(): string {
    return uuidv4();
  }

  /** Utility: get a required string from the task input */
  protected requireString(task: AgentTask, key: string): string {
    const val = task.input[key];
    if (typeof val !== 'string' || !val.trim()) {
      throw new Error(`Missing required input field '${key}'`);
    }
    return val.trim();
  }

  /** Utility: get an optional string from the task input */
  protected optString(task: AgentTask, key: string, fallback = ''): string {
    const val = task.input[key];
    return typeof val === 'string' ? val : fallback;
  }

  /** Utility: get a required object from the task input */
  protected requireObject<T = Record<string, unknown>>(task: AgentTask, key: string): T {
    const val = task.input[key];
    if (!val || typeof val !== 'object' || Array.isArray(val)) {
      throw new Error(`Missing required object input field '${key}'`);
    }
    return val as T;
  }
}
