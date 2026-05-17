import claudeAgent from './claudeAgent';
import { TestCase } from '../types';

export interface FormattedTestCase extends TestCase {
  displayPriority: string;
  stepCount: number;
}

class TestCaseGeneratorService {
  async generateFromConversation(
    sessionId: string,
    context: string,
    testType: string
  ): Promise<TestCase[]> {
    return claudeAgent.generateTestCases(sessionId, context, testType);
  }

  async suggestAdditionalCases(
    sessionId: string,
    existingCases: TestCase[],
    context: string
  ): Promise<TestCase[]> {
    const existingIds = existingCases.map((c) => c.id).join(', ');
    const prompt = `Given these existing test cases: ${existingIds}
Context: ${context}
Suggest additional edge case test cases as a JSON array using the same schema. Focus on boundary conditions, error states, and security edge cases.`;
    return claudeAgent.generateTestCases(sessionId, prompt, existingCases[0]?.type || 'E2E');
  }

  validateTestCases(cases: TestCase[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const tc of cases) {
      if (!tc.id) errors.push(`Test case missing id: ${tc.title || 'unknown'}`);
      if (!tc.title) errors.push(`Test case ${tc.id} missing title`);
      if (!tc.steps?.length) errors.push(`Test case ${tc.id} has no steps`);
      if (!tc.expectedOutcome) errors.push(`Test case ${tc.id} missing expected outcome`);
    }
    return { valid: errors.length === 0, errors };
  }

  formatForDisplay(cases: TestCase[]): FormattedTestCase[] {
    return cases.map((tc) => ({
      ...tc,
      displayPriority: tc.priority,
      stepCount: tc.steps?.length || 0,
    }));
  }
}

export default new TestCaseGeneratorService();
