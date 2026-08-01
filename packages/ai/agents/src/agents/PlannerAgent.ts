/**
 * @package @testmind/ai-agents
 * @description Planner Agent — decomposes user requirements into structured test plans.
 *
 * Given a natural language description of an application or feature, the Planner Agent
 * produces a structured test plan containing test objectives, test types to use,
 * risk areas, coverage priorities, and an estimated effort breakdown.
 */

import { BaseAgent } from '../BaseAgent';
import type { AgentTask, AgentResult, AgentCapabilityType } from '../types';

export interface TestPlan {
  title: string;
  objective: string;
  scope: string;
  testTypes: Array<{
    type: string;
    description: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    estimatedCases: number;
  }>;
  riskAreas: Array<{
    area: string;
    risk: 'High' | 'Medium' | 'Low';
    rationale: string;
  }>;
  coveragePriorities: string[];
  estimatedEffortHours: number;
  recommendedFrameworks: string[];
  entryExitCriteria: {
    entry: string[];
    exit: string[];
  };
  testPhases: Array<{
    phase: string;
    description: string;
    duration: string;
  }>;
}

export class PlannerAgent extends BaseAgent {
  readonly id = 'planner-agent';
  readonly name = 'Planner Agent';
  readonly description =
    'Decomposes requirements into comprehensive, prioritised test plans with risk analysis and effort estimates.';
  readonly capabilities: AgentCapabilityType[] = ['test_planning', 'regression_planning', 'release_readiness'];

  protected validate(task: AgentTask): string | null {
    const req = task.input['requirements'];
    if (!req || (typeof req === 'string' && !req.trim())) {
      return "Field 'requirements' is required and must be a non-empty string.";
    }
    return null;
  }

  protected async doExecute(task: AgentTask): Promise<Omit<AgentResult, 'taskId' | 'agentId' | 'agentName' | 'durationMs' | 'completedAt'>> {
    const requirements = this.requireString(task, 'requirements');
    const appType = this.optString(task, 'appType', 'web');
    const techStack = this.optString(task, 'techStack', '');

    const plan = this.buildPlan(requirements, appType, techStack);

    return {
      success: true,
      output: { plan },
      reasoning: `Analysed requirements for a ${appType} application and produced a structured test plan covering functional, non-functional, and risk-based testing dimensions.`,
      confidence: 0.92,
    };
  }

  private buildPlan(requirements: string, appType: string, techStack: string): TestPlan {
    const reqLower = requirements.toLowerCase();
    const isAPI = reqLower.includes('api') || reqLower.includes('rest') || reqLower.includes('graphql');
    const hasMobile = reqLower.includes('mobile') || reqLower.includes('android') || reqLower.includes('ios');
    const hasAuth = reqLower.includes('auth') || reqLower.includes('login') || reqLower.includes('user');
    const hasPayment = reqLower.includes('payment') || reqLower.includes('stripe') || reqLower.includes('checkout');

    const testTypes: TestPlan['testTypes'] = [
      { type: 'Smoke Testing', description: 'Verify critical paths work after each deployment', priority: 'Critical', estimatedCases: 10 },
      { type: 'Functional E2E', description: 'End-to-end user journey tests covering all requirements', priority: 'High', estimatedCases: 45 },
      { type: 'Regression', description: 'Full regression suite to catch unintended side-effects', priority: 'High', estimatedCases: 80 },
      { type: 'Accessibility (WCAG 2.2)', description: 'Automated axe-core + manual keyboard/screen reader checks', priority: 'High', estimatedCases: 20 },
      { type: 'Performance', description: 'Core Web Vitals and load testing with k6', priority: 'Medium', estimatedCases: 15 },
      { type: 'Security (OWASP Top 10)', description: 'DAST scanning for injection, broken auth, CSRF, etc.', priority: 'High', estimatedCases: 25 },
      { type: 'Cross-Browser', description: 'Chrome, Firefox, Safari, Edge compatibility', priority: 'Medium', estimatedCases: 12 },
    ];

    if (isAPI) testTypes.push({ type: 'API Contract Testing', description: 'Schema and contract validation for all endpoints', priority: 'High', estimatedCases: 30 });
    if (hasMobile) testTypes.push({ type: 'Mobile Responsive', description: 'Viewport and touch interaction testing', priority: 'Medium', estimatedCases: 18 });
    if (hasAuth) testTypes.push({ type: 'Auth & Session', description: 'Token expiry, RBAC, concurrent sessions', priority: 'Critical', estimatedCases: 20 });
    if (hasPayment) testTypes.push({ type: 'Payment Flow', description: 'Transaction integrity, failure scenarios, refund flows', priority: 'Critical', estimatedCases: 15 });

    const riskAreas: TestPlan['riskAreas'] = [
      { area: 'Authentication & Session Management', risk: 'High', rationale: 'Security breaches and data exposure are catastrophic' },
      { area: 'Data Persistence & Integrity', risk: 'High', rationale: 'Corrupted data causes cascading failures' },
      { area: 'Third-Party Integrations', risk: 'Medium', rationale: 'External services can change without warning' },
      { area: 'Performance Under Load', risk: 'Medium', rationale: 'Traffic spikes can degrade user experience' },
      { area: 'Cross-Browser Rendering', risk: 'Low', rationale: 'Minor visual inconsistencies rarely block users' },
    ];

    const frameworks: string[] = ['Playwright'];
    if (isAPI) frameworks.push('@playwright/test (API mode)', 'Supertest');
    if (hasMobile) frameworks.push('Appium', 'Detox');
    if (techStack.toLowerCase().includes('react')) frameworks.push('React Testing Library', 'Vitest');

    return {
      title: `Comprehensive Test Plan`,
      objective: `Ensure the ${appType} application meets functional, performance, security, and accessibility requirements with ≥85% automation coverage.`,
      scope: requirements.slice(0, 300),
      testTypes,
      riskAreas,
      coveragePriorities: [
        'Authentication and authorisation flows',
        'Core user journeys (happy path + error paths)',
        'Data validation and boundary conditions',
        'API contract integrity',
        'Accessibility for all interactive components',
        'Security headers and vulnerability surface',
      ],
      estimatedEffortHours: testTypes.reduce((sum, t) => sum + Math.ceil(t.estimatedCases * 0.5), 0),
      recommendedFrameworks: frameworks,
      entryExitCriteria: {
        entry: [
          'All features code-complete and deployed to staging',
          'API contracts finalised',
          'Test data seeded',
          'CI pipeline green',
        ],
        exit: [
          'Zero Critical/High severity bugs open',
          'Pass rate ≥ 95% on smoke suite',
          'Performance: p95 < 2s under 100 VUs',
          'Accessibility: 0 Critical WCAG violations',
          'Security: 0 Critical/High OWASP findings',
        ],
      },
      testPhases: [
        { phase: 'Phase 1 — Smoke & Sanity', description: 'Verify deployment and critical paths', duration: '1 day' },
        { phase: 'Phase 2 — Functional Testing', description: 'All user stories and acceptance criteria', duration: '3–5 days' },
        { phase: 'Phase 3 — Non-Functional', description: 'Performance, security, accessibility, visual', duration: '2–3 days' },
        { phase: 'Phase 4 — Regression & Sign-off', description: 'Full regression, defect verification, release decision', duration: '1–2 days' },
      ],
    };
  }
}
