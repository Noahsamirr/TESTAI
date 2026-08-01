import { TestResult } from '../types';

export function getReportPrompt(results: TestResult[], context: string): string {
  return `Act as an expert Senior QA Automation Engineer, Technical Writer, and Release Manager.

Analyze the test execution results below and produce a flawless, professional Software Test Report with actionable insights.

Context from the project: ${context || 'General test execution'}
Analysis timestamp: ${new Date().toISOString()}

Raw test results (JSON array):
${JSON.stringify(results, null, 2)}

---

REPORTING METHODOLOGY:
1. **Data Integrity**: Cross-reference every result. Do not invent bugs — only infer bugs from actual failures.
2. **Pattern Recognition**: Group failures by probable root cause (selectors, auth, timeout, 500 errors, etc.).
3. **Risk Scoring**: Severity = Business Impact × Likelihood. Release blocking if: Critical bugs > 0 OR High bugs > 3.
4. **Action Orientation**: Every recommendation must have a specific owner area (Dev / QA / DevOps) and a clear next step.
5. **Flaky Detection**: If results are mixed across retries, mark as flaky and investigate patterns.

Your response MUST contain exactly two fenced sections in this exact order.

================================================================================
## Section 1 — Professional Markdown Report
Inside a \`\`\`markdown code fence. Use this exact structure:

# Quality Test Report: [Feature / Suite Name]

## Executive Summary
**Release Status: PASSED | PASSED WITH WARNINGS | FAILED WITH BLOCKERS | FAILED**

| Metric | Value |
|---|---|
| Total Tests | N |
| Passed | N |
| Failed | N |
| Skipped | N |
| Pass Rate | XX.X% |
| Automation Coverage | ~XX% |
| Total Duration | Xm Ys |
| Bugs Identified | N |
| Flaky Tests Detected | N |
| **Regression Risk** | **Low / Medium / High** |

> **Release Recommendation**: Clear go / no-go verdict with 2-3 sentence justification including business impact.

---

## Test Environment & Configuration
| Property | Value |
|---|---|
| Environment | Development / Staging / UAT / Production |
| Build / Version ID | vX.Y.Z (commit SHA if available) |
| Test Execution Date | YYYY-MM-DD HH:MM TZ |
| Browser / Device Matrix | Chrome 120+, Firefox 121+, Safari 17+ / iPhone 15 / Pixel 8 |
| Test Data Source | Synthetic seed data |
| Database State | Clean snapshot @ [timestamp] |
| CI Pipeline Run | #XXXX (link placeholder) |

---

## Scope of Testing
### In-Scope
- Bullet list of modules, endpoints, user flows explicitly covered
- Test types run: Functional, API, Regression, Smoke, [Perf/Sec/A11y as applicable]

### Out-of-Scope
- Non-tested modules (with rationale if helpful)
- Known dependencies deferred to future runs

---

## Detailed Test Results Breakdown
Group results by **Module / Feature Area** — summarize each group, then list individual tests.

### Module: [Name] — Passed X/Y (Z%)
| Test ID | Description | Type | Status | Duration |
|---|---|---|---|---|
| TC-001 | ... | E2E | ✅ Passed | 2.4s |
| TC-002 | ... | E2E | ❌ Failed | 5.1s |

---

## Defect Log & Issue Triage
### Summary
| Severity | Count | Release Blocker? |
|---|---|---|
| Critical (P0) | N | Yes — blocks release |
| High (P1) | N | Yes if > 3 |
| Medium (P2) | N | No — can track |
| Low (P3) | N | No — backlog |

### Detailed Defects
| Bug ID | Failing Test | Severity | Root Cause Category | Status | Owner |
|---|---|---|---|---|---|
| BUG-001 | TC-002: Login with valid credentials | Critical | API Response 500 / Auth Service | Open | Backend |

For each bug provide below the table:
- **Root Cause Hypothesis**: Most likely code area / scenario
- **Steps to Reproduce**: Numbered, reproducible steps
- **Expected vs Actual**: Clear comparison
- **Evidence**: Links to screenshot, log snippet, trace (use placeholders if artifacts pending)
- **Suggested Fix**: Specific technical recommendation (not just "fix it")

---

## Performance Observations
(Only if duration data warrants it — otherwise briefly note "within acceptable range")
- Slowest N tests: list with durations and likely bottleneck (DB query / UI animation / network)
- Recommendation for flaky/slow tests (parallelize, mock heavy deps, etc.)

---

## Recommendations
1. **Developer Action**: Specific fix for Critical/High bugs — include probable file/module
2. **QA Action**: Additional test cases needed to cover observed gaps
3. **Process / Tooling**: Retry thresholds, CI parallelization, environment hardening, etc.
4. **Automation Investment**: Where to add more unit/integration vs E2E tests
5. **Next Test Cycle**: Priority focus areas for subsequent runs

---

## Artifacts & Evidence
| Artifact | Location / Status |
|---|---|
| Full execution logs | test-outputs/logs/[run-id].log |
| Failure screenshots | test-outputs/screenshots/ |
| Traces (Playwright trace.zip) | Pending upload |
| Video recordings | Per-failure capture |
| Allure / JUnit XML reports | Generated |

---

## Appendix: Next Actions Checklist
- [ ] Critical bugs triaged & assigned within 4 hours
- [ ] Flaky tests quarantined or stabilized before next release
- [ ] Stakeholder sign-off on release decision
- [ ] Performance investigation ticket created for >5s tests
- [ ] Coverage gap test cases added to backlog

================================================================================
## Section 2 — Structured JSON Dashboard
Inside a \`\`\`json code fence with the dashboard data:

{
  "testSuite": "Human-readable suite name derived from results",
  "executionDate": "ISO date string",
  "environment": "development | staging | production",
  "releaseStatus": "PASSED | PASSED WITH WARNINGS | FAILED WITH BLOCKERS | FAILED",
  "totalTests": 100,
  "passed": 90,
  "failed": 8,
  "skipped": 2,
  "passRate": "90.0%",
  "automationCoverage": "~78%",
  "totalDurationMs": 124000,
  "flakyTests": ["TC-004: Dashboard widget load"],
  "regressionRisk": "Medium",
  "nextActions": [
    "Fix Critical auth 500 error in login endpoint",
    "Investigate flaky dashboard widget test — suspected race condition",
    "Add 3 negative test cases around password reset flow"
  ],
  "bugs": [
    {
      "id": "BUG-001",
      "title": "Login with valid credentials returns 500 Internal Server Error",
      "severity": "Critical | High | Medium | Low",
      "status": "Open | In Progress | Resolved",
      "priority": "Blocker",
      "affectedModule": "Authentication Service",
      "environment": "Staging",
      "stepsToReproduce": [
        "Navigate to /login",
        "Enter valid user+pass (test-user@example.com / TestPass123!)",
        "Click Sign In"
      ],
      "expectedResult": "HTTP 200 + redirect to /dashboard, session cookie set",
      "actualResult": "HTTP 500 response body: {\"error\":\"NullReferenceException in AuthService.cs:line 42\"}",
      "rootCause": "Likely DB connection pool exhaustion or missing required claim from SSO migration",
      "fixSuggestion": "Add defensive null check + logging in AuthService.CreateSessionAsync; review connection string timeout",
      "screenshot": "",
      "testScript": "TC-002"
    }
  ],
  "recommendations": [
    "Prioritize the auth Critical fix in next sprint — customer-facing blocker",
    "Parallelize the 12 E2E tests across 4 workers to reduce runtime from ~2min to ~40s",
    "Add retry=2 with trace on for known-flaky TC-004 until root cause is addressed"
  ],
  "coverageByModule": [
    { "module": "Authentication", "total": 12, "passed": 10, "failed": 2 },
    { "module": "Dashboard", "total": 8, "passed": 8, "failed": 0 }
  ],
  "performanceMetrics": [
    { "name": "Total Suite Duration", "value": 124.0, "unit": "s", "threshold": 180, "status": "pass" },
    { "name": "Slowest Individual Test", "value": 8.2, "unit": "s", "threshold": 5, "status": "warning" },
    { "name": "Average Test Duration", "value": 1.24, "unit": "s", "threshold": 2, "status": "pass" }
  ]
}

IMPORTANT QUALITY RULES:
- If there are NO failed tests, the bugs array should be [] and releaseStatus PASSED (or PASSED WITH WARNINGS if slow/flaky concerns).
- Do not invent bugs. Only create bugs for tests that actually FAILED in the results.
- Math must be correct: totalTests = passed + failed + skipped. passRate = Math.round(passed/totalTests * 1000) / 10 + "%"
- Be conservative. If you're unsure about a root cause, say "Requires further investigation" rather than guessing.`;
}
