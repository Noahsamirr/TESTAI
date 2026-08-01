/**
 * @package @testmind/ai-agents
 * @description Agent Registry — discovers, registers, and resolves agents.
 *
 * The registry is a singleton that maps capabilities to agent implementations.
 * When the orchestrator receives a task, it asks the registry for the best
 * available agent for the requested capability.
 */

import type { IAgent, AgentCapabilityType, AgentTask } from './types';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private readonly agents: Map<string, IAgent> = new Map();

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register an agent. If an agent with the same id already exists,
   * it is replaced (allows hot-reloading in development).
   */
  register(agent: IAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`[AgentRegistry] Registered: ${agent.name} (${agent.id})`);
  }

  /** Unregister an agent by id */
  unregister(agentId: string): boolean {
    const existed = this.agents.has(agentId);
    this.agents.delete(agentId);
    return existed;
  }

  /** Get a specific agent by id */
  get(agentId: string): IAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Find the best agent for a task.
   * Filters by capability and then by whether canHandle() returns true.
   * Returns the first match; agents are checked in registration order.
   */
  resolve(task: AgentTask): IAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.capabilities.includes(task.capability) && agent.canHandle(task)) {
        return agent;
      }
    }
    return undefined;
  }

  /** Get all agents that support a given capability */
  findByCapability(capability: AgentCapabilityType): IAgent[] {
    return Array.from(this.agents.values()).filter((a) => a.capabilities.includes(capability));
  }

  /** List all registered agents (used by the /api/agents endpoint) */
  listAll(): IAgent[] {
    return Array.from(this.agents.values());
  }

  /** Number of registered agents */
  get size(): number {
    return this.agents.size;
  }
}
