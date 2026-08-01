/**
 * @package @testmind/ai-agents
 * @description Core type definitions for the AI multi-agent orchestration system.
 *
 * Every agent in the TestMind AI ecosystem implements the {@link IAgent} interface
 * and communicates through the {@link AgentBus}. Tasks flow from the orchestrator
 * to specialised agents and results are returned through a unified contract.
 */

// ─── Agent Capabilities ──────────────────────────────────────────────────────

export type AgentCapabilityType =
  | 'nl_test_generation'
  | 'playwright_generation'
  | 'appium_generation'
  | 'api_test_generation'
  | 'sql_test_generation'
  | 'graphql_test_generation'
  | 'soap_test_generation'
  | 'bdd_generation'
  | 'test_planning'
  | 'self_healing'
  | 'accessibility_analysis'
  | 'security_analysis'
  | 'performance_analysis'
  | 'visual_regression'
  | 'bug_investigation'
  | 'root_cause_analysis'
  | 'report_writing'
  | 'code_review'
  | 'refactoring'
  | 'documentation'
  | 'ci_cd_generation'
  | 'exploratory_testing'
  | 'test_optimisation'
  | 'flaky_detection'
  | 'regression_planning'
  | 'release_readiness'
  | 'coverage_analysis'
  | 'ticket_synchronisation'
  | 'requirement_traceability';

// ─── Task & Result Contracts ──────────────────────────────────────────────────

export interface AgentTask {
  /** Unique identifier for this task execution */
  id: string;
  /** The capability being requested */
  capability: AgentCapabilityType;
  /** Human-readable description of what needs to be done */
  description: string;
  /** Structured input payload — varies by capability */
  input: Record<string, unknown>;
  /** Optional context from previous agent results in a chain */
  context?: AgentContext;
  /** ISO timestamp when the task was created */
  createdAt: string;
  /** Optional session/user identifiers for traceability */
  sessionId?: string;
  userId?: string;
}

export interface AgentResult {
  /** Matches the originating task id */
  taskId: string;
  /** The agent that produced this result */
  agentId: string;
  agentName: string;
  /** Whether the agent completed successfully */
  success: boolean;
  /** Primary output — the generated artifact, analysis, or structured data */
  output: Record<string, unknown>;
  /** Human-readable explanation of what the agent did and why */
  reasoning?: string;
  /** Confidence score 0–1 (1 = fully confident) */
  confidence?: number;
  /** Wall-clock time the agent spent, in milliseconds */
  durationMs: number;
  /** ISO timestamp */
  completedAt: string;
  /** Any warnings that the caller should be aware of */
  warnings?: string[];
  /** Error message if success is false */
  error?: string;
}

export interface AgentContext {
  /** Prior agent results available for this task chain */
  previousResults: AgentResult[];
  /** Arbitrary key-value metadata the orchestrator attaches */
  metadata: Record<string, unknown>;
}

// ─── Agent Interface ──────────────────────────────────────────────────────────

export interface IAgent {
  /** Unique machine-readable identifier, e.g. 'planner-agent' */
  readonly id: string;
  /** Display name shown in the UI and reports */
  readonly name: string;
  /** Short description of what this agent does */
  readonly description: string;
  /** Which capabilities this agent can handle */
  readonly capabilities: AgentCapabilityType[];

  /**
   * Execute a task and return a structured result.
   * Must never throw — errors should be reported via {@link AgentResult.error}.
   */
  execute(task: AgentTask): Promise<AgentResult>;

  /**
   * Whether this agent can handle the given task (e.g. validates input schema).
   * Called by the registry before dispatching.
   */
  canHandle(task: AgentTask): boolean;
}

// ─── Agent Bus Events ─────────────────────────────────────────────────────────

export type AgentBusEvent =
  | { type: 'task:dispatched'; task: AgentTask }
  | { type: 'task:started'; taskId: string; agentId: string }
  | { type: 'task:completed'; taskId: string; result: AgentResult }
  | { type: 'task:failed'; taskId: string; error: string }
  | { type: 'agent:registered'; agentId: string }
  | { type: 'agent:unregistered'; agentId: string };

// ─── Orchestrator Options ─────────────────────────────────────────────────────

export interface OrchestratorOptions {
  /** Maximum time (ms) to wait for a single agent task. Default: 120_000 */
  taskTimeoutMs?: number;
  /** Maximum concurrent agent tasks. Default: 5 */
  maxConcurrency?: number;
  /** Whether to emit verbose logs. Default: false */
  verbose?: boolean;
}

// ─── Natural Language Test Input ──────────────────────────────────────────────

export interface NLTestInput {
  /** Free-text test scenario written by the user */
  naturalLanguage: string;
  /** Target application context */
  appContext?: {
    url?: string;
    appType?: 'web' | 'mobile' | 'api' | 'desktop';
    framework?: string;
    description?: string;
  };
  /** Desired output format */
  outputFormat?: 'playwright' | 'appium' | 'webdriverio' | 'gherkin' | 'jest' | 'pytest' | 'k6';
  /** Additional instructions/constraints */
  instructions?: string;
}

export interface NLTestOutput {
  /** Detected steps from the natural language input */
  parsedSteps: Array<{
    index: number;
    action: string;
    target?: string;
    value?: string;
    assertion?: string;
  }>;
  /** Gherkin BDD representation */
  gherkin: string;
  /** Executable test code in the requested format */
  code: string;
  /** The framework/format used */
  framework: string;
  /** Dependencies the generated code requires */
  dependencies: string[];
  /** Page Object Model suggestions */
  pageObjects?: Array<{ name: string; selectors: Record<string, string> }>;
}

// ─── Self-Healing Types ───────────────────────────────────────────────────────

export type HealingStrategy =
  | 'aria-label'
  | 'role-text'
  | 'placeholder'
  | 'data-testid'
  | 'css-selector'
  | 'xpath'
  | 'ai-dom-similarity'
  | 'visual-ocr'
  | 'neighbour-element';

export interface HealingAttempt {
  strategy: HealingStrategy;
  candidateSelector: string;
  confidence: number;
  successful: boolean;
  durationMs: number;
}

export interface HealingResult {
  originalSelector: string;
  healedSelector: string | null;
  successfulStrategy: HealingStrategy | null;
  confidence: number;
  attempts: HealingAttempt[];
  durationMs: number;
}
