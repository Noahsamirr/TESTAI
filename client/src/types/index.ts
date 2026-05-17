export type AgentPhase = 'questioning' | 'generating' | 'reviewing' | 'reporting';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  phase?: AgentPhase;
}

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  title: string;
  type: string;
  priority: 'High' | 'Medium' | 'Low';
  preconditions: string[];
  steps: TestStep[];
  expectedOutcome: string;
  tags: string[];
  automationStatus: string;
}

export interface ScriptSection {
  section: string;
  description: string;
  lineRange: string;
}

export interface GeneratedScript {
  id?: string;
  code: string;
  framework: string;
  runCommand: string;
  explanation: ScriptSection[];
  dependencies: string[];
}

export interface Bug {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  screenshot?: string;
}

export interface TestReport {
  testSuite: string;
  executionDate: string;
  environment: string;
  releaseStatus?: string;
  automationCoverage?: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: string;
  bugs: Bug[];
  recommendations: string[];
  markdownReport?: string;
}

export type WSEvent =
  | { type: 'runner:start'; runnerId: string; framework: string }
  | { type: 'runner:log'; runnerId: string; line: string; isError: boolean }
  | { type: 'runner:progress'; runnerId: string; passed: number; failed: number; total: number }
  | { type: 'runner:complete'; runnerId: string; results: unknown[]; report: TestReport }
  | { type: 'runner:error'; runnerId: string; error: string };
