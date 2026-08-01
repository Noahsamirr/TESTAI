/**
 * @package @testmind/ai-agents
 * @description Barrel export for all TestMind AI agents.
 * Import from this file to get all agents and the orchestration infrastructure.
 */

// ─── Orchestration Infrastructure ─────────────────────────────────────────────
export * from './types';
export { BaseAgent } from './BaseAgent';
export { AgentRegistry } from './AgentRegistry';
export { AgentBus } from './AgentBus';

// ─── Specialised Agents ────────────────────────────────────────────────────────
export { PlannerAgent } from './agents/PlannerAgent';
export { NLTestGenerator } from './agents/NLTestGenerator';
export { SelfHealingAgent } from './agents/SelfHealingAgent';
export { BugInvestigationAgent } from './agents/BugInvestigationAgent';
export { PlaywrightGeneratorAgent } from './agents/PlaywrightGeneratorAgent';
export { ReportWriterAgent } from './agents/ReportWriterAgent';
export { ExploratoryAgent } from './agents/ExploratoryAgent';

// ─── Agent Bootstrap ───────────────────────────────────────────────────────────

import { AgentRegistry } from './AgentRegistry';
import { PlannerAgent } from './agents/PlannerAgent';
import { NLTestGenerator } from './agents/NLTestGenerator';
import { SelfHealingAgent } from './agents/SelfHealingAgent';
import { BugInvestigationAgent } from './agents/BugInvestigationAgent';
import { PlaywrightGeneratorAgent } from './agents/PlaywrightGeneratorAgent';
import { ReportWriterAgent } from './agents/ReportWriterAgent';
import { ExploratoryAgent } from './agents/ExploratoryAgent';

/**
 * Register all built-in agents with the singleton registry.
 * Call this once at application startup (e.g. in server/src/index.ts).
 */
export function bootstrapAgents(): AgentRegistry {
  const registry = AgentRegistry.getInstance();

  registry.register(new PlannerAgent());
  registry.register(new NLTestGenerator());
  registry.register(new SelfHealingAgent());
  registry.register(new BugInvestigationAgent());
  registry.register(new PlaywrightGeneratorAgent());
  registry.register(new ReportWriterAgent());
  registry.register(new ExploratoryAgent());

  console.log(`[Agents] Bootstrapped ${registry.size} agents.`);
  return registry;
}
