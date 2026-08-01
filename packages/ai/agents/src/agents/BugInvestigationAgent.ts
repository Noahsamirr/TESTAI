/**
 * @package @testmind/ai-agents
 * @description Bug Investigation Agent — performs deep root cause analysis on test failures.
 *
 * Given a failure log, stack trace, and optional DOM/network context, this agent:
 *   1. Classifies the failure type (flaky, genuine, environment, locator)
 *   2. Identifies the root cause
 *   3. Generates an actionable fix suggestion
 *   4. Estimates regression risk
 *   5. Suggests test improvements to prevent recurrence
 */

import { BaseAgent } from '../BaseAgent';
import type { AgentTask, AgentResult, AgentCapabilityType } from '../types';

export type FailureClass =
  | 'genuine_failure'      // Application code bug
  | 'locator_failure'      // Selector no longer valid
  | 'timing_failure'       // Race condition / missing await / animation
  | 'data_failure'         // Test data missing or incorrect
  | 'environment_failure'  // Network, config, or infra issue
  | 'flaky_test'           // Intermittently failing, likely timing
  | 'assertion_mismatch'   // Wrong expected value in assertion
  | 'auth_failure'         // Session expired or auth blocked
  | 'unknown';

export interface RootCauseAnalysis {
  failureClass: FailureClass;
  confidence: number;
  summary: string;
  rootCause: string;
  evidence: string[];
  fixSuggestion: string;
  codeChange?: string;
  regressionRisk: 'High' | 'Medium' | 'Low';
  preventionRecommendations: string[];
  relatedPatterns: string[];
  estimatedFixTimeMinutes: number;
}

export class BugInvestigationAgent extends BaseAgent {
  readonly id = 'bug-investigation-agent';
  readonly name = 'Bug Investigation Agent';
  readonly description =
    'Performs root cause analysis on test failures, classifies failure types, and generates actionable fix suggestions.';
  readonly capabilities: AgentCapabilityType[] = ['bug_investigation', 'root_cause_analysis', 'flaky_detection'];

  protected validate(task: AgentTask): string | null {
    if (!task.input['errorLog'] && !task.input['stackTrace'] && !task.input['errorMessage']) {
      return "At least one of 'errorLog', 'stackTrace', or 'errorMessage' is required.";
    }
    return null;
  }

  protected async doExecute(
    task: AgentTask
  ): Promise<Omit<AgentResult, 'taskId' | 'agentId' | 'agentName' | 'durationMs' | 'completedAt'>> {
    const errorLog = this.optString(task, 'errorLog');
    const stackTrace = this.optString(task, 'stackTrace');
    const errorMessage = this.optString(task, 'errorMessage');
    const testCode = this.optString(task, 'testCode');
    const testName = this.optString(task, 'testName', 'Unknown Test');
    const retryCount = (task.input['retryCount'] as number) ?? 0;

    const combined = [errorLog, stackTrace, errorMessage].filter(Boolean).join('\n');
    const analysis = this.analyse(combined, testCode, testName, retryCount);

    return {
      success: true,
      output: { analysis },
      reasoning: `Classified failure as '${analysis.failureClass}' with ${Math.round(analysis.confidence * 100)}% confidence. Root cause: ${analysis.rootCause.slice(0, 100)}`,
      confidence: analysis.confidence,
    };
  }

  private analyse(log: string, testCode: string, testName: string, retryCount: number): RootCauseAnalysis {
    const logLower = log.toLowerCase();

    // Classify failure
    const { failureClass, confidence } = this.classify(logLower, retryCount);

    // Build evidence list
    const evidence = this.extractEvidence(log);

    // Generate root cause and fix based on classification
    return {
      ...this.buildAnalysis(failureClass, log, logLower, testCode, testName),
      failureClass,
      confidence,
      evidence,
    };
  }

  private classify(log: string, retryCount: number): { failureClass: FailureClass; confidence: number } {
    // Locator failures
    if (log.includes('strict mode violation') || log.includes('locator resolved to') || log.includes('no element found') || log.includes('unable to find element') || log.includes('selector') || log.includes('element handle is disposed')) {
      return { failureClass: 'locator_failure', confidence: 0.93 };
    }

    // Timing failures
    if (log.includes('timeout') || log.includes('timed out') || log.includes('exceeded') || log.includes('waitfor') || log.includes('animation') || log.includes('race condition')) {
      // If also retried many times, likely flaky
      if (retryCount >= 2) return { failureClass: 'flaky_test', confidence: 0.82 };
      return { failureClass: 'timing_failure', confidence: 0.88 };
    }

    // Assertion mismatches
    if (log.includes('expect(') || log.includes('assertion failed') || log.includes('expected') || log.includes('received') || log.includes('assertionerror') || log.includes('not equal')) {
      return { failureClass: 'assertion_mismatch', confidence: 0.9 };
    }

    // Auth failures
    if (log.includes('401') || log.includes('403') || log.includes('unauthorized') || log.includes('forbidden') || log.includes('session expired') || log.includes('token')) {
      return { failureClass: 'auth_failure', confidence: 0.91 };
    }

    // Environment / network failures
    if (log.includes('econnrefused') || log.includes('enotfound') || log.includes('network') || log.includes('fetch failed') || log.includes('502') || log.includes('503') || log.includes('500') || log.includes('cors')) {
      return { failureClass: 'environment_failure', confidence: 0.87 };
    }

    // Data failures
    if (log.includes('null') || log.includes('undefined') || log.includes('not found') || log.includes('does not exist') || log.includes('data') || log.includes('empty')) {
      return { failureClass: 'data_failure', confidence: 0.79 };
    }

    // High retry count = likely flaky
    if (retryCount >= 3) return { failureClass: 'flaky_test', confidence: 0.75 };

    return { failureClass: 'genuine_failure', confidence: 0.65 };
  }

