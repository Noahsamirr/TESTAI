export function getTestCasePrompt(context: string, testType: string): string {
  return `You are an expert QA Test Case Design Specialist. Based on the following context and test type, generate ONLY a valid JSON array of comprehensive test cases. Do not include any markdown, explanation, or text outside the JSON array.

Test Type: ${testType}
Context: ${context}

GENERATION PRINCIPLES:
1. **Coverage Breadth**: Include happy paths, negative scenarios, boundary conditions, edge cases, and error handling
2. **Risk-Based Prioritization**: Mark high-risk/complex flows as "High" priority
3. **Modularity**: Group tests by feature/module using the "module" field
4. **Automation Compatibility**: Design steps to be deterministic and repeatable
5. **Data Independence**: Each test should be runnable in isolation (note dependencies in preconditions)
6. **Traceability**: Use clear, sequential IDs (TC001, TC002, etc.)

COVERAGE AREAS TO CONSIDER (if applicable to the context):
- User authentication & authorization (RBAC, session expiry)
- Form inputs: validation, length limits, type checks, SQLi/XSS attempts
- Navigation flows: breadcrumbs, deep links, back button behavior
- API contracts: status codes, headers, schemas, timeouts
- Performance thresholds: page load < 3s, API response < 500ms
- Accessibility: keyboard nav, screen readers, ARIA, color contrast
- Cross-browser / cross-device behavior
- Concurrency & race conditions
- Localization (date formats, currencies, RTL layouts)
- Network failure handling: offline, 500 errors, timeouts

Output ONLY a valid JSON array matching this exact schema:
[
  {
    "id": "TC001",
    "title": "Clear, specific, testable title — action + expected outcome",
    "description": "1-2 sentences explaining the test objective and business value",
    "module": "Feature/module name (e.g., User Authentication, Checkout Flow)",
    "coverageArea": "Authentication | Navigation | Form Validation | API | Data Display | Performance | Security | Accessibility | Localization",
    "type": "E2E | Integration | Unit | Smoke | Regression | Performance | Security | Accessibility | Visual | Mobile",
    "priority": "High | Medium | Low",
    "preconditions": [
      "Specific state required before starting (e.g., User with role 'admin' is logged in, Test product SKU-123 exists with stock > 0)"
    ],
    "steps": [
      { "stepNumber": 1, "action": "Specific user action or system input", "expectedResult": "Precise, verifiable outcome — state change, UI element, data value, HTTP response" }
    ],
    "expectedOutcome": "Overall high-level success criteria for the test case",
    "tags": ["tag1", "tag2", "regression-suite", "sprint-XX"],
    "automationStatus": "Automatable | Manual | Partially Automatable | Blocked",
    "estimatedDuration": 180
  }
]

Generate 12-20 comprehensive test cases. Use sequential IDs. Ensure every test has a clear expected result that can be validated objectively.`;
}
