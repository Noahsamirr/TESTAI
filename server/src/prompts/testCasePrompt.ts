export function getTestCasePrompt(context: string, testType: string): string {
  return `You are a QA test case generator. Based on the following context and test type, generate ONLY a valid JSON array of test cases. Do not include any markdown, explanation, or text outside the JSON array.

Test Type: ${testType}
Context: ${context}

Output ONLY a valid JSON array matching this exact schema:
[
  {
    "id": "TC001",
    "title": "string",
    "type": "E2E | Mobile | API | Unit | Performance | Security | Accessibility",
    "priority": "High | Medium | Low",
    "preconditions": ["string"],
    "steps": [
      { "stepNumber": 1, "action": "string", "expectedResult": "string" }
    ],
    "expectedOutcome": "string",
    "tags": ["string"],
    "automationStatus": "Automatable | Manual | Partially Automatable"
  }
]

Generate comprehensive test cases covering happy paths, edge cases, and negative scenarios. Use sequential IDs (TC001, TC002, etc.).`;
}
