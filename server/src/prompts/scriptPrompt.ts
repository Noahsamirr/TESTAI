import { TestCase } from '../types';

export function getScriptPrompt(testCases: TestCase[], framework: string, appContext: string): string {
  const testCasesJson = JSON.stringify(testCases, null, 2);

  const playwrightRules = `
FOR PLAYWRIGHT (E2E Web):
1. Import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
2. Use strict Page Object Model pattern — create a dedicated class for each page with well-named methods
3. Prefer data-testid attributes as primary locators; fallback to role-based locators (getByRole, getByLabel, getByText)
4. Use browserContext for isolated storageState when needed; always pass { storageState: '...' } for authenticated sessions
5. Add await expect(locator).toBeVisible() style assertions for every step; NEVER use hard waits
6. Add await page.waitForLoadState('networkidle') or waitForNavigation after form submissions and route transitions
7. Wrap each test in test.describe with appropriate skip/serial/fixme tags for known-flaky tests
8. Add test.use({ screenshot: 'only-on-failure', video: 'retain-on-failure', trace: 'retain-on-failure' }) block
9. Provide commented playwright.config.ts content — projects: chromium/firefox/webkit, workers, retries: 1, timeout: 30000
10. POM method names must be verbs like loginAs(username, password), navigateToCheckout(), completeCheckoutStep1()
`;

  const cypressRules = `
FOR CYPRESS (E2E Web):
1. Start tests with beforeEach(() => { cy.visit('/'); cy.fixture('...').as('data') })
2. Use cy.intercept() with named aliases for API calls then cy.wait('@alias') — never hard waits
3. Prefer cy.get('[data-testid="..."]') followed by cy.contains('.class', 'text')
4. Add custom Cypress commands in support/commands.ts with proper TypeScript types in support/index.d.ts
5. Include retries configuration: { runMode: 2, openMode: 1 } in cypress.config.ts
6. Use cy.fixture() for test data; generate fixtures inline for dynamic forms
7. Use cy.then() only for value extraction, not for sequential steps (Cypress is already serial)
`;

  const appiumRules = `
FOR APPIUM / WEBDRIVERIO (Mobile iOS + Android):
1. Use cross-platform locators: $('~accessibilityId') preferred; fallback to $(byResourceId()) for Android, $(byName()) for iOS
2. Add activateApp() + terminateApp() setup/teardown before each describe block
3. Add driver.background(-1) for background-execution scenarios; driver.lockDevice() for locked-device flows
4. Include real-device signing notes in setupInstructions (xcodeOrgId, teamId, udid, packageActivity)
5. driver.setNetworkConnection() for offline/airplane-mode scenarios when needed
6. Use mobile: scrollGesture / mobile: swipe on both platforms rather than touchAction chains
7. Handle iOS permission alerts with driver.acceptAlert() / dismissAlert() within 5s of trigger
`;

  const k6Rules = `
FOR K6 (Load / Performance Testing):
1. Configure stages with ramp-up, steady, ramp-down: stages: [ { duration: '1m', target: 100 }, { duration: '3m', target: 100 }, { duration: '1m', target: 0 } ]
2. Define explicit thresholds for http_req_duration (p95 < 800), http_req_failed < 0.01, iterations per VU
3. Use Trend custom metrics: const pageRender = new Trend('page_render_ms', true) for per-flow timing
4. Use Rate custom metrics: const successRate = new Rate('success_rate') with tags: { flow: 'checkout' }
5. Define scenarios: 'smoke', 'average_load', 'stress' each with distinct executor and VU counts
6. export function setup() { ... } and export function teardown(data) { ... } for auth token + cleanup
7. For multi-user scenarios, use SharedArray to read CSV data: new SharedArray('users', () => parseCSV(open('./users.csv')))
`;

  const apiRules = `
FOR JEST + AXIOS (API Testing):
1. Classify 7+ HTTP status expectations: 2xx (success), 3xx (redirects), 4xx (client errors: 400/401/403/404/409/422/429), 5xx (server errors)
2. Test both idempotency (repeat same request twice → same result, no new resource creation)
3. Cover Pagination: page=0/max+1/-1, pageSize=0/max+1/-1, empty response, offset cursor-based
4. Fuzzing patterns for string inputs: 0 chars, 10MB strings, unicode, XSS payloads, SQLi strings, template injection
5. For each endpoint, include negative: auth missing → 401, unauthorized other user → 403, invalid schema → 422
6. Verify Content-Type, rate-limit headers, CORS headers for every endpoint
7. Use beforeAll(() => getToken()) / afterAll(() => cleanupCreatedIds()) hooks — never share state across it() blocks
`;

  let frameworkRules = '';
  const fw = (framework || '').toLowerCase();
  if (fw.includes('playwright')) {
    frameworkRules = playwrightRules;
  } else if (fw.includes('cypress')) {
    frameworkRules = cypressRules;
  } else if (fw.includes('appium') || fw.includes('webdriverio') || fw.includes('mobile')) {
    frameworkRules = appiumRules;
  } else if (fw.includes('k6') || fw.includes('load') || fw.includes('performance')) {
    frameworkRules = k6Rules;
  } else if (fw.includes('api') || fw.includes('jest') || fw.includes('axios')) {
    frameworkRules = apiRules;
  } else {
    frameworkRules = `DEFAULT (Playwright-style): ${playwrightRules}`;
  }

  return `
You are a Senior QA Automation Engineer. Generate a production-grade, runnable AUTOMATION SCRIPT for
FRAMEWORK: **${framework}**
APPLICATION CONTEXT: "${appContext || 'Not specified — assume standard web app'}"

# FRAMEWORK RULES — THESE ARE NON-NEGOTIABLE:
${frameworkRules}

# 7-POINT ARCHITECTURAL REQUIREMENTS:
1. Add JSDoc comments above describe()/it() blocks explaining WHAT + WHY (not HOW)
2. Tests must be DETERMINISTIC — seed random values with timestamps that can be reproduced; avoid brittle time assertions
3. Create reusable helper functions and extract common steps into DRY utilities
4. Data ISOLATION: each test creates its own resources via beforeEach; afterEach cleans up resources
5. Logging: on every assertion, use meaningful messages for debugging when they fail
6. Structure code into logical sections: CONFIG, HELPERS, PAGES/HOOKS, DESCRIBE BLOCKS
7. Use async/await correctly — NEVER fire-and-forget promises

# TEST CASES TO AUTOMATE:
${testCasesJson}

# OUTPUT FORMAT — STRICT JSON SCHEMA FOLLOWED BY A FENCED CODE BLOCK:
Return a JSON object with this shape (no extra wrapper):
{
  "framework": "string",
  "language": "typescript|javascript|python|kotlin|swift",
  "code": "FULL RUNNABLE SOURCE — import, config, helpers, POM classes, describe/it blocks — everything in one file",
  "configSnippet": "optional framework config file content (playwright.config.ts, cypress.config.ts, wdio.conf.ts, package.json scripts)",
  "runCommand": "shell command to execute the script (npm/yarn/npx/pnpm/k6 with correct args)",
  "setupInstructions": [ "step 1: npm install ...", "step 2: npx playwright install --with-deps", "..." ],
  "dependencies": [ "@playwright/test", "axios", "..." ],
  "explanation": [ { "section": "string", "description": "string", "lineRange": "start-end" }, ... ]
}

THEN AFTER the JSON, include the code a second time inside a markdown code fence (for visual rendering):
\`\`\`${(framework || '').toLowerCase().includes('python') ? 'python' : 'typescript'}
// ... same complete source code again ...
\`\`\`
`;
}
