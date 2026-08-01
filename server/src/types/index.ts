export type AgentPhase = 'questioning' | 'analyzing' | 'generating' | 'reviewing' | 'executing' | 'reporting' | 'debugging' | 'optimizing';

export type AICapability =
  | 'test_planning'
  | 'test_case_generation'
  | 'script_generation'
  | 'script_execution'
  | 'result_analysis'
  | 'report_generation'
  | 'bug_triage'
  | 'accessibility_testing'
  | 'performance_testing'
  | 'security_testing'
  | 'api_testing'
  | 'visual_testing'
  | 'mobile_testing'
  | 'load_testing'
  | 'regression_suggestions'
  | 'code_review'
  | 'test_data_generation'
  | 'ci_cd_integration'
  | 'test_optimization'
  | 'flaky_test_detection';

export interface SuggestedAction {
  id: string;
  label: string;
  description: string;
  prompt: string;
  icon?: string;
  capability: AICapability;
}

export interface TestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: 'High' | 'Medium' | 'Low';
  preconditions: string[];
  steps: TestStep[];
  expectedOutcome: string;
  tags: string[];
  automationStatus: string;
  estimatedDuration?: number;
  module?: string;
  coverageArea?: string;
}

export interface ScriptSection {
  section: string;
  description: string;
  lineRange: string;
}

export interface GeneratedScript {
  id?: string;
  filePath?: string;
  code: string;
  framework: string;
  runCommand: string;
  explanation: ScriptSection[];
  dependencies: string[];
  language?: string;
  configSnippet?: string;
  setupInstructions?: string[];
}

export interface Bug {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: string;
  priority?: 'Blocker' | 'High' | 'Medium' | 'Low';
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  screenshot?: string;
  testScript?: string;
  affectedModule?: string;
  environment?: string;
  rootCause?: string;
  fixSuggestion?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'pass' | 'fail' | 'warning';
}

export interface AccessibilityIssue {
  id: string;
  rule: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  element: string;
  description: string;
  fix?: string;
}

export interface SecurityVulnerability {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  cwe?: string;
  description: string;
  location?: string;
  remediation?: string;
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
  totalDurationMs?: number;
  flakyTests?: string[];
  bugs: Bug[];
  recommendations: string[];
  markdownReport?: string;
  performanceMetrics?: PerformanceMetric[];
  accessibilityIssues?: AccessibilityIssue[];
  securityFindings?: SecurityVulnerability[];
  coverageByModule?: { module: string; total: number; passed: number; failed: number }[];
  regressionRisk?: 'Low' | 'Medium' | 'High';
  nextActions?: string[];
}

export interface TestResult {
  id: string;
  title: string;
  module?: string;
  status: 'passed' | 'failed' | 'skipped' | 'flaky';
  duration: number;
  error?: string;
  errorScreenshot?: string;
  retries?: number;
  steps?: TestStep[];
}

export interface AgentResponse {
  message: string;
  testCases?: TestCase[];
  script?: GeneratedScript;
  report?: TestReport;
  phase: AgentPhase;
  suggestedActions?: SuggestedAction[];
  capabilitiesUsed?: AICapability[];
  confidence?: number;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  phase?: AgentPhase;
}

export type WSEvent =
  | { type: 'runner:start'; runnerId: string; framework: string }
  | { type: 'runner:log'; runnerId: string; line: string; isError: boolean }
  | { type: 'runner:progress'; runnerId: string; passed: number; failed: number; total: number }
  | { type: 'runner:complete'; runnerId: string; results: TestResult[]; report: TestReport }
  | { type: 'runner:error'; runnerId: string; error: string }
  | { type: 'runner:stopped'; runnerId: string }
  | { type: 'runner:timeout'; runnerId: string }
  | { type: 'runner:artifact'; runnerId: string; artifactType: string; path: string };