  private extractEvidence(log: string): string[] {
    const lines = log.split('\n').map((l) => l.trim()).filter(Boolean);
    const evidence: string[] = [];

    for (const line of lines) {
      // Error messages
      if (/^(error|fail|exception|assert|timeout|warning)/i.test(line)) evidence.push(line.slice(0, 200));
      // Stack trace first frame
      if (/^\s+at\s/.test(line) && evidence.length < 5) evidence.push(line.trim());
      // HTTP status codes
      const statusMatch = line.match(/\b(4\d{2}|5\d{2})\b/);
      if (statusMatch) evidence.push(`HTTP ${statusMatch[1]} response detected`);
    }

    return [...new Set(evidence)].slice(0, 8);
  }

  private buildAnalysis(
    failureClass: FailureClass,
    log: string,
    logLower: string,
    testCode: string,
    testName: string
  ): Omit<RootCauseAnalysis, 'failureClass' | 'confidence' | 'evidence'> {
    switch (failureClass) {
      case 'locator_failure':
        return {
          summary: 'Element selector is no longer valid — the DOM structure has changed.',
          rootCause: 'The test is using a fragile selector (ID, class, or XPath) that has been modified in a recent deployment. The target element exists but cannot be located using the current selector strategy.',
          fixSuggestion: 'Run the Self-Healing Agent to automatically discover a replacement selector. Consider migrating to data-testid attributes for stability.',
          codeChange: testCode ? this.suggestSelectorFix(testCode) : undefined,
          regressionRisk: 'Medium',
          preventionRecommendations: [
            'Adopt data-testid or aria-label attributes on interactive elements',
            'Enable auto-healing in the TestMind CI pipeline',
            'Run visual diff tests after each deployment to detect layout changes early',
            'Use Page Object Model to centralise selector management',
          ],
          relatedPatterns: ['StaleElementReferenceException', 'ElementNotInteractableError', 'NoSuchElementException'],
          estimatedFixTimeMinutes: 15,
        };

      case 'timing_failure':
        return {
          summary: 'Race condition — the test is interacting with an element before it is ready.',
          rootCause: 'The application renders asynchronously and the test is not waiting for the element or network request to complete. Hardcoded sleep/delay calls mask but do not fix this issue.',
          fixSuggestion: 'Replace sleep() with explicit waitForSelector(), waitForResponse(), or expect().toBeVisible() with auto-retry. Increase timeout if the operation is legitimately slow.',
          codeChange: this.suggestTimingFix(testCode),
          regressionRisk: 'Low',
          preventionRecommendations: [
            'Never use static sleep() — always wait for specific conditions',
            'Use Playwright\'s built-in auto-waiting (toBeVisible, toBeEnabled)',
            'Add network intercept waits for API-heavy pages',
            'Enable the TestMind flaky detection module to track intermittent failures',
          ],
          relatedPatterns: ['TimeoutError', 'WaitForSelectorTimeout', 'ElementClickIntercepted'],
          estimatedFixTimeMinutes: 10,
        };

      case 'assertion_mismatch':
        return {
          summary: 'Assertion failure — the actual output does not match the expected value.',
          rootCause: 'The application behaviour has changed (intentional feature change or regression). The test expected a specific value or state that is no longer produced by the application.',
          fixSuggestion: 'Determine whether this is a genuine regression or an intentional change. If intentional, update the expected value. If a regression, create a bug report and link to this test failure.',
          regressionRisk: 'High',
          preventionRecommendations: [
            'Review the recent changelog / commit history for this feature area',
            'Add the failing test to the regression monitoring suite',
            'Create a bug ticket with this failure report attached',
            'Consider property-based testing for data-sensitive assertions',
          ],
          relatedPatterns: ['AssertionError', 'ExpectationFailed', 'ValueMismatch'],
          estimatedFixTimeMinutes: 30,
        };

      case 'auth_failure':
        return {
          summary: 'Authentication or session failure during test execution.',
          rootCause: 'The test is hitting a protected endpoint without a valid session, or the session has expired mid-test due to a short token TTL.',
          fixSuggestion: 'Implement a beforeAll() hook that authenticates and stores the session token. Use storageState in Playwright to persist sessions across tests. Check token expiry in .env.',
          codeChange: `// Add to test setup:\nawait page.context().storageState({ path: './auth.json' });\n// Or in playwright.config.ts:\n// use: { storageState: './auth.json' }`,
          regressionRisk: 'High',
          preventionRecommendations: [
            'Use Playwright storageState to share auth state across tests',
            'Set token TTL to at least 1 hour in test environments',
            'Create a dedicated test user with predictable credentials',
            'Add auth health check to the CI pipeline smoke suite',
          ],
          relatedPatterns: ['UnauthorizedException', '401 Unauthorized', 'JWT expired', 'Session not found'],
          estimatedFixTimeMinutes: 20,
        };

      case 'environment_failure':
        return {
          summary: 'Infrastructure or network failure — the application server or a dependency is unavailable.',
          rootCause: 'The test environment is not ready. The application server may still be starting, a third-party service is down, or network connectivity is blocked.',
          fixSuggestion: 'Add a readiness probe / health check wait before the test suite starts. Use mocking for third-party dependencies in the test environment.',
          regressionRisk: 'Low',
          preventionRecommendations: [
            'Add a /health endpoint check before test execution',
            'Mock all third-party services in CI using MSW or Playwright network interception',
            'Add retry logic for transient network failures',
            'Monitor environment health on the TestMind dashboard',
          ],
          relatedPatterns: ['ECONNREFUSED', 'ENOTFOUND', 'ERR_CONNECTION_REFUSED', '502 Bad Gateway'],
          estimatedFixTimeMinutes: 5,
        };

      case 'data_failure':
        return {
          summary: 'Test data is missing, stale, or incorrect.',
          rootCause: 'The test depends on specific data that does not exist in the current environment (seeding not run, data deleted by a previous test, or production data not migrated).',
          fixSuggestion: 'Use the TestMind Test Data Factory to generate and seed test data before this test. Add beforeEach/afterEach hooks to create and clean up test data.',
          regressionRisk: 'Medium',
          preventionRecommendations: [
            'Never rely on shared test data — each test should create its own fixtures',
            'Use the TestDataFactory to generate realistic data programmatically',
            'Add database cleanup in afterEach hooks',
            'Run db:seed before the test suite in CI',
          ],
          relatedPatterns: ['NullPointerException', 'RecordNotFound', 'EmptyResultSet'],
          estimatedFixTimeMinutes: 25,
        };

      case 'flaky_test':
        return {
          summary: 'This test fails intermittently — likely a flaky test.',
          rootCause: 'The test has failed on retry, indicating it is not deterministic. Common causes: shared state between tests, race conditions, date/time dependencies, random data, or external API calls.',
          fixSuggestion: 'Isolate the test. Add it to the quarantine list while investigating. Use TestMind Flaky Detection to track failure frequency.',
          regressionRisk: 'Low',
          preventionRecommendations: [
            'Quarantine flaky tests and fix before re-enabling',
            'Eliminate shared state between tests with proper setup/teardown',
            'Mock non-deterministic dependencies (time, random, external APIs)',
            'Enable TestMind flaky detection to automatically track and report flaky tests',
          ],
          relatedPatterns: ['Intermittent failure', 'Race condition', 'SharedState'],
          estimatedFixTimeMinutes: 45,
        };

      default:
        return {
          summary: 'Unclassified failure — requires manual investigation.',
          rootCause: `The failure could not be automatically classified from the available log data. Full log: ${log.slice(0, 200)}`,
          fixSuggestion: 'Review the full test output, check recent code changes, and run the test in headed mode with verbose logging.',
          regressionRisk: 'Medium',
          preventionRecommendations: [
            'Add more descriptive error messages to your assertions',
            'Enable Playwright trace recording for all CI runs',
            'Check the TestMind dashboard for environment anomalies at the time of failure',
          ],
          relatedPatterns: [],
          estimatedFixTimeMinutes: 60,
        };
    }
  }

  private suggestSelectorFix(code: string): string {
    // Replace common fragile selectors with more robust alternatives
    return code
      .replace(/\$\('([^']*\.[\w-]+[^']*)'\)/g, `// Consider: $('[data-testid="..."]') instead of class selectors`)
      .replace(/getElementById\(['"]([^'"]+)['"]\)/g, `// Consider: page.locator('[data-testid="$1"]')`)
      .slice(0, 500);
  }

  private suggestTimingFix(code: string): string {
    if (!code) {
      return `// Replace: await page.waitForTimeout(2000);\n// With:    await page.waitForSelector('[aria-label="..."]');\n// Or:      await expect(locator).toBeVisible({ timeout: 10000 });`;
    }
    return code
      .replace(/waitForTimeout\(\d+\)/g, `waitForSelector('your-selector', { timeout: 10000 })`)
      .replace(/sleep\(\d+\)/g, `waitFor(() => /* condition */)`)
      .slice(0, 500);
  }
}
