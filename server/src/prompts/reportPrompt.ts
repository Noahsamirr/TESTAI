import { TestResult } from '../types';

export function getReportPrompt(results: TestResult[], context: string): string {
  return `Act as an expert Senior QA Automation Engineer and Technical Writer.

Analyze the test execution results below and produce a flawless, professional Software Test Report.

Context from the project: ${context || 'General test execution'}

Raw test results (JSON):
${JSON.stringify(results, null, 2)}

---

Your response MUST contain exactly two fenced sections in this order:

## Section 1 — Markdown report
A complete report inside a \`\`\`markdown code fence. Use this structure:

1. **Executive Summary**
   - Status badge on its own line: **Status: PASSED** or **Status: FAILED WITH BLOCKERS** or **Status: FAILED**
   - Summary metrics table: Total Tests | Passed | Failed | Skipped | Automation Coverage %
   - Two-sentence release readiness recommendation

2. **Test Environment & Configuration**
   - Markdown table: Environment, Build/Version ID, Commit SHA, Browser/OS matrix, Test Data/DB state
   - Use sensible placeholders (e.g. TBD) only where data is missing

3. **Scope of Testing**
   - In-Scope bullet list
   - Out-of-Scope bullet list

4. **Detailed Test Results Breakdown**
   - Group by Feature/Module
   - Per test: ID, Description, Execution Type (Manual/Automated), Status, Duration

5. **Defect Log & Blockers**
   - Table: Test ID | Bug ID | Severity | Defect Description | Status

6. **Artifacts & Evidence**
   - Placeholder links for Logs, Screenshots, Video recordings

Use bold headings, tables, horizontal rules (---), and blockquotes for critical notes.
Convert messy log output into clear professional prose. No emojis.

## Section 2 — Structured JSON
A \`\`\`json code fence with dashboard data:

{
  "testSuite": "string",
  "executionDate": "ISO date string",
  "environment": "string",
  "releaseStatus": "PASSED | FAILED WITH BLOCKERS | FAILED",
  "totalTests": number,
  "passed": number,
  "failed": number,
  "skipped": number,
  "passRate": "e.g. 85%",
  "automationCoverage": "e.g. 72%",
  "bugs": [
    {
      "id": "BUG-001",
      "title": "string",
      "severity": "Critical | High | Medium | Low",
      "status": "Open",
      "stepsToReproduce": ["string"],
      "expectedResult": "string",
      "actualResult": "string",
      "screenshot": "",
      "testScript": "string"
    }
  ],
  "recommendations": ["string"]
}`;
}
