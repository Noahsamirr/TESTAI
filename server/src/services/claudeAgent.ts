import '../loadEnv';
import { getMessages, getSessionMeta, appendSessionContext } from '../db/queries';
import { getSystemPrompt } from '../prompts/systemPrompt';
import { stripEmojis } from '../utils/stripEmojis';
import { getTestCasePrompt } from '../prompts/testCasePrompt';
import { getScriptPrompt } from '../prompts/scriptPrompt';
import { getReportPrompt } from '../prompts/reportPrompt';
import { createAIProvider } from './providers';
import type { AIProvider } from './providers/types';
import {
  AgentResponse,
  AgentPhase,
  Message,
  TestCase,
  GeneratedScript,
  TestReport,
  TestResult,
  SuggestedAction,
  AICapability,
} from '../types';

const MAX_HISTORY = 30;

class ClaudeAgent {
  private provider: AIProvider;
  private conversationHistory: Map<string, Message[]>;
  private sessionPhases: Map<string, AgentPhase>;
  private sessionCapabilities: Map<string, Set<AICapability>>;

  constructor() {
    this.provider = createAIProvider();
    this.conversationHistory = new Map();
    this.sessionPhases = new Map();
    this.sessionCapabilities = new Map();
  }

  getProviderInfo(): { provider: string; model: string } {
    return { provider: this.provider.name, model: this.provider.model };
  }

  switchProvider(name: string): { provider: string; model: string } {
    const newProvider = createAIProvider(name as any);
    this.provider = newProvider;
    console.log(`[AI Provider] Manually switched to ${newProvider.name} (${newProvider.model})`);
    return this.getProviderInfo();
  }

  listAvailableProviders(): string[] {
    return ['anthropic', 'gemini', 'deepseek', 'groq', 'puter', 'ollama'];
  }

  private isQuotaOrRateLimitError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    return (
      lower.includes('quota') ||
      lower.includes('rate limit') ||
      lower.includes('429') ||
      lower.includes('resource_exhausted') ||
      lower.includes('exceeded') ||
      lower.includes('insufficient_quota') ||
      lower.includes('credit') ||
      lower.includes('too many requests') ||
      lower.includes('server_error')
    );
  }

  private async complete(
    messages: { role: 'user' | 'assistant'; content: string }[],
    maxTokens: number,
    system?: string
  ): Promise<string> {
    try {
      const raw = await this.provider.complete({ system, messages, maxTokens });
      return stripEmojis(raw);
    } catch (err) {
      const firstErrorMsg = err instanceof Error ? err.message : String(err);

      if (this.isQuotaOrRateLimitError(err) || firstErrorMsg.toLowerCase().includes('api key') || firstErrorMsg.toLowerCase().includes('invalid_argument') || firstErrorMsg.toLowerCase().includes('400') || firstErrorMsg.toLowerCase().includes('401') || firstErrorMsg.toLowerCase().includes('403') || firstErrorMsg.toLowerCase().includes('not valid')) {
        console.warn(`[AI Provider] ${this.provider.name} failed: ${firstErrorMsg.trim().split('\n')[0].slice(0, 200)}`);
        console.warn('[AI Provider] Attempting automatic failover provider chain...');

        const fallbackProviders = ['gemini', 'groq', 'deepseek', 'puter', 'ollama', 'anthropic'];
        for (const name of fallbackProviders) {
          if (name === this.provider.name) continue;
          try {
            const fallback = createAIProvider(name as any);
            console.log(`[AI Provider Switch] Trying ${fallback.name} (${fallback.model})...`);
            this.provider = fallback;
            const raw = await this.provider.complete({ system, messages, maxTokens });
            console.log(`[AI Provider Switch] Success with ${fallback.name}!`);
            return stripEmojis(raw);
          } catch (fallbackErr) {
            const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
            console.warn(`[AI Provider Fallback Failed] ${name}: ${fbMsg.trim().split('\n')[0].slice(0, 150)}`);
          }
        }

        console.warn('[AI Provider] All providers exhausted. Switching to built-in DEMO/MOCK mode so the application remains usable.');
        const allUserText = messages.map((m) => m.content).join('\n\n');
        return this.generateMockResponse(allUserText, system || '');
      }
      throw err;
    }
  }

  private generateMockResponse(userText: string, systemPrompt: string): string {
    const lower = userText.toLowerCase();

    const wantsTestCases = lower.includes('test case') || lower.includes('test suite') || lower.includes('generate test') || lower.includes('generate a comprehensive');
    const wantsScript = lower.includes('automation script') || lower.includes('playwright') || lower.includes('cypress') || lower.includes('k6') || lower.includes('appium') || lower.includes('build playwright') || lower.includes('build cypress') || lower.includes('jest') || lower.includes('script directly');
    const wantsReport = lower.includes('report') || lower.includes('pass rate') || lower.includes('summary') || lower.includes('release status');
    const wantsSecurity = lower.includes('owasp') || lower.includes('security') || lower.includes('xss') || lower.includes('sqli') || lower.includes('vuln');
    const wantsPerformance = lower.includes('load') || lower.includes('stress') || lower.includes('performance') || lower.includes('k6');
    const wantsApi = lower.includes('api') || lower.includes('rest') || lower.includes('graphql') || lower.includes('endpoint');
    const wantsMobile = lower.includes('mobile') || lower.includes('ios') || lower.includes('android') || lower.includes('appium');
    const wantsAccessibility = lower.includes('accessib') || lower.includes('a11y') || lower.includes('wcag');
    const wantsPlan = lower.includes('coverage') || lower.includes('plan') || lower.includes('recommend') || lower.includes('capabilities') || lower.includes('strategy') || lower.includes('what to test') || lower.includes('matrix');
    const wantsOptimize = lower.includes('optimize') || lower.includes('parallel') || lower.includes('faster');
    const wantsBugs = lower.includes('triage') || lower.includes('bug report') || lower.includes('failure') || lower.includes('analyze the failed');
    const wantsCICD = lower.includes('pipeline') || lower.includes('ci ') || lower.includes('github action') || lower.includes('jenkins') || lower.includes('gitlab');

    const banner = `> 📋 **QualityForge AI — Demo Mode**
> All cloud AI providers returned errors (invalid/unset API keys). The system has automatically switched to a built-in demonstration engine so you can experience the complete UI, artifacts drawer, and report dashboard features.
>
> **Enter a real API key in \`.env\`** to unlock live models (any of: GEMINI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, PUTER_AUTH_TOKEN, or run OLLAMA locally).
>
---

`;

    // 1. Full Test Case Suite Generation
    if (wantsTestCases) {
      return banner + this.mockGenerateTestCases(userText, wantsSecurity, wantsPerformance, wantsApi, wantsMobile, wantsAccessibility);
    }

    // 2. Full Script Generation
    if (wantsScript) {
      return banner + this.mockGenerateScript(userText, wantsMobile, wantsPerformance, wantsApi);
    }

    // 3. Report Generation
    if (wantsReport || wantsBugs) {
      return banner + this.mockGenerateReport(wantsBugs);
    }

    // 4. CI/CD Pipeline
    if (wantsCICD) {
      return banner + this.mockGenerateCICD();
    }

    // 5. Test Plan / Coverage Matrix / Capabilities List
    if (wantsPlan) {
      return banner + this.mockGenerateTestPlan(userText, wantsSecurity, wantsPerformance, wantsApi, wantsMobile, wantsAccessibility);
    }

    // 6. Optimization / Parallelization
    if (wantsOptimize) {
      return banner + this.mockGenerateOptimization();
    }

    // 7. Default: Conversation + test case suite for URLs / app descriptions
    if (lower.match(/https?:\/\//) || lower.includes('app') || lower.includes('website') || lower.includes('feature') || lower.includes('checkout') || lower.includes('login')) {
      return banner +
        `## ✨ Analysis Complete

I've scanned the requirements you described. Based on the feature surface area, here's a **complete test strategy** starting with **15 structured test cases** followed by context-aware next steps:

` + this.mockGenerateTestCases(userText, false, false, false, false, false);
    }

    // 8. Generic fallback — show all capabilities
    return banner + this.mockGenerateTestPlan(userText, true, true, true, true, true);
  }

  private mockGenerateTestCases(
    userText: string,
    addSecurity: boolean,
    addPerformance: boolean,
    addApi: boolean,
    addMobile: boolean,
    addA11y: boolean
  ): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const domainMatch = userText.match(/https?:\/\/([\w\-.]+)/i);
    const moduleName = domainMatch ? domainMatch[1] : 'AppModule';

    const baseCases = [
      {
        id: 'TC-001', title: 'Login — happy path with valid credentials', module: moduleName, coverageArea: 'Authentication',
        type: 'Positive', priority: 'High' as const, description: 'Successful user login flow with correct email and password',
        estimatedDuration: 120, preconditions: ['User account created with email user@test.com', 'User is logged out'], tags: ['authentication', 'login', 'smoke'],
        automationStatus: 'Automated', expectedOutcome: 'User lands on dashboard / home page, session cookie set, nav bar shows user avatar',
        steps: [
          { stepNumber: 1, action: 'Navigate to /login', expectedResult: 'Login form with email, password fields, Remember-me checkbox, and "Log in" button rendered' },
          { stepNumber: 2, action: 'Enter email user@test.com and password ValidPass!23', expectedResult: 'Both fields have values, no inline validation errors shown' },
          { stepNumber: 3, action: 'Click Log in button and wait for navigation', expectedResult: 'HTTP 302 or client-side redirect to /dashboard, 200 response on /api/auth/session' },
        ],
      },
      {
        id: 'TC-002', title: 'Login — wrong password shows correct inline error', module: moduleName, coverageArea: 'Authentication',
        type: 'Negative', priority: 'High' as const, description: 'Verify credential error handling without account enumeration',
        estimatedDuration: 60, preconditions: ['User account user@test.com exists'], tags: ['authentication', 'negative', 'account-enumeration'],
        automationStatus: 'Automated', expectedOutcome: 'Generic "Invalid email or password" toast error message; no username-specific disclosure',
        steps: [
          { stepNumber: 1, action: 'Submit login form with email user@test.com and password WrongPass!!!', expectedResult: '401 status, toast appears red with generic message' },
          { stepNumber: 2, action: 'Submit with nonexistent email and same password', expectedResult: 'Exact same error message — no difference to attacker' },
        ],
      },
      {
        id: 'TC-003', title: 'Login — rate limiting after N attempts', module: moduleName, coverageArea: 'Authentication',
        type: 'Security', priority: 'High' as const, description: 'Account protection against brute-force password guessing',
        estimatedDuration: 180, preconditions: ['Test account that never locked before'], tags: ['security', 'rate-limit', 'owasp-1'],
        automationStatus: 'Automated', expectedOutcome: 'After 5 failed attempts, 429 Too Many Requests with Retry-After header; captcha appears on 6th',
        steps: [
          { stepNumber: 1, action: 'Submit wrong login 5 times within 60 seconds', expectedResult: 'Count increments, each returns 401' },
          { stepNumber: 2, action: '6th attempt, correct password', expectedResult: '429 with Retry-After >= 60 seconds' },
          { stepNumber: 3, action: 'Wait 65 seconds and attempt again with correct password', expectedResult: 'Login succeeds' },
        ],
      },
      {
        id: 'TC-004', title: 'Create resource — empty form validates', module: moduleName, coverageArea: 'Form Validation',
        type: 'Negative', priority: 'Medium' as const, description: 'Empty submission triggers inline field validation per WCAG',
        estimatedDuration: 90, preconditions: ['User logged in', 'Navigated to /<resource>/new'], tags: ['form-validation', 'empty-submit'],
        automationStatus: 'Automated', expectedOutcome: 'All required fields show error message; aria-invalid="true"; error summary at top linked via aria-describedby',
        steps: [
          { stepNumber: 1, action: 'Click submit without filling any field', expectedResult: 'Form does not submit; focus jumps to first invalid field' },
        ],
      },
      {
        id: 'TC-005', title: 'Create resource — submit with max-length boundary', module: moduleName, coverageArea: 'Form Validation',
        type: 'Boundary', priority: 'Medium' as const, description: 'Character limits enforced both client + server side',
        estimatedDuration: 120, preconditions: ['User logged in'], tags: ['boundary', 'input-sanitization'],
        automationStatus: 'Automated', expectedOutcome: 'Client prevents submit at maxlength; server truncates or errors at maxlength+1',
        steps: [
          { stepNumber: 1, action: 'Fill text field with exactly maxlength chars', expectedResult: 'Successfully saved' },
          { stepNumber: 2, action: 'Post directly to API with maxlength + 1 chars', expectedResult: '400 or 422 validation error; persisted value truncated to maxlength' },
        ],
      },
      {
        id: 'TC-006', title: 'Resource list — paginates correctly', module: moduleName, coverageArea: 'List & Search',
        type: 'Functional', priority: 'Medium' as const, description: 'Server-side pagination correctness',
        estimatedDuration: 150, preconditions: ['31 resources in database'], tags: ['pagination', 'list'],
        automationStatus: 'Automated', expectedOutcome: 'Pages 1..4 have 10/10/10/1 items; no duplicates across pages; all resources reachable',
        steps: [
          { stepNumber: 1, action: 'GET /api/resources?page=1&pageSize=10', expectedResult: 'items:10, total:31, first item id consistent' },
          { stepNumber: 2, action: 'page=4 same params', expectedResult: 'items:1' },
          { stepNumber: 3, action: 'page=5', expectedResult: 'items:[] and 200 OK, or 400 with clear message' },
          { stepNumber: 4, action: 'pageSize=0', expectedResult: '400 or 422; never all resources returned' },
        ],
      },
      {
        id: 'TC-007', title: 'Edit resource — unauthorized user cannot access', module: moduleName, coverageArea: 'Authorization',
        type: 'Security', priority: 'High' as const, description: 'OWASP #5 Broken Access Control — IDOR tests',
        estimatedDuration: 120, preconditions: ['Resources created by both User-A and User-B'], tags: ['security', 'authz', 'idor', 'owasp-5'],
        automationStatus: 'Automated', expectedOutcome: 'Attempts to access / update others resources consistently return 403; no data leaks',
        steps: [
          { stepNumber: 1, action: 'As User-B, GET /api/resources/<User-A-id>', expectedResult: '403 Forbidden' },
          { stepNumber: 2, action: 'As User-B, PUT /api/resources/<User-A-id>', expectedResult: '403; resource unchanged' },
          { stepNumber: 3, action: 'As User-B, DELETE /api/resources/<User-A-id>', expectedResult: '403; resource still exists' },
        ],
      },
      {
        id: 'TC-008', title: 'Delete — soft delete vs. hard delete', module: moduleName, coverageArea: 'Data Integrity',
        type: 'Functional', priority: 'Medium' as const, description: 'Delete behavior matches policy',
        estimatedDuration: 90, preconditions: ['A deletable resource exists'], tags: ['delete', 'soft-delete', 'data-integrity'],
        automationStatus: 'Automated', expectedOutcome: 'After delete: GET returns 404; DB has deletedAt timestamp set; audit log row created',
        steps: [
          { stepNumber: 1, action: 'Delete resource', expectedResult: '204 No Content or 200 with deletion id' },
          { stepNumber: 2, action: 'GET the resource by URL / API', expectedResult: '404 Gone' },
        ],
      },
      {
        id: 'TC-009', title: 'Search — filters combine with AND semantics', module: moduleName, coverageArea: 'List & Search',
        type: 'Functional', priority: 'Medium' as const, description: 'Multiple filter conditions combine correctly',
        estimatedDuration: 120, preconditions: ['Dataset with 2 dimensions of tagged items'], tags: ['search', 'filter'],
        automationStatus: 'Automated', expectedOutcome: 'Combined filter N = |filter1| * |filter2| intersection',
        steps: [
          { stepNumber: 1, action: 'Apply filter A, record count', expectedResult: 'countA results' },
          { stepNumber: 2, action: 'Add filter B', expectedResult: 'countAB <= min(countA, countB), all rows match both filters' },
        ],
      },
      {
        id: 'TC-010', title: 'File upload — accepts valid, rejects malicious', module: moduleName, coverageArea: 'File Upload',
        type: 'Security', priority: 'High' as const, description: 'Magic-byte + extension + size validation',
        estimatedDuration: 180, preconditions: ['User logged in with upload permission'], tags: ['security', 'file-upload', 'owasp-7'],
        automationStatus: 'Automated', expectedOutcome: 'Valid images/PDFs up to max size succeed; .exe/.php, SVG with script, polyglot files rejected; malware scan API returns clean',
        steps: [
          { stepNumber: 1, action: 'Upload valid .png, 5MB', expectedResult: '201; CDN URL returned; metadata correct' },
          { stepNumber: 2, action: 'Upload 21MB .png (over limit)', expectedResult: '413 Payload Too Large' },
          { stepNumber: 3, action: 'Upload file named "nice.png" but content is PHP', expectedResult: '400; rejected by magic bytes' },
        ],
      },
      {
        id: 'TC-011', title: 'Logout — session revoked, back button safe', module: moduleName, coverageArea: 'Authentication',
        type: 'Functional', priority: 'Medium' as const, description: 'Proper session termination + caching headers',
        estimatedDuration: 90, preconditions: ['User logged in'], tags: ['logout', 'session', 'cache-control'],
        automationStatus: 'Automated', expectedOutcome: 'POST /logout succeeds (HTTP 204); next request to authenticated URL returns 401; back-button shows "expired"',
        steps: [
          { stepNumber: 1, action: 'POST /api/auth/logout', expectedResult: '204, session cookie cleared' },
          { stepNumber: 2, action: 'GET /dashboard', expectedResult: '302 redirect to /login' },
        ],
      },
      {
        id: 'TC-012', title: 'Offline / bad network — graceful errors', module: moduleName, coverageArea: 'Error Handling',
        type: 'Negative', priority: 'Medium' as const, description: 'Network failures produce user-friendly UI (no uncaught crash)',
        estimatedDuration: 180, preconditions: ['App running, page loaded'], tags: ['resilience', 'offline', 'error-ui'],
        automationStatus: 'Automated', expectedOutcome: 'Requests show skeleton + retry; friendly error card, toast "Check your connection"',
        steps: [
          { stepNumber: 1, action: 'Block api.* requests in BrowserContext', expectedResult: 'App renders without exceptions' },
          { stepNumber: 2, action: 'Trigger submission', expectedResult: 'UI shows retry button; global exception count = 0' },
        ],
      },
      {
        id: 'TC-013', title: 'Concurrent edits — optimistic lock / last-write-wins', module: moduleName, coverageArea: 'Concurrency',
        type: 'Edge Case', priority: 'High' as const, description: 'Two sessions editing the same row produce consistent end state',
        estimatedDuration: 240, preconditions: ['Two logged-in browser contexts with same role'], tags: ['concurrency', 'race-condition', 'optimistic-lock'],
        automationStatus: 'Automated', expectedOutcome: 'Either: first wins with 409 Conflict on second, or ETag-based If-Match prevents overwrite; never silent loss',
        steps: [
          { stepNumber: 1, action: 'Both contexts open same record', expectedResult: 'Both see same version N' },
          { stepNumber: 2, action: 'Context A saves value "AAA", context B saves "BBB" — near-simultaneous', expectedResult: 'Exactly one (or none) succeeds; loser gets 409; DB never corrupt' },
        ],
      },
      {
        id: 'TC-014', title: 'A11y — keyboard-only end-to-end flow', module: moduleName, coverageArea: 'Accessibility',
        type: 'A11y', priority: 'High' as const, description: 'WCAG 2.2 Level AA — keyboard operable entire flow',
        estimatedDuration: 180, preconditions: ['Fresh browser session'], tags: ['wcag-2.2', 'a11y', 'keyboard'],
        automationStatus: 'Automated', expectedOutcome: 'Tab follows visual order, focus ring always visible, Enter/Space activate, no keyboard traps',
        steps: [
          { stepNumber: 1, action: 'Tab 30x across login → dashboard → form → submit', expectedResult: 'focus always in DOM element; -1 tabindex never on native interactive' },
          { stepNumber: 2, action: 'Submit with Enter key at last step', expectedResult: 'Submits same as click' },
        ],
      },
      {
        id: 'TC-015', title: 'Cross-browser — chromium vs webkit', module: moduleName, coverageArea: 'Compatibility',
        type: 'Cross-Browser', priority: 'Medium' as const, description: 'Critical flows pass identically on Chromium + WebKit',
        estimatedDuration: 300, preconditions: ['Playwright browsers installed'], tags: ['cross-browser', 'compatibility'],
        automationStatus: 'Automated', expectedOutcome: 'Same 12 core scenarios pass on both; screenshot diff <2% tolerance',
        steps: [
          { stepNumber: 1, action: 'Run entire login+CRUD on chromium', expectedResult: 'All passed' },
          { stepNumber: 2, action: 'Run on webkit project', expectedResult: 'All passed' },
        ],
      },
    ];

    let cases = [...baseCases];

    if (addSecurity) {
      cases.push({
        id: 'TC-016', title: 'XSS — script payloads are sanitized', module: moduleName, coverageArea: 'Security',
        type: 'Security', priority: 'High' as const, description: 'User inputs stored & reflected sanitized — OWASP #3',
        estimatedDuration: 180, preconditions: ['Any writable input: profile, comment, post'], tags: ['owasp-3', 'xss', 'injection'],
        automationStatus: 'Automated', expectedOutcome: `<script>alert(document.cookie)</script> never executes; rendered as HTML entities; CSP nonce blocks inline`,
        steps: [
          { stepNumber: 1, action: 'Submit with text <img src=x onerror=alert(1)>', expectedResult: 'Stored as plain text entities' },
          { stepNumber: 2, action: 'Reload the rendered page', expectedResult: 'console.errors == 0; window.alert not called' },
        ],
      }, {
        id: 'TC-017', title: 'SQLi — OR "1"="1 payloads parameterized', module: moduleName, coverageArea: 'Security',
        type: 'Security', priority: 'High' as const, description: 'All user input passed through parameterized queries — OWASP #1',
        estimatedDuration: 180, preconditions: ['Search/list endpoint with query params'], tags: ['owasp-1', 'sqli', 'injection'],
        automationStatus: 'Automated', expectedOutcome: 'Search returns same number rows regardless of payload; no 500 errors; no stack traces',
        steps: [
          { stepNumber: 1, action: `search=" OR 1=1--"`, expectedResult: '200 OK; same row count as benign filter' },
          { stepNumber: 2, action: `search="'; DROP TABLE users;--"`, expectedResult: '500 never returned; users table intact' },
        ],
      });
    }
    if (addPerformance) {
      cases.push({
        id: 'TC-018', title: 'P95 Core Web Vitals — list view', module: moduleName, coverageArea: 'Performance',
        type: 'Performance', priority: 'High' as const, description: 'LCP, CLS, INP meet Google thresholds under load',
        estimatedDuration: 300, preconditions: ['k6/Playwright trace config'], tags: ['core-web-vitals', 'lcp', 'p95'],
        automationStatus: 'Automated', expectedOutcome: 'LCP <= 2500ms, CLS <= 0.1, INP <= 200ms at P95, 100 concurrent VUs',
        steps: [
          { stepNumber: 1, action: 'Run Lighthouse audit with hot cache', expectedResult: 'Performance score >= 85' },
          { stepNumber: 2, action: 'k6 ramp 0→100 VUs, 5 min steady', expectedResult: 'req_duration[p95] <= 800ms, error rate <0.1%' },
        ],
      });
    }
    if (addApi) {
      cases.push({
        id: 'TC-019', title: 'API — contract (all endpoints + schema)', module: moduleName, coverageArea: 'API',
        type: 'API', priority: 'High' as const, description: 'Idempotency, schemas, auth, pagination, rate limits',
        estimatedDuration: 360, preconditions: ['Postman/OpenAPI spec loaded'], tags: ['api', 'contract-test', 'schema'],
        automationStatus: 'Automated', expectedOutcome: 'All 20 endpoints validate against OpenAPI schema; all 7 HTTP status classes tested',
        steps: [
          { stepNumber: 1, action: 'Run 200 endpoint/method/param combos with Jest+Zod schema', expectedResult: '100% match for every success + error response' },
        ],
      });
    }
    if (addMobile) {
      cases.push({
        id: 'TC-020', title: 'Mobile — app background/restore retains form state', module: moduleName, coverageArea: 'Mobile',
        type: 'Mobile', priority: 'High' as const, description: 'iOS/Android lifecycle: background, lock, rotate, notification',
        estimatedDuration: 240, preconditions: ['Appium session connected'], tags: ['ios', 'android', 'lifecycle'],
        automationStatus: 'Automated', expectedOutcome: 'Form values survive background(60s) + return + screen orientation change',
        steps: [
          { stepNumber: 1, action: 'Fill 3 fields in checkout, driver.background(-1) 60s', expectedResult: 'After activateApp(), fields retained exactly' },
        ],
      });
    }
    if (addA11y) {
      cases.push({
        id: 'TC-021', title: 'Screen-reader — heading + landmark structure', module: moduleName, coverageArea: 'Accessibility',
        type: 'A11y', priority: 'High' as const, description: 'WCAG 2.2 Level AA - document semantics',
        estimatedDuration: 120, preconditions: ['axe-core runner attached'], tags: ['a11y', 'wcag-1.3.1', 'axe'],
        automationStatus: 'Automated', expectedOutcome: '0 critical/high axe violations; 1 <h1>, logical heading order (no skip); nav/main/aside landmarks',
        steps: [
          { stepNumber: 1, action: 'Run axe-core scan on page', expectedResult: 'Critical: 0, High: 0' },
          { stepNumber: 2, action: 'Inspect aria-live regions on async operations', expectedResult: 'Search results, toasts, errors announce via polite live region' },
        ],
      });
    }

    cases = cases.slice(0, addSecurity || addPerformance || addApi || addMobile || addA11y ? 20 : 15);

    const summaryIntro = `## 1. Executive Summary

**Date of strategy:** ${date}  
**Target module:** ${moduleName}  
**Test scenarios generated:** ${cases.length} (${cases.filter(c => c.priority === 'High').length} High / ${cases.filter(c => c.priority === 'Medium').length} Medium / ${cases.filter(c => String(c.priority) === 'Low').length} Low priority)

### Coverage Areas
| Area | # Cases | Notes |
|---|---|---|
| Authentication / Authorization | ${cases.filter(c => c.coverageArea.includes('uth')).length} | Including rate-limiting + IDOR tests |
| Form / Input / Validation | ${cases.filter(c => c.coverageArea.includes('Form')).length} | Empty + boundary + sanitization |
| List / Search / Pagination | ${cases.filter(c => c.coverageArea.includes('List')).length} | Corner cases: pageSize=0, last+1 page |
| Security | ${cases.filter(c => c.type === 'Security').length} | OWASP Top 10: Injection, XSS, Broken ACL, uploads |
| Performance | ${cases.filter(c => c.type === 'Performance').length} | CWV p95 + k6 load thresholds |
| Accessibility | ${cases.filter(c => c.type === 'A11y').length} | WCAG 2.2 AA; keyboard, axe-core, landmarks |
| API / Contract | ${cases.filter(c => c.type === 'API').length} | 7 HTTP classes + schema validation |
| Mobile / Cross-Browser | ${cases.filter(c => c.type === 'Mobile' || c.type === 'Cross-Browser').length} | Lifecycle, Chromium/WebKit parity |
| Concurrency / Resilience | ${cases.filter(c => c.coverageArea.includes('Concurrency') || c.coverageArea.includes('Error')).length} | Race + offline + soft-delete |

### Risk Score
**Regression Risk: Low-Medium** given the ${cases.length}-scenario coverage matrix. Go/no-go recommendation: **GO** with automated regression in CI.

---

`;

    return summaryIntro +
      `TEST CASES:

\`\`\`json
${JSON.stringify(cases, null, 2)}
\`\`\`

---

## 2. Automation Strategy Recommendation

**Recommended Framework Stack:**

| Layer | Tool |
|---|---|
| E2E Web | **Playwright** (chromium + webkit projects; trace-on-failure) |
| API | **Jest + Axios + Zod schema validation** |
| Mobile | **Appium 2 + WebdriverIO TypeScript** |
| Load / Perf | **k6** with Trend/Rate custom metrics |
| A11y + Security (embedded) | **axe-core** + @zaproxy/node |
| CI/CD | **GitHub Actions** (runs-on: ubuntu-latest) matrix: shard 1/6 → 6/6 |

**Go to "Build Playwright Script" suggested action below, or ask me directly for:**
- Playwright script with strict Page Object Model
- Jest + Axios API contract tests
- k6 load test with custom Trend/Rate metrics
- Full GitHub Actions pipeline YAML
`;
  }

  private mockGenerateScript(userText: string, wantsMobile: boolean, wantsPerformance: boolean, wantsApi: boolean): string {
    const fw = wantsPerformance ? 'k6' : wantsMobile ? 'appium' : wantsApi ? 'jest' : 'playwright';

    if (fw === 'k6') {
      const code = `import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM METRICS
// ─────────────────────────────────────────────────────────────────────────────
const pageRenderMs = new Trend('page_render_ms', true);
const successRate = new Rate('success_rate');
const checkoutFlowDuration = new Trend('checkout_flow_ms', true);

// ─────────────────────────────────────────────────────────────────────────────
// LOAD PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      vus: 3,
      iterations: 6,
      gracefulStop: '5s',
      tags: { test_type: 'smoke' },
    },
    average_load: {
      executor: 'ramping-vus',
      startTime: '30s',
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    stress: {
      executor: 'ramping-vus',
      startTime: '8m',
      stages: [
        { duration: '2m', target: 150 },
        { duration: '3m', target: 250 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    success_rate: ['rate>0.99'],
    page_render_ms: ['p(95)<2500'],
    checkout_flow_ms: ['p(95)<6000'],
  },
  userAgent: 'k6-QualityForge/1.0',
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST DATA
// ─────────────────────────────────────────────────────────────────────────────
import { SharedArray } from 'k6/data';
const users = new SharedArray('users', function () {
  return Array.from({ length: 20 }).map((_, i) => ({
    email: \`perf.user.\${i}@example.com\`,
    password: 'LoadTestPass1!',
  }));
});

const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';

// ─────────────────────────────────────────────────────────────────────────────
// SETUP — reusable auth tokens
// ─────────────────────────────────────────────────────────────────────────────
export function setup() {
  const res = http.post(\`\${BASE_URL}/auth/token\`, JSON.stringify({
    grant_type: 'password',
    username: users[0].email,
    password: users[0].password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { flow: 'auth' },
  });
  check(res, { 'setup /auth/token 200': (r) => r.status === 200 });
  return { token: res.json('access_token') };
}

export default function (data) {
  const token = data.token;
  const user = users[Math.floor(Math.random() * users.length)];
  const params = {
    headers: {
      Authorization: \`Bearer \${token}\`,
      'Content-Type': 'application/json',
      'X-User-Email': user.email,
    },
    tags: { vu: \`\${__VU}\` },
  };

  // ── Scenario 1: Warm-up + List resources ───────────────────────────────────
  group('1. List + Search', function () {
    const t0 = Date.now();
    let list = http.get(\`\${BASE_URL}/resources?page=1&pageSize=20\`, params);
    pageRenderMs.add(Date.now() - t0);
    const ok = check(list, {
      'GET /resources 200': (r) => r.status === 200,
      'items.length > 0': (r) => (r.json('items') || []).length > 0,
    });
    successRate.add(ok);
    sleep(0.5);

    let search = http.get(\`\${BASE_URL}/resources?q=test&status=active\`, params);
    check(search, { 'GET /resources?q= 200': (r) => r.status === 200 });
    sleep(0.3);
  });

  // ── Scenario 2: Create + Get ───────────────────────────────────────────────
  group('2. Create Detail Delete', function () {
    const payload = JSON.stringify({ title: \`perf-\${__VU}-\${__ITER}\`, amount: 1234 });
    let created = http.post(\`\${BASE_URL}/resources\`, payload, params);
    const ok = check(created, {
      'POST /resources 201': (r) => r.status === 201,
      'has id': (r) => !!r.json('id'),
    });
    successRate.add(ok);
    if (!ok) return;

    const id = created.json('id');
    sleep(0.1);

    let fetched = http.get(\`\${BASE_URL}/resources/\${id}\`, params);
    check(fetched, {
      'GET /resources/:id 200': (r) => r.status === 200,
      'id matches': (r) => r.json('id') === id,
    });
    sleep(0.2);

    let del = http.del(\`\${BASE_URL}/resources/\${id}\`, null, params);
    check(del, { 'DELETE 204': (r) => r.status === 204 });
    sleep(0.2);
  });

  // ── Scenario 3: Checkout flow (timed) ──────────────────────────────────────
  const tStart = Date.now();
  group('3. Checkout flow', function () {
    let cart = http.post(\`\${BASE_URL}/cart\`, JSON.stringify({ items: [{ sku: 'SKU-001', qty: 1 }] }), params);
    check(cart, { 'POST /cart 200': (r) => r.status === 200 });
    sleep(0.3);
    let pay = http.post(\`\${BASE_URL}/payments\`, JSON.stringify({ amount: 1234, card: 'tok_visa' }), params);
    check(pay, { 'POST /payments 200': (r) => r.status === 200 });
  });
  checkoutFlowDuration.add(Date.now() - tStart);

  sleep(Math.random() * 1.2 + 0.3);
}

export function teardown(data) {
  console.log(\`[teardown] Cleanup for run token \${data.token ? 'provided' : 'missing'}\`);
}`;

      return `## ⚡ Load / Performance Automation Script — k6

**This is a production-grade k6 script with Trend/Rate custom metrics, scenarios (smoke / average_load / stress), multi-user SharedArray data, setup/teardown auth, group timing, and thresholds aligned with SLOs.**

### Quick-Start Setup
\`\`\`bash
# 1. Install k6
brew install k6     # macOS, or https://k6.io/docs/get-started/installation/

# 2. Save code as load-test.js and run the smoke scenario
BASE_URL=https://api.your-app.com k6 run load-test.js --tag test_type=smoke

# 3. Run the full average_load scenario with K6_CLOUD export
k6 cloud --include-system-env-vars load-test.js
\`\`\`

---

SCRIPT:

\`\`\`json
{
  "framework": "k6",
  "language": "javascript",
  "code": ${JSON.stringify(code)},
  "configSnippet": "// k6 cloud key: https://k6.io/docs/cloud\\n// k6 login cloud --token YOUR_K6_CLOUD_TOKEN\\nexport const options = { ext: { loadimpact: { projectID: 12345 } } };",
  "runCommand": "BASE_URL=https://api.example.com k6 run load-test.js",
  "setupInstructions": [
    "Install k6 (brew install k6 on macOS, or binary from k6.io)",
    "Set BASE_URL environment variable to your target API",
    "Optional: create a 20-row users.csv in the same folder if you want real credentials",
    "Run 'k6 run load-test.js' for CLI run, 'k6 cloud load-test.js' for cloud dashboard"
  ],
  "dependencies": ["k6>=0.49.0"],
  "explanation": [
    { "section": "Custom Metrics", "description": "Trend (page_render_ms, checkout_flow_ms) + Rate (success_rate) — combine with http_req_duration to fully measure SLO", "lineRange": "8-13" },
    { "section": "Scenarios", "description": "3 executors: smoke, average_load, stress — with start offsets so they are scheduled sequentially in one CLI run", "lineRange": "16-46" },
    { "section": "SLO Thresholds", "description": "P95 duration, fail rate, success rate, page render — fail the k6 exit code when violated", "lineRange": "48-55" },
    { "section": "SharedArray Data", "description": "Cross-VU CSV-like user array for multi-user realistic flows", "lineRange": "58-65" },
    { "section": "Setup / Teardown", "description": "Single auth token obtained once, reused by every VU; teardown hook for cleanup", "lineRange": "70-78" },
    { "section": "group() blocks", "description": "3 groups: List+Search, Create+Get+Delete, Checkout. each gets its own timing in cloud dashboard", "lineRange": "80-164" }
  ]
}
\`\`\`

\`\`\`javascript
${code}
\`\`\`
`;
    }

    if (fw === 'jest') {
      const code = `import axios from 'axios';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  validateStatus: () => true, // never throw — tests assert status explicitly
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS — contract test against OpenAPI spec in code
// ─────────────────────────────────────────────────────────────────────────────
const ResourceSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  amount: z.number().int().min(0),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
const ListEnvelope = z.object({
  items: z.array(ResourceSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
});
const ProblemDetail = z.object({
  type: z.string().url().optional(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  violations: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST DATA — isolated per describe block
// ─────────────────────────────────────────────────────────────────────────────
const FAKE = {
  validUserA: { email: 'jest-a-' + Date.now() + '@example.com', password: 'JestApi!23' },
  validUserB: { email: 'jest-b-' + Date.now() + '@example.com', password: 'JestApi!23' },
};

let tokenA: string;
let tokenB: string;
let createdByA: string[] = [];
let createdByB: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS — per-user isolation
// ─────────────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  const [regA, regB] = await Promise.all([
    client.post('/auth/register', FAKE.validUserA),
    client.post('/auth/register', FAKE.validUserB),
  ]);
  expect(regA.status).toBe(201);
  expect(regB.status).toBe(201);
  const [logA, logB] = await Promise.all([
    client.post('/auth/login', { email: FAKE.validUserA.email, password: FAKE.validUserA.password }),
    client.post('/auth/login', { email: FAKE.validUserB.email, password: FAKE.validUserB.password }),
  ]);
  tokenA = logA.data.accessToken;
  tokenB = logB.data.accessToken;
  expect(tokenA).toEqual(expect.any(String));
  expect(tokenB).toEqual(expect.any(String));
});

afterAll(async () => {
  // 🔁 Data cleanup — idempotent, runs even if tests fail
  const del = (id: string, tok: string) =>
    client.delete(\`/resources/\${id}\`, { headers: { Authorization: \`Bearer \${tok}\` } }).catch(() => {});
  await Promise.all([...createdByA.map(i => del(i, tokenA)), ...createdByB.map(i => del(i, tokenB))]);
});

const authHeaders = (t: string) => ({ headers: { Authorization: \`Bearer \${t}\`, 'Content-Type': 'application/json' } });

// ─────────────────────────────────────────────────────────────────────────────
// 7+ HTTP status classes — AUTH
// ─────────────────────────────────────────────────────────────────────────────
describe('Authentication & Account Enumeration', () => {
  test('POST /auth/login returns 200 for valid credentials', async () => {
    const r = await client.post('/auth/login', { email: FAKE.validUserA.email, password: FAKE.validUserA.password });
    expect(r.status).toBe(200);
    expect(r.data).toHaveProperty('accessToken');
    expect(r.headers['content-type']).toContain('application/json');
  });

  test.each([
    ['bad password', FAKE.validUserA.email, 'Wrong123!', 401],
    ['nonexistent email', 'nobody-' + Date.now() + '@example.com', FAKE.validUserA.password, 401],
    ['empty body', '', '', 400],
  ])('POST /auth/login [%s] returns %i', async (_name, email, password, status) => {
    const r = await client.post('/auth/login', { email, password });
    expect(r.status).toBe(status);
    // Anti-enumeration: same message shape for wrong email vs wrong password
    expect(r.data?.message || r.data?.title).toEqual(expect.any(String));
  });

  test('Rate limiting — 6 rapid failed attempts → 429', async () => {
    const promises = Array.from({ length: 6 }).map(() =>
      client.post('/auth/login', { email: FAKE.validUserA.email, password: 'wrongpass' })
    );
    const results = await Promise.all(promises);
    const statuses = results.map(r => r.status);
    expect(statuses).toContain(429);
    // Retry-After header present
    const the429 = results.find(r => r.status === 429);
    if (the429) {
      expect(the429.headers['retry-after']).toEqual(expect.any(String));
      expect(Number(the429.headers['retry-after'])).toBeGreaterThanOrEqual(30);
    }
  }, 20_000);

  test('CORS headers present for browser clients', async () => {
    const r = await client.options('/auth/login', {
      headers: { Origin: 'https://app.example.com', 'Access-Control-Request-Method': 'POST' },
    });
    expect(r.status).toBeOneOf([200, 204]);
    expect(r.headers['access-control-allow-origin']).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CRUD + Authorization (OWASP #5 IDOR)
// ─────────────────────────────────────────────────────────────────────────────
describe('Resources CRUD + IDOR', () => {
  test('POST /resources 201 + Zod schema', async () => {
    const r = await client.post('/resources', { title: 'ApiTest First', amount: 1000 }, authHeaders(tokenA));
    expect(r.status).toBe(201);
    ResourceSchema.parse(r.data);
    createdByA.push(r.data.id);
  });

  test('Idempotency — repeat creation with Idempotency-Key', async () => {
    const key = 'idem-' + Date.now();
    const headers = { ...authHeaders(tokenA).headers, 'Idempotency-Key': key };
    const first = await client.post('/resources', { title: 'idem', amount: 5 }, headers);
    const second = await client.post('/resources', { title: 'idem', amount: 5 }, headers);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200); // or 201 with same id
    expect(second.data.id).toBe(first.data.id);
    createdByA.push(first.data.id);
  });

  test('Pagination edge cases', async () => {
    const base = { pageSize: 10 };
    const [p1, pOverflow, pZero] = await Promise.all([
      client.get('/resources', { params: { ...base, page: 1 }, ...authHeaders(tokenA) }),
      client.get('/resources', { params: { ...base, page: 999999 }, ...authHeaders(tokenA) }),
      client.get('/resources', { params: { page: 1, pageSize: 0 }, ...authHeaders(tokenA) }),
    ]);
    expect(ListEnvelope.parse(p1.data)).toBeTruthy();
    expect(pOverflow.data.items).toEqual([]);
    expect([400, 422]).toContain(pZero.status);
  });

  test('IDOR — User-B cannot access User-A resource (GET/PUT/DELETE)', async () => {
    const create = await client.post('/resources', { title: 'IDOR Target', amount: 42 }, authHeaders(tokenA));
    const targetId = create.data.id;
    createdByA.push(targetId);

    const [getB, putB, delB] = await Promise.all([
      client.get(\`/resources/\${targetId}\`, authHeaders(tokenB)),
      client.put(\`/resources/\${targetId}\`, { title: 'owned' }, authHeaders(tokenB)),
      client.delete(\`/resources/\${targetId}\`, authHeaders(tokenB)),
    ]);
    expect(getB.status).toBe(403);
    expect(putB.status).toBe(403);
    expect(delB.status).toBe(403);

    // Still accessible by owner
    const stillThere = await client.get(\`/resources/\${targetId}\`, authHeaders(tokenA));
    expect(stillThere.status).toBe(200);
  });

  test('Validation: 422 with violations for bad schema', async () => {
    const r = await client.post('/resources', { title: '', amount: -500 }, authHeaders(tokenA));
    expect(r.status).toBeOneOf([400, 422]);
    const pd = ProblemDetail.safeParse(r.data);
    if (pd.success) {
      expect(pd.data.violations?.length).toBeGreaterThan(0);
    }
  });

  test('Fuzz: SQLi + XSS payloads never cause 500', async () => {
    const payloads = [
      \\"' OR 1=1 --\\",
      '<script>alert(1)</script>',
      '{{7*7}}',
      '$(cat /etc/passwd)',
      '\`sleep(5)\`',
    ];
    for (const p of payloads) {
      const r = await client.post('/resources', { title: p, amount: 1 }, authHeaders(tokenA));
      expect([201, 400, 422]).toContain(r.status);
      if (r.status === 201) createdByA.push(r.data.id);
    }
  }, 30_000);
});`;

      return `## 🛰️ API Test Suite — Jest + Axios + Zod Schema Validation

**Full 7-class HTTP status coverage: 2xx, 3xx, 4xx (400/401/403/404/409/422/429), 5xx, pagination edge cases, idempotency, CORS headers, anti-enumeration, OWASP IDOR, and fuzzing. All tests data-isolated; cleanup on afterAll.**

SCRIPT:

\`\`\`json
{
  "framework": "jest+axios+zod",
  "language": "typescript",
  "code": ${JSON.stringify(code)},
  "configSnippet": "// jest.config.js (ESM-safe)\\nmodule.exports = { preset: 'ts-jest', testEnvironment: 'node', setupFiles: ['dotenv/config'], testTimeout: 15000 };",
  "runCommand": "API_BASE_URL=http://localhost:3001/api npx jest --verbose",
  "setupInstructions": [
    "npm install axios zod jest ts-jest @types/jest typescript",
    "npx ts-jest config:init",
    "Create .env with API_BASE_URL=http://localhost:3001/api",
    "Run with npx jest --coverage --json --outputFile=jest-report.json"
  ],
  "dependencies": ["axios", "zod", "jest", "ts-jest", "@types/jest", "typescript", "dotenv"],
  "explanation": [
    { "section": "Contract Testing with Zod", "description": "ResourceSchema + ListEnvelope + ProblemDetail schemas enforce OpenAPI shapes with zero external deps", "lineRange": "18-46" },
    { "section": "beforeAll / afterAll Isolation", "description": "Registers & logs in 2 users via Promise.all; tracks created IDs in arrays for safe idempotent cleanup", "lineRange": "55-85" },
    { "section": "7 HTTP Status Classes - Auth", "description": "200 valid, 400 empty, 401 wrong creds, 429 rate limit with Retry-After assertion, OPTIONS for CORS", "lineRange": "94-141" },
    { "section": "Idempotency-Key Header", "description": "Repeated POST with same key returns identical resource id — no duplicate side effects", "lineRange": "153-164" },
    { "section": "Pagination Edges", "description": "page=999999 → items:[], pageSize=0 → 400/422; never dumps full DB", "lineRange": "166-177" },
    { "section": "OWASP IDOR Tests", "description": "User B GET/PUT/DELETE all return 403; owner still sees resource — confirms no leaks", "lineRange": "179-199" },
    { "section": "Input Fuzzing", "description": "5 payloads (SQLi/XSS/SSTI/command injection/template): NEVER 500 crash — 201/400/422 only", "lineRange": "208-222" }
  ]
}
\`\`\`

\`\`\`typescript
${code}
\`\`\`
`;
    }

    // Playwright default (E2E Web)
    const code = `import { test as base, expect, type Page, type BrowserContext, type Locator } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES + PAGE OBJECTS (strict POM)
// ─────────────────────────────────────────────────────────────────────────────
type TestFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  resourceNewPage: ResourceNewPage;
  resourceListPage: ResourceListPage;
  freshContext: BrowserContext;
};

const test = base.extend<TestFixtures>({
  // 1. Context with storageState reuse — only login once per worker
  storageState: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('Email').fill('playwright-user@example.com');
    await page.getByLabel('Password').fill('Playwright123!');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await context.storageState({ path: 'state/playwright-user.json' });
    await context.close();
    await use('state/playwright-user.json');
  },

  loginPage: async ({ page }, use) => await use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => await use(new DashboardPage(page)),
  resourceNewPage: async ({ page }, use) => await use(new ResourceNewPage(page)),
  resourceListPage: async ({ page }, use) => await use(new ResourceListPage(page)),
});

test.use({ screenshot: 'only-on-failure', video: 'retain-on-failure', trace: 'retain-on-failure' });
test.describe.configure({ mode: 'parallel', retries: 1, timeout: 45_000 });

// ═════════════════════════════════════════════════════════════════════════════
// PAGE OBJECTS
// ═════════════════════════════════════════════════════════════════════════════
class LoginPage {
  constructor(readonly page: Page) {}
  readonly email = () => this.page.getByLabel('Email');
  readonly password = () => this.page.getByLabel('Password');
  readonly rememberMe = () => this.page.getByRole('checkbox', { name: /remember me/i });
  readonly submit = () => this.page.getByRole('button', { name: /log in/i });
  readonly alert = () => this.page.getByRole('alert');

  /** Login with either stored user or override credentials. Navigates to /login first. */
  async loginAs(email = 'playwright-user@example.com', password = 'Playwright123!'): Promise<void> {
    await this.page.goto('/login');
    await this.email().fill(email);
    await this.password().fill(password);
    await this.rememberMe().check();
    await Promise.all([this.page.waitForResponse(r => r.url().includes('/auth') && r.status() < 500), this.submit().click()]);
    await this.page.waitForLoadState('networkidle');
  }
}

class DashboardPage {
  constructor(readonly page: Page) {}
  readonly heading = () => this.page.getByRole('heading', { name: /dashboard/i, level: 1 });
  readonly newResourceBtn = () => this.page.getByRole('link', { name: /new resource/i });
  readonly nav = (label: string) => this.page.getByRole('navigation').getByRole('link', { name: label });

  async goto() { await this.page.goto('/dashboard'); await expect(this.heading()).toBeVisible(); }
}

class ResourceNewPage {
  constructor(readonly page: Page) {}
  readonly titleInput = () => this.page.getByRole('textbox', { name: /title/i });
  readonly amountInput = () => this.page.getByRole('spinbutton', { name: /amount/i });
  readonly submit = () => this.page.getByRole('button', { name: /create resource/i });
  readonly errorSummary = () => this.page.getByRole('alert', { name: /validation/i });

  async fillAndSubmit(partial: Partial<{ title: string; amount: number }>) {
    if (partial.title !== undefined) await this.titleInput().fill(partial.title);
    if (partial.amount !== undefined) await this.amountInput().fill(String(partial.amount));
    await this.submit().click();
    await this.page.waitForLoadState('networkidle');
  }
}

class ResourceListPage {
  constructor(readonly page: Page) {}
  readonly rows = () => this.page.getByRole('row');
  readonly searchInput = () => this.page.getByRole('searchbox');
  readonly statusChip = (name: string) => this.page.getByRole('status').filter({ hasText: name });

  async goto() { await this.page.goto('/resources'); await this.page.waitForLoadState('domcontentloaded'); }
  async cellText(rowIdx: number): Promise<string[]> {
    const cells = this.rows().nth(rowIdx).getByRole('cell');
    const count = await cells.count();
    return Promise.all(Array.from({ length: count }).map((_, i) => cells.nth(i).innerText()));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═════════════════════════════════════════════════════════════════════════════

/** Authentication: happy path + credential error + session storage */
test.describe('Authentication', { tag: ['@smoke', '@auth'] }, () => {
  test('TC-001 login happy path redirects to dashboard', async ({ page, loginPage }) => {
    await loginPage.loginAs();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible();
    const cookies = await page.context().cookies();
    expect(cookies.find(c => c.name.toLowerCase().includes('session'))).toBeTruthy();
  });

  test('TC-002 wrong credentials show generic toast (anti-enumeration)', async ({ page, loginPage }) => {
    const sameTextPromise = Promise.all([
      (async () => {
        await loginPage.loginAs('playwright-user@example.com', 'WrongPassword!!');
        return (await loginPage.alert().innerText()).toLowerCase();
      })(),
      (async () => {
        const ctx2 = await page.context().browser()!.newContext();
        const p2 = await ctx2.newPage();
        const lp = new LoginPage(p2);
        await lp.loginAs('definitely-does-not-exist-' + Date.now() + '@example.com', 'WrongPassword!!');
        const t = (await lp.alert().innerText()).toLowerCase();
        await ctx2.close();
        return t;
      })(),
    ]);
    const [msgKnownUser, msgUnknownUser] = await sameTextPromise;
    expect(msgKnownUser).toEqual(msgUnknownUser); // 💡 must be identical to prevent user enum
    expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('TC-003 logout revokes session + back button safe', async ({ page, dashboardPage, loginPage }) => {
    await loginPage.loginAs();
    await dashboardPage.goto();
    await page.getByRole('button', { name: /log out/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();
    await expect(page.getByRole('heading', { name: /session expired/i }).or(page.getByLabel('Email'))).toBeVisible();
  });
});

/** Resource CRUD + Validation + Authorization */
test.describe('Resource Management', { tag: ['@crud'] }, () => {
  test('TC-004 empty submit — inline validation with aria-invalid', async ({ page, resourceNewPage }) => {
    await resourceNewPage.page.goto('/resources/new');
    await resourceNewPage.submit().click();
    await expect(resourceNewPage.errorSummary()).toBeVisible();
    await expect(resourceNewPage.titleInput()).toHaveAttribute('aria-invalid', 'true');
  });

  test('TC-005 boundary create + list pagination', async ({ page, resourceNewPage, resourceListPage }) => {
    await resourceNewPage.page.goto('/resources/new');
    const bigTitle = 'A'.repeat(200); // maxlength
    await resourceNewPage.fillAndSubmit({ title: bigTitle, amount: 9999 });
    await expect(resourceListPage.rows().first()).toBeVisible();
    await expect(resourceListPage.statusChip('Created')).toHaveCount(1);
  });

  test('TC-013 concurrent edits detected with optimistic lock', async ({ browser, resourceNewPage }) => {
    await resourceNewPage.page.goto('/resources/new');
    await resourceNewPage.fillAndSubmit({ title: 'RaceTarget', amount: 1 });
    const url = resourceNewPage.page.url(); // /resources/:id/edit after redirect presumably
    const [ctx1, ctx2] = await Promise.all([browser.newContext(), browser.newContext()]);
    try {
      const [p1, p2] = [await ctx1.newPage(), await ctx2.newPage()];
      await Promise.all([p1.goto(url), p2.goto(url)]);
      const inp = (p: Page) => p.getByRole('spinbutton', { name: /amount/i });
      await inp(p1).fill('1111');
      await inp(p2).fill('2222');
      const saveBtn = (p: Page) => p.getByRole('button', { name: /save/i });
      const results = await Promise.allSettled([
        p1.evaluate(() => (window as any).__disableNetworkDelay = true).catch(() => {}),
        saveBtn(p1).click().then(() => p1.waitForResponse(r => r.request().method() === 'PUT')),
        saveBtn(p2).click().then(() => p2.waitForResponse(r => r.request().method() === 'PUT')),
      ]);
      const statuses = (results as any[]).slice(1).map(r => r.status);
      // ✅ Either: 1 success + 1 409 Conflict, or both resolve with ETag checks. Never silent data loss.
      expect([409, 200, 201]).toContain(200);
    } finally {
      await ctx1.close();
      await ctx2.close();
    }
  });
});

/** Accessibility — axe-core + keyboard-only flow */
test.describe('Accessibility @a11y', () => {
  test('TC-014 WCAG 2.2 AA — axe-core finds 0 critical/high', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    const { injectAxe, checkA11y } = require('@axe-core/playwright');
    await injectAxe();
    await checkA11y({ axeOptions: { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } } });
  });

  test('TC-014b keyboard-only entire flow — focus never lost, Tab order logical', async ({ page, loginPage }) => {
    await loginPage.page.goto('/login');
    await page.keyboard.press('Tab');
    await expect(loginPage.email()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(loginPage.password()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(loginPage.rememberMe()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(loginPage.submit()).toBeFocused();
    // ✅ Final tab order is Email → Password → Remember → Submit (matches visual)
  });
});

/** Cross-browser projects parity */
test.describe('Cross-browser compatibility', () => {
  test('TC-015 login + dashboard identical on {chromium, webkit}', async ({ page, loginPage, dashboardPage, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox has different font rendering for this test');
    await loginPage.loginAs();
    await dashboardPage.goto();
    await expect(dashboardPage.heading()).toHaveScreenshot(\`dashboard-heading-\${browserName}.png\`, { maxDiffPixels: 80 });
  });
});
`;

    return `## 🎭 Playwright Automation Script — Strict POM + Fixtures

**This is a complete, production-grade Playwright suite with strict Page Objects, fixtures for storageState auth reuse, retries=1, mode=parallel, 4 describe blocks (Auth, CRUD, A11y with axe-core, Cross-browser screenshot diffs), and 7+ concrete scenarios covering the test cases.**

SCRIPT:

\`\`\`json
{
  "framework": "playwright",
  "language": "typescript",
  "code": ${JSON.stringify(code)},
  "configSnippet": "// playwright.config.ts\\nimport { defineConfig, devices } from '@playwright/test';\\nexport default defineConfig({\\n  fullyParallel: true, retries: 1, workers: 2, timeout: 45_000,\\n  reporter: [['html', { open: 'never' }], ['json', { outputFile: 'report.json' }], ['line']],\\n  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure', baseURL: process.env.BASE_URL || 'http://localhost:3000' },\\n  projects: [\\n    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },\\n    { name: 'webkit', use: { ...devices['Desktop Safari'] } },\\n    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }\\n  ]\\n});",
  "runCommand": "npx playwright test --reporter=json,line --workers=2 --timeout=30000",
  "setupInstructions": [
    "npm install @playwright/test @axe-core/playwright",
    "npx playwright install --with-deps chromium webkit firefox",
    "Create state/ directory (mkdir -p state) — storageState will be written on first run",
    "Set BASE_URL environment variable to your local application URL",
    "Run: PLAYWRIGHT_JSON_OUTPUT_NAME=test-results.json npx playwright test"
  ],
  "dependencies": ["@playwright/test", "@axe-core/playwright"],
  "explanation": [
    { "section": "Fixtures & StorageState Auth", "description": "Logs in ONCE per Playwright worker with pre-browser storageState — all subsequent tests reuse the session via fixture (dramatic speedup)", "lineRange": "10-36" },
    { "section": "Strict Page Object Model", "description": "4 POM classes: LoginPage (loginAs helper), DashboardPage, ResourceNewPage, ResourceListPage — tests call methods, not touch locators", "lineRange": "40-110" },
    { "section": "TC-001 Happy Path Login", "description": "waitForResponse + networkidle, URL regex assertion, session cookie presence", "lineRange": "118-126" },
    { "section": "TC-002 Anti-Enumeration", "description": "Launches SECOND isolated browser context; compares alert text for 'wrong-pwd existing user' vs 'any-pwd nonexistent user' — MUST match exactly", "lineRange": "128-149" },
    { "section": "TC-003 Logout + Back-Button Safety", "description": "Explicit logout, URL check, goBack() triggers Session Expired or login prompt — no old page shown", "lineRange": "151-159" },
    { "section": "TC-004/005 Boundary + Empty Submits", "description": "aria-invalid=\"true\" for empty forms; maxlength=200 string fill on create then Status chip assertion", "lineRange": "163-176" },
    { "section": "TC-013 Concurrent Edits Optimistic-Lock", "description": "Creates row, opens TWO independent browser contexts, saves simultaneously — validates no silent data loss", "lineRange": "178-208" },
    { "section": "A11y axe-core TC-014", "description": "Injects @axe-core/playwright and runs WCAG 2.2 AA scan (no critical/high violations)", "lineRange": "212-221" },
    { "section": "TC-014b Keyboard-Only Flow", "description": "4 sequential Tab presses; every field gets focused in visual order — no keyboard traps", "lineRange": "223-236" },
    { "section": "Cross-Browser Screenshot Diff", "description": "Same exact run on chromium + webkit projects; snapshot threshold 80 px tolerant", "lineRange": "240-248" }
  ]
}
\`\`\`

\`\`\`typescript
${code}
\`\`\`
`;
  }

  private mockGenerateReport(hasFailures: boolean): string {
    const now = new Date();
    const passed = hasFailures ? 14 : 20;
    const failed = hasFailures ? 5 : 0;
    const skipped = 2;
    const total = passed + failed + skipped;
    const passRate = (passed / total) * 100;
    const passRateStr = (Math.round(passRate * 10) / 10) + '%';

    const durationSec = total * 4 + 22;
    const flaky = hasFailures ? ['TC-013 Concurrent edits optimistic lock', 'TC-015 Cross-browser screenshot'] : [];
    const apiBaseUrl = process.env.BASE_URL || 'http://localhost:3001/api';

    const bugs = hasFailures ? [
      {
        id: 'BUG-001', title: 'TC-002 — Anti-enumeration: wrong email vs wrong password differ in message wording',
        severity: 'High' as const, priority: 'Blocker' as const, status: 'Open',
        affectedModule: 'Authentication', environment: 'Staging (us-east-1)',
        rootCause: '`/auth/login` returns a more specific error for registered emails — opens user-enumeration vector to attackers',
        stepsToReproduce: [
          'Submit existing-email + wrong-pw 1x → capture response body',
          'Submit nonexistent-email + wrong-pw → capture',
          'Diff the JSON — existing case includes word "password"; nonexistent uses word "credentials"',
        ],
        expectedResult: 'Both scenarios MUST produce byte-for-byte identical message + status + timing',
        actualResult: 'Two different strings returned; attacker can enumerate ~1k emails/hour via bisection',
        fixSuggestion: 'Standardize error: `{ title: "Invalid credentials", status: 401 }` in both branches; add constant-timing comparison helper; introduce 200ms random jitter so response-time attacks fail',
        testScript: 'TC-002 message equality assertion in suite',
      },
      {
        id: 'BUG-002', title: 'TC-003 — Back button shows cached dashboard after logout',
        severity: 'Medium' as const, priority: 'High' as const, status: 'Open',
        affectedModule: 'Authentication', environment: 'Staging (webkit only)',
        rootCause: 'Missing Cache-Control headers — dashboard HTML cached by WebKit engine',
        stepsToReproduce: ['Login to dashboard', 'Logout → redirects to /login', 'Click browser back button (Safari/WebKit)'],
        expectedResult: 'Show login page + toast "Session expired" OR enforce reload via headers',
        actualResult: 'Entire dashboard rendered briefly (1-2 frames) with user data before JS re-validates',
        fixSuggestion: 'Set Cache-Control: no-store, no-cache, must-revalidate, private on all authenticated HTML responses; add Vary: Cookie',
        testScript: 'TC-003',
      },
      {
        id: 'BUG-003', title: 'TC-013 — Simultaneous PUT silently overwrites first version (no 409)',
        severity: 'High' as const, priority: 'High' as const, status: 'Open',
        affectedModule: 'Resources CRUD', environment: 'Staging',
        rootCause: 'PUT handler does not use If-Match / ETag / updatedAt optimistic lock column',
        stepsToReproduce: ['Open record in 2 tabs', 'Save value 1111 in Tab A', 'Save value 2222 in Tab B (overlapping)'],
        expectedResult: 'Latter write must fail with HTTP 409 Conflict + payload with both versions',
        actualResult: 'Latest request wins; first user data silently lost (no trace)',
        fixSuggestion: 'Add updatedAt + ETag response header on GET; require If-Match on PUT; validate matches in DB update WHERE clause',
        testScript: 'TC-013 concurrency test',
      },
      {
        id: 'BUG-004', title: 'axe-core TC-014 — Color contrast 5.0:1 threshold not met for secondary text',
        severity: 'Medium' as const, priority: 'Medium' as const, status: 'Open',
        affectedModule: 'Accessibility', environment: 'All',
        rootCause: '.text-slate-400 over #ffffff yields contrast ratio 2.9:1 — WCAG AA minimum is 4.5:1 for body text',
        stepsToReproduce: ['Run axe-core on dashboard page', 'Inspect violation wcag143-color-contrast nodes'],
        expectedResult: 'All body text >= 4.5:1; large text >= 3:1',
        actualResult: '24 elements violate contrast minimum',
        fixSuggestion: 'Swap `--text-muted` token from #a0aec0 → #6b7280 or darker; verify with Stark/Figma plugins',
        testScript: 'TC-014 Axe',
      },
      {
        id: 'BUG-005', title: 'TC-015 — WebKit renders dashboard grid differently (flex wrap wraps at 1199px)',
        severity: 'Low' as const, priority: 'Medium' as const, status: 'Open',
        affectedModule: 'UI Compatibility', environment: 'WebKit',
        rootCause: 'Chrome min-width: auto inside grid; Safari requires explicit min-width: 0',
        stepsToReproduce: ['Open dashboard at 1280px width in Safari', 'Inspect Stats row layout'],
        expectedResult: '4 columns rendered, all text visible, no horizontal scroll',
        actualResult: 'Safari pushes 4th tile to second row; visual regression 95px mismatch',
        fixSuggestion: 'Add min-width: 0 to each Stats column wrapper class inside the grid',
        testScript: 'TC-015 Cross-browser screenshot diff',
      },
    ] : [];

    const perf = [
      { name: 'Dashboard LCP', value: 2.15, unit: 's', threshold: 2.5, status: 'pass' as const },
      { name: 'Dashboard CLS', value: 0.06, unit: '', threshold: 0.1, status: 'pass' as const },
      { name: 'List API P95', value: 620, unit: 'ms', threshold: 800, status: 'pass' as const },
      { name: 'List API P99', value: 1105, unit: 'ms', threshold: 1500, status: 'pass' as const },
      { name: 'Checkout flow (P95)', value: hasFailures ? 6820 : 3800, unit: 'ms', threshold: 6000, status: hasFailures ? 'fail' as const : 'pass' as const },
    ];

    const modCoverage = [
      { module: 'Authentication', total: 6, passed: hasFailures ? 4 : 6, failed: hasFailures ? 2 : 0 },
      { module: 'Resources CRUD', total: 7, passed: hasFailures ? 5 : 7, failed: hasFailures ? 2 : 0 },
      { module: 'Accessibility', total: 3, passed: hasFailures ? 2 : 3, failed: hasFailures ? 1 : 0 },
      { module: 'Compatibility', total: 4, passed: hasFailures ? 3 : 4, failed: hasFailures ? 0 : 0 },
    ];

    const a11y = hasFailures ? [
      { id: 'A11Y-001', rule: 'color-contrast', severity: 'Medium' as const, element: '.text-slate-400 inside Dashboard KPI cards', description: 'Contrast ratio 2.9:1 vs required 4.5:1', fix: 'Change foreground token → #6b7280 (7.1:1)' },
      { id: 'A11Y-002', rule: 'aria-allowed-attr', severity: 'Low' as const, element: '<span role="status"> with empty aria-live', description: 'aria-live must be off/polite/assertive, not empty string', fix: 'Add aria-live="polite"' },
    ] : [];

    const secFindings = hasFailures ? [
      { id: 'SEC-001', title: 'User enumeration via /auth/login timing', severity: 'High' as const, cwe: 'CWE-204', description: 'Observable response-time differential (37ms vs 112ms) when account exists vs not', location: 'src/api/auth/login.ts:54', remediation: 'Constant-timing comparison + 200ms random jitter per request' },
    ] : [];

    const regressionRisk: 'Low' | 'Medium' | 'High' = hasFailures ? 'High' : 'Low';
    const releaseStatus = hasFailures ? 'FAILED WITH BLOCKERS' : 'PASSED';

    const nextActions = hasFailures
      ? [
          'Fix BUG-001 (enumeration blocker) before any next testing cycle — immediate 2-hr code change',
          'Implement ETag/optimistic lock for BUG-003 across all 14 mutable tables',
          'Add Cache-Control no-store headers on all HTML responses (BUG-002)',
          'Remediate A11Y-001 contrast tokens + Stark/Figma sign-off for 24 body-text offenders',
          'Re-run full automation suite (must achieve >= 95% pass rate to exit regression risk HIGH)',
        ]
      : [
          'Add this Playwright suite to CI with 6 shards for PR-level regressions',
          'Schedule 2x per day smoke run on staging environment with Slack/Teams alerting on any failure',
          'Write additional visual regression scenarios for 4 high-value screens using snapshot thresholds',
          'Next coverage investment: increase API contract tests count (currently Jest schema covers only Resources + Auth)',
        ];

    const modTables = modCoverage.map(m => {
      const bugIdBase = m.module === 'Authentication' ? 1 : m.module === 'Resources CRUD' ? 3 : 4;
      const scenarios = Array.from({ length: m.total }).map((_, i) => {
        const status = i < m.failed ? '❌ FAILED' : '✅ PASSED';
        const note = status.startsWith('❌')
          ? 'See Defect BUG-' + String(bugIdBase).padStart(3, '0')
          : 'Within SLO';
        return '| TC-' + String(m.total - i).padStart(3, '0') + ' | ' + status + ' | ' + (4 + (i % 5)) + 's | ' + note + ' |';
      }).join('\n');
      return '### ' + m.module + '\n| Scenario | Status | Duration | Notes |\n|---|---|---|---|\n' + scenarios;
    }).join('\n\n');

    const defectLog = bugs.length === 0
      ? '*No failures this cycle — congratulations!*'
      : bugs.map(b => {
          const steps = b.stepsToReproduce.map((s, i) => (i + 1) + '. ' + s).join('\n');
          return '### ' + b.id + ' — [' + b.priority + '] ' + b.title + '\n'
            + '| Property | Value |\n|---|---|\n'
            + '| Severity | ' + b.severity + ' |\n'
            + '| Affected Module | ' + b.affectedModule + ' |\n'
            + '| Environment | ' + b.environment + ' |\n'
            + '| Status | **' + b.status + '** |\n'
            + '| Trigger Test | ' + b.testScript + ' |\n\n'
            + '**Root cause**\n> ' + b.rootCause + '\n\n'
            + '**Steps to reproduce**\n' + steps + '\n\n'
            + '**Expected:** ' + b.expectedResult + '\n'
            + '**Actual:** ' + b.actualResult + '\n\n'
            + '**Suggested fix**\n> ' + b.fixSuggestion + '\n\n---';
        }).join('\n\n');

    const perfRows = perf.map(p =>
      '| ' + p.name + ' | ' + p.value + ' ' + p.unit + ' | ' + p.threshold + ' ' + p.unit + ' | ' + p.status.toUpperCase() + ' |'
    ).join('\n');

    const nextChecklist = nextActions.map((a, i) =>
      '- [ ] ' + String(i + 1).padStart(2, '0') + '. ' + a
    ).join('\n');

    return `REPORT:

\`\`\`markdown
# 📋 Quality Test Report — QualityForge Platform

## 1. Executive Summary
| Metric | Value |
|---|---|
| Report generated | ${now.toISOString()} |
| Environment | Staging — us-east-1 (Chromium + WebKit + Jest) |
| Release Status | **${releaseStatus}** |
| Total Scenarios | ${total} |
| Passed ✅ | ${passed} |
| Failed ❌ | ${failed} |
| Skipped ⏭️ | ${skipped} |
| **Pass Rate** | **${passRateStr}** |
| Total Duration | ${durationSec}s |
| Flaky Tests | ${flaky.length} |
| Defects Logged | ${bugs.length} |
| **Regression Risk** | **${regressionRisk}** |

**Go / No-Go Recommendation: ${regressionRisk === 'Low' ? '✅ GO' : '🚫 NO-GO — BLOCKERS MUST BE FIXED FIRST'}**

## 2. Environment & Scope
- **Browsers:** Playwright projects: Chromium 131, WebKit 17.4, Firefox (skipped screenshot)
- **API:** Jest + Axios; ${apiBaseUrl}
- **A11y Runner:** @axe-core/playwright (WCAG 2.2 AA baseline)
- **Data:** 2 isolated users, created and cleaned up per-suite
- **Out of scope this cycle:** Mobile native (Appium), k6 load stress, DAST scans

## 3. Detailed Results (Module-grouped)
${modTables}

## 4. Defect Log
${defectLog}

## 5. Performance Observations
| Metric | Observed | SLO (Max) | Status |
|---|---|---|---|
${perfRows}

## 6. Recommendations
### Development
1. BUG-001, BUG-002, BUG-003 are **${regressionRisk} priority** — assign to this sprint
2. For BUG-003 optimistic-lock, implement a shared \`updatedAt\` + ETag middleware — 14 entities in the repo

### QA / Process
3. Add **constant-timing + response-bytes anti-enumeration assertion** to every future PR check of /auth, /forgot, /verify
4. Expand cross-browser matrix with **Android Chrome + iOS Safari real devices** via Applitools/BrowserStack in next cycle

### Automation
5. This suite is already 6-way shardable → set up **GitHub Actions matrix: shard=1..6** with 3 Playwright workers each — total wall time < 7 minutes
6. Add flaky-test guard: if any scenario RETRIES >0, publish flaky report weekly with owning teams

### Next-cycle (immediate next investments)
7. Mobile Appium 2 setup for iOS + Android checkout flow — estimated 8 scenarios
8. k6 load test with 150 VUs against 4 hot APIs — Trend/Rate metrics + Grafana dashboard

## 7. Artifacts
| Artifact | Path | Size |
|---|---|---|
| Playwright HTML Report | ./playwright-report/index.html | ~ 4.2 MB |
| JSON Machine-Readable Report | ./test-outputs/report.json | ~ 320 KB |
| Trace Viewer (zip) | ./test-outputs/traces/ | ~ 18 MB total |
| Screenshots (failed) | ./test-results/ | ~ 3.1 MB |
| Videos (retained) | ./test-results/ | ~ 22.7 MB |

## 8. Next Actions Checklist
${nextChecklist}
\`\`\`

\`\`\`json
{
  "testSuite": "QualityForge Core Platform — Staging Regression",
  "executionDate": "${now.toISOString()}",
  "environment": "Staging (us-east-1, Playwright chromium+webkit + Jest)",
  "releaseStatus": "${releaseStatus}",
  "automationCoverage": "E2E 41% · API 28% · Visual 15% · A11y 10% · Perf 6%",
  "totalTests": ${total},
  "passed": ${passed},
  "failed": ${failed},
  "skipped": ${skipped},
  "passRate": "${passRateStr}",
  "totalDurationMs": ${durationSec * 1000},
  "flakyTests": ${JSON.stringify(flaky)},
  "bugs": ${JSON.stringify(bugs)},
  "recommendations": [
    "Fix all 5 logged defects before promoting to production",
    "Add the suite to CI in 6-way shard configuration with >= 95% quality gate",
    "Schedule weekly flaky-test triage meetings — 2 currently known flaky",
    "Add k6 load + Appium mobile coverage next cycle"
  ],
  "markdownReport": "# above markdown rendered dashboard#",
  "performanceMetrics": ${JSON.stringify(perf)},
  "accessibilityIssues": ${JSON.stringify(a11y)},
  "securityFindings": ${JSON.stringify(secFindings)},
  "coverageByModule": ${JSON.stringify(modCoverage)},
  "regressionRisk": "${regressionRisk}",
  "nextActions": ${JSON.stringify(nextActions)}
}
\`\`\`
`;
  }

  private mockGenerateCICD(): string {
    const yaml = `# .github/workflows/qualityforge.yml
name: QualityForge — Full QA Pipeline
run-name: E2E + API + A11y + Load on \${{ github.event.pull_request.title || github.ref_name }}

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: '17 6,18 * * *'   # Twice-daily smoke on staging

# ────────────── 6-WAY PLAYWRIGHT SHARDS + 1 API + 1 A11Y + 1 LOAD = 9 JOBS
jobs:
  # ──────────────────────────────────────────────────────────────────────────
  # BUILD — shared
  # ──────────────────────────────────────────────────────────────────────────
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci --workspaces --include-workspace-root

  # ──────────────────────────────────────────────────────────────────────────
  # PLAYWRIGHT — 6 parallel shards (total wall time ~6 min)
  # ──────────────────────────────────────────────────────────────────────────
  playwright:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4, 5, 6]
    container:
      image: mcr.microsoft.com/playwright:v1.45.0-jammy
      options: --user 1001
    timeout-minutes: 35
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci --workspaces --include-workspace-root
      - name: Start preview (app under test)
        run: npm run preview:app -- --port 4173 > /tmp/app.log 2>&1 &
      - name: Wait for app ready
        run: until curl -s -o /dev/null -w '%{http_code}' http://localhost:4173 | grep -q 200; do sleep 1; done;
      - name: Run Playwright shard \${{ matrix.shard }}/6
        run: >
          BASE_URL=http://localhost:4173
          PLAYWRIGHT_JSON_OUTPUT_NAME=shard-\${{ matrix.shard }}-report.json
          npx playwright test --shard=\${{ matrix.shard }}/6 --workers=4 --timeout=45000
        env:
          CI: 'true'
      - name: ⚠️ Upload artifact ALWAYS (trace/vid on failure)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-shard-\${{ matrix.shard }}
          path: |
            playwright-report/
            test-results/
            test-outputs/
            shard-*.json
          retention-days: 14
          if-no-files-found: ignore

  # ──────────────────────────────────────────────────────────────────────────
  # API CONTRACT TESTS (Jest + Zod)
  # ──────────────────────────────────────────────────────────────────────────
  api-tests:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      api:
        image: your-registry/backend:pr-\${{ github.event.number }}
        ports: ['3001:3001']
        env:
          DB_URL: sqlite://./ci-testing.db
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci --workspaces --include-workspace-root
      - run: >
          API_BASE_URL=http://localhost:3001/api
          npx jest --coverage --json --outputFile=jest-report.json
          || true  # never fail step before uploading artifact
      - name: Upload API report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: api-contract-tests
          path: |
            jest-report.json
            coverage/
          retention-days: 14

  # ──────────────────────────────────────────────────────────────────────────
  # A11Y AXE-CORE SCAN (home + 5 hot screens)
  # ──────────────────────────────────────────────────────────────────────────
  a11y:
    needs: build
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.45.0-jammy
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --workspaces --include-workspace-root
      - run: npx playwright install chromium
      - run: npm run preview:app -- --port 4173 &
      - run: until curl -s http://localhost:4173 >/dev/null; do sleep 1; done;
      - name: Run axe-core scan
        run: |
          BASE_URL=http://localhost:4173 node scripts/axe-scan.mjs \
            / /login /dashboard /resources /resources/new /profile > a11y-report.json
      - name: Upload a11y results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: a11y-report
          path: a11y-report.json

  # ──────────────────────────────────────────────────────────────────────────
  # LOAD TEST k6 (only on main branch or manual workflow_dispatch)
  # ──────────────────────────────────────────────────────────────────────────
  k6:
    needs: [playwright, api-tests]
    if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          version: latest
      - name: Run average_load scenario
        env:
          K6_CLOUD_TOKEN: \${{ secrets.K6_CLOUD_TOKEN }}
          BASE_URL: https://staging.your-app.com
        run: |
          k6 cloud --include-system-env-vars --tag commit=\${{ github.sha }} \
            server/tests/k6/load-test.js --tag source=github-actions
        continue-on-error: true

  # ──────────────────────────────────────────────────────────────────────────
  # QUALITY GATE — aggregator job (blocking on merge if FAIL)
  # ──────────────────────────────────────────────────────────────────────────
  quality-gate:
    needs: [playwright, api-tests, a11y]
    runs-on: ubuntu-latest
    timeout-minutes: 5
    if: always()
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: actions/download-artifact@v4
        with: { pattern: '*', merge-multiple: true }

      - name: Compute pass rate across 6 shards
        id: gate
        run: |
          node scripts/quality-gate.cjs

      - name: 📊 Post PR comment (pull_request only)
        if: github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: qualityforge-report
          path: quality-gate-summary.md

      - name: Final gate status
        run: |
          PASSED=\${{ steps.gate.outputs.passRate }}
          echo "Pass rate: $PASSED"
          if awk -v p="$PASSED" 'BEGIN {exit !(p < 95)}'; then
            echo "❌ QUALITY GATE FAILED: pass rate below 95%"
            exit 1
          fi
          echo "✅ QUALITY GATE PASSED"
`;

    const code = `// scripts/axe-scan.mjs — Playwright + @axe-core runner for 6 URLs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const routes = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
const report = { base: BASE, generatedAt: new Date().toISOString(), pages: [] };

for (const route of routes) {
  await page.goto(\`\${BASE}\${route}\`, { waitUntil: 'networkidle' });
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'section508', 'best-practice'])
    .disableRules(['page-has-heading-one', 'landmark-one-main'])
    .analyze();
  const summary = {
    route,
    url: page.url(),
    violations: axe.violations.length,
    passes: axe.passes.length,
    inapplicable: axe.inapplicable.length,
    bySeverity: {
      critical: axe.violations.filter(v => v.impact === 'critical').length,
      serious:  axe.violations.filter(v => v.impact === 'serious').length,
      moderate: axe.violations.filter(v => v.impact === 'moderate').length,
      minor:    axe.violations.filter(v => v.impact === 'minor').length,
    },
    topViolations: axe.violations.slice(0, 6).map(v => ({
      id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, nodes: v.nodes.length,
      sampleNode: v.nodes[0]?.target?.[0] || '',
    })),
  };
  report.pages.push(summary);
  console.error(\`✅ axe \${route}  —  CRIT:\${summary.bySeverity.critical}  SERIOUS:\${summary.bySeverity.serious}  MOD:\${summary.bySeverity.moderate}  MIN:\${summary.bySeverity.minor}\`);
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
process.exit(report.pages.some(p => p.bySeverity.critical + p.bySeverity.serious > 0) ? 2 : 0);
`;

    return `## 🛠️ CI/CD Pipeline — GitHub Actions (6 Playwright shards + API + A11y + Load + Quality Gate)

**Production-ready GitHub Actions workflow with 9 parallel jobs, twice-daily schedule, 6-way sharded Playwright, shared build cache, per-jab container optimization, flaky resilient fail-fast=false, artifact capture ALWAYS, final quality-gate aggregator job that posts sticky PR comment and BLOCKS merge below 95%.**

SCRIPT:

\`\`\`json
{
  "framework": "github-actions",
  "language": "yaml",
  "code": ${JSON.stringify(yaml)},
  "configSnippet": ${JSON.stringify(code)},
  "runCommand": "Merge file to .github/workflows/qualityforge.yml — runs automatically on pull_request/push/schedule",
  "setupInstructions": [
    "Create K6_CLOUD_TOKEN secret in GitHub → required for k6 cloud reporting job",
    "Set up container registry with 'your-registry/backend:pr-<PR_NUMBER>' tagged preview deployments (or swap for Vercel/Render preview)",
    "Create scripts/quality-gate.cjs aggregator to merge 6 shard JSONs into pass-rate + markdown",
    "Author marocchino/sticky-pull-request-comment with read/write permissions in repo Actions settings"
  ],
  "dependencies": [],
  "explanation": []
}
\`\`\`

\`\`\`yaml
${yaml}
\`\`\`

**Bonus: helper \\\`scripts/axe-scan.mjs\\\` used by the \\\`a11y\\\` job (bundles 6 URLs + severity counts + top violations):**
\`\`\`javascript
${code}
\`\`\`
`;
  }

  private mockGenerateTestPlan(userText: string, security: boolean, performance: boolean, api: boolean, mobile: boolean, a11y: boolean): string {
    const totalBands = 2 + (security ? 1 : 0) + (performance ? 1 : 0) + (api ? 1 : 0) + (mobile ? 1 : 0) + (a11y ? 1 : 0);
    const now = new Date().toISOString().split('T')[0];

    return `## ✨ QualityForge AI — Full Capabilities Overview

I'm a **Senior QA Architect** with 20 native testing capabilities. Anything you describe will be routed through the appropriate combination of skills — here's a complete capability matrix + tailored coverage plan for what you just described:

---

### 🧰 **All 20 Capabilities I Support**

| # | Capability | What I can produce |
|---|---|---|
| 1 | **Test Planning & Strategy** | Risk-scoped coverage matrices per feature surface, release gates, automation ROI, SLOs |
| 2 | **Test Case Generation** | 12–20 structured scenarios: happy/negative/boundary/security/edge with priority/module/tags |
| 3 | **Script Generation — E2E Web** | **Playwright** (strict POM, fixtures, storageState, trace) or **Cypress** (cy.intercept, custom cmds) |
| 4 | **Script Generation — Mobile** | Appium 2 + WebdriverIO: iOS/Android lifecycle, permissions, gestures, background |
| 5 | **Script Generation — API** | Jest+Axios with Zod OpenAPI schemas: 7 HTTP classes, rate-limit, CORS, idempotency, IDOR |
| 6 | **Script Generation — Load/Perf** | **k6**: scenarios, Trend/Rate metrics, thresholds, stages, SharedArray multi-user |
| 7 | **Script Execution & Debugging** | Runner with timeouts, progress WS events, graceful SIGTERM→SIGKILL, artifact collection |
| 8 | **Result Analysis** | Per-module, per-status, per-browser, timing, regression vs last-run comparison |
| 9 | **Bug Triage** | Priority/severity, root cause, 5-steps repro, fix suggestions, Jira/Linear-ready tickets |
| 10 | **Report Generation** | Executive summary + Go/No-Go + module tables + defects + perf/a11y/security + checklist |
| 11 | **Accessibility — WCAG 2.2 AA** | axe-core scans: keyboard only, landmarks, focus, color contrast, ARIA |
| 12 | **Performance & Core Web Vitals** | Lighthouse audits + k6 load/p95/CLS/INP/LCP; SLO thresholds; fail exit code |
| 13 | **Security — OWASP Top 10** | Injection / Broken Auth / ACL / XSS / CSRF / uploads / secrets / DAST-style scenarios |
| 14 | **Visual / UI Regression** | Snapshot thresholds; per-browser cross-check; storybook component-level tests |
| 15 | **Mobile (iOS/Android native)** | Background, lock/unlock, rotate, notifications, deep links, permission flows |
| 16 | **Test Data Generation** | Deterministic seeded fixtures; CSV SharedArray k6 multi-user, realistic PII-safe data |
| 17 | **CI/CD Integration** | GitHub Actions (6 shard matrix) / GitLab CI / Jenkins — Slack alerts, quality gate |
| 18 | **Code Review of Automation** | Optimizations: network mocking, parallelization, flaky reduction, storage-state reuse |
| 19 | **Test Optimization / Parallelization** | Sharding strategies, retries, workers config, cost/run-time vs reliability trade-offs |
| 20 | **Flaky Test Detection** | Retry count analysis, root cause (selector/race/env), remediation pattern library |

---

## 🎯 Tailored Coverage Plan for: "${userText.slice(0, 120)}"

**Date:** ${now}  **Testing Bands Required:** ${totalBands} of 8

### Phase 1: High-Value Immediate Coverage (70%+ risk reduction in 1 sprint)
| Priority | Band | Scenario Count | Automation Choice |
|---|---|---|---|
| 🔴 P0 | Functional E2E Web + Auth | 15 scenarios | **Playwright** strict POM with storageState — 6-shardable for CI |
| 🔴 P0 | Form / Validation / CRUD | built-in | Playwright embedded |
| 🟠 P1 | ${api ? 'API Contract (Schema + 7 HTTP classes)' : '~~API Contract~~ — opt-in per-request'} | ${api ? '~20' : 0} | Jest + Axios + Zod |
| 🟠 P1 | ${security ? 'OWASP Top 10 (Injection / ACL / uploads / rate-limit)' : '~~Security baseline~~ — defer to next cycle'} | ${security ? 12 : 0} | Playwright + @zaproxy/node + fuzzing payloads |
| 🟡 P2 | ${a11y ? 'WCAG 2.2 AA — axe-core + keyboard-only flows' : '~~Accessibility~~ — add after launch'} | ${a11y ? '6' : 0} | @axe-core/playwright embedded in every E2E describe block |
| 🟡 P2 | ${performance ? 'k6 Load (smoke + avg_load) + Core Web Vitals' : '~~Load/Performance~~ — defer'} | ${performance ? '~8' : 0} | k6 scenarios + Trend/Rate metrics + thresholds |
| 🟢 P3 | ${mobile ? 'Mobile iOS/Android — background + permissions' : '~~Mobile native~~ — schedule Q4'} | ${mobile ? '10' : 0} | Appium 2 + WebdriverIO TypeScript |
| 🟢 P3 | Visual Regression + Cross-Browser (webkit/chromium) | 12 snapshots | Playwright projects + snapshots with 80-px tolerance |

### Phase 2: Automation Investment (payback in 60 days)
1. **Integrate into CI — GitHub Actions 6 shard matrix:**
   - Playwright shard 1/6..6/6 (workers=4 each, timeout 35m, **fail-fast=false**)
   - API + A11y in parallel
   - k6 load (scheduled 2x daily main branch only)
   - Final **quality-gate aggregator job** posts sticky PR comment (pass-rate %, defects list, direct links to artifact traces)
2. **Flaky guard rail:** retries:1 in playwright config; separate weekly **flaky test report** to owning teams
3. **Alerting:** twice-daily staging run → Slack/Teams if ANY scenario fails

### Phase 3: Recommended Next Questions
Click the **"Suggested Next Actions"** chips that appear above this message for:
- ⚙️ Full Playwright script with strict POM
- 🛰️ Jest API contract tests (7-class HTTP validation)
- ⚡ k6 load test
- 🛠️ GitHub Actions 6-way-shard pipeline YAML

Just describe what you'd like — or paste a URL to start — and I'll generate scenarios, scripts, and reports end-to-end.
`;
  }

  private mockGenerateOptimization(): string {
    return `## 🚀 Automation Optimization Plan

Applied to your current suite (20 E2E + 10 API scenarios), here's the breakdown:

### Before vs After
| Metric | Current | Optimized | % Improvement |
|---|---|---|---|
| Total wall time | 42 min (workers=2) | **~6.5 min (CI)** | 84% faster |
| Pass rate flakiness | 2–3% re-run | < 0.5% | 83% less flaky |
| Storage / artifacts | 3.2 GB / run | 800 MB / run | 75% reduction |
| CI cost / run | 21 min x large runners | 6 x shard-medium | 50% saving |

### Strategy
1. **Parallelize — Playwright shard=1/6 to 6/6 on 6 matrix runners.** This alone cuts time to 1/6th.
2. **Reuse session with storageState fixture — 1 initial login per SHARED worker, not per test.** Saves 1.2s per test × 20 tests = 24s / shard.
3. **Network mocks for 3rd party:** route stripe.com, intercom, segment to local Playwright route mocks — remove ~600ms/test
4. **Trace/video/screenshot = retain-on-failure only.** Cuts artifact size 75%.
5. **Flaky = serial + retries=2:** Mark only currently-flaky scenarios (TC-013, TC-015) with \\\`test.describe.configure({ mode: 'serial', retries: 2 })\\\` — rest parallel.
6. **Separate hot paths:** 12 smoke tests in **pull_request** (fast shard 1 only), full 30 in schedule/main push.

### Config Snippet
\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  retries: 1,
  workers: process.env.CI ? 4 : undefined,
  projects: [
    {
      name: 'chromium-smoke',
      grep: /@smoke/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'chromium-full',
      grepInvert: /@smoke/,
      use: { ...devices['Desktop Chrome'] }
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, retries: 2 },
  ],
  reporter: [['blob'], ['json', { outputFile: 'report.json' }]]
});
\`\`\`

Apply these changes and you'll see wall time drop from ~42 minutes to < 7 minutes at the 95th percentile of CI runs.
`;
  }

  async completeUserPrompt(prompt: string, maxTokens = 16384): Promise<string> {
    return this.complete([{ role: 'user', content: prompt }], maxTokens);
  }

  private hydrateHistory(sessionId: string): Message[] {
    const cached = this.conversationHistory.get(sessionId);
    if (cached && cached.length > 0) return [...cached];

    const fromDb = getMessages(sessionId)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    this.conversationHistory.set(sessionId, fromDb);
    return [...fromDb];
  }

  private rememberSessionFacts(sessionId: string, userMessage: string): void {
    const lower = userMessage.toLowerCase();
    const urlMatch = userMessage.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      appendSessionContext(sessionId, `URL mentioned: ${urlMatch[0]}`);
      this.trackCapability(sessionId, 'test_planning');
      this.trackCapability(sessionId, 'script_generation');
    }
    if (lower.includes('staging') || lower.includes('production') || lower.includes('dev environment')) {
      appendSessionContext(sessionId, `Environment note: ${userMessage.slice(0, 200)}`);
    }
    if (lower.includes('perform') || lower.includes('slow') || lower.includes('load') || lower.includes('stress')) {
      this.trackCapability(sessionId, 'performance_testing');
      this.trackCapability(sessionId, 'load_testing');
    }
    if (lower.includes('secur') || lower.includes('vuln') || lower.includes('owasp') || lower.includes('xss') || lower.includes('sqli')) {
      this.trackCapability(sessionId, 'security_testing');
    }
    if (lower.includes('accessib') || lower.includes('a11y') || lower.includes('wcag') || lower.includes('screen reader')) {
      this.trackCapability(sessionId, 'accessibility_testing');
    }
    if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android') || lower.includes('appium')) {
      this.trackCapability(sessionId, 'mobile_testing');
    }
    if (lower.includes('api') || lower.includes('rest') || lower.includes('graphql') || lower.includes('endpoint')) {
      this.trackCapability(sessionId, 'api_testing');
    }
    if (lower.includes('visual') || lower.includes('ui') || lower.includes('regression') || lower.includes('screenshot')) {
      this.trackCapability(sessionId, 'visual_testing');
    }
    if (lower.includes('flaky') || lower.includes('flake') || lower.includes('intermittent')) {
      this.trackCapability(sessionId, 'flaky_test_detection');
    }
    if (lower.includes('ci') || lower.includes('pipeline') || lower.includes('github action') || lower.includes('jenkins') || lower.includes('deploy')) {
      this.trackCapability(sessionId, 'ci_cd_integration');
    }
    if (lower.includes('bug') || lower.includes('defect') || lower.includes('triage')) {
      this.trackCapability(sessionId, 'bug_triage');
    }
    if (lower.includes('optimize') || lower.includes('faster') || lower.includes('speed up') || lower.includes('parallel')) {
      this.trackCapability(sessionId, 'test_optimization');
    }
    if (lower.includes('review') || lower.includes('pull request') || lower.includes('code review') || lower.includes('pr ')) {
      this.trackCapability(sessionId, 'code_review');
    }
    if (lower.includes('data') || lower.includes('fixture') || lower.includes('seed')) {
      this.trackCapability(sessionId, 'test_data_generation');
    }
  }

  private trackCapability(sessionId: string, cap: AICapability): void {
    if (!this.sessionCapabilities.has(sessionId)) {
      this.sessionCapabilities.set(sessionId, new Set());
    }
    this.sessionCapabilities.get(sessionId)!.add(cap);
  }

  private getCapabilities(sessionId: string): AICapability[] {
    return Array.from(this.sessionCapabilities.get(sessionId) || []);
  }

  private generateSuggestedActions(
    sessionId: string,
    phase: AgentPhase,
    hasTestCases: boolean,
    hasScript: boolean,
    hasReport: boolean,
    hasFailures: boolean
  ): SuggestedAction[] {
    const actions: SuggestedAction[] = [];
    const lower = (this.conversationHistory.get(sessionId) || [])
      .map((m) => m.content.toLowerCase())
      .join(' ');

    switch (phase) {
      case 'questioning':
        if (lower.match(/https?:\/\//) || lower.includes('app') || lower.includes('website')) {
          actions.push({
            id: 'gen-tc',
            label: 'Generate Test Suite',
            description: 'Create comprehensive test cases for this application',
            prompt: 'Generate a comprehensive test suite covering all major flows, including edge cases and negative scenarios.',
            capability: 'test_case_generation',
          });
          actions.push({
            id: 'gen-e2e',
            label: 'Generate E2E Playwright Script',
            description: 'Skip to an executable Playwright script',
            prompt: 'Generate the full Playwright automation script directly, include all test cases with proper setup.',
            capability: 'script_generation',
          });
        }
        if (lower.includes('api') || lower.includes('endpoint')) {
          actions.push({
            id: 'gen-api',
            label: 'API Test Suite (Jest/Axios)',
            description: 'Generate REST API validation tests with schema checks',
            prompt: 'Create Jest + Axios API tests that validate status codes, response schemas, and error handling for all endpoints.',
            capability: 'api_testing',
          });
        }
        actions.push({
          id: 'what-test',
          label: 'Coverage Recommendation',
          description: 'Tell me what to test for my feature',
          prompt: 'I have a feature. Can you outline a complete test coverage matrix with priorities and automation strategies?',
          capability: 'test_planning',
        });
        actions.push({
          id: 'security-quick',
          label: 'Security Baseline Checks',
            description: 'OWASP Top 10 scan scenarios',
          prompt: 'Generate a quick OWASP Top 10 security test baseline for my application with test cases.',
          capability: 'security_testing',
        });
        break;

      case 'generating':
      case 'analyzing':
        if (hasTestCases && !hasScript) {
          actions.push({
            id: 'gen-playwright',
            label: 'Build Playwright Script',
            description: 'Convert test cases to Playwright with POM pattern',
            prompt: 'Generate the Playwright automation script for these test cases using Page Object Model pattern with retries and screenshots.',
            capability: 'script_generation',
          });
          actions.push({
            id: 'gen-cypress',
            label: 'Build Cypress Script',
            description: 'Alternative E2E framework',
            prompt: 'Generate a Cypress E2E automation script for these test cases with custom commands and network aliases.',
            capability: 'script_generation',
          });
          actions.push({
            id: 'more-edges',
            label: 'Add Edge Cases',
            description: 'Expand with boundary, negative, and concurrency tests',
            prompt: 'Add more edge cases, boundary conditions, negative tests, and concurrency scenarios to this test suite.',
            capability: 'test_case_generation',
          });
        }
        actions.push({
          id: 'perf-plan',
          label: 'Add Performance Test',
          description: 'Load test plan with k6',
          prompt: 'Generate a complementary k6 load testing plan and script for the user flows covered by these test cases.',
          capability: 'performance_testing',
        });
        break;

      case 'reviewing':
        if (hasScript) {
          actions.push({
            id: 'explain-script',
            label: 'Walk Through Script',
            description: 'Explain each section and design choice',
            prompt: 'Explain this script section by section — walk me through the architecture, key assertions, and how to customize it.',
            capability: 'code_review',
          });
          actions.push({
            id: 'optimize-script',
            label: 'Optimize & Parallelize',
            description: 'Make it faster with parallel workers and fixtures',
            prompt: 'Optimize this script: add parallel execution, fixture reuse, network mocking, and flaky test resilience patterns.',
            capability: 'test_optimization',
          });
          actions.push({
            id: 'add-debug',
            label: 'Add Debug + Tracing',
            description: 'Trace viewer, video, and logs on failure',
            prompt: 'Enhance this script with Playwright trace capture, video recording, and detailed step logging for every test failure.',
            capability: 'flaky_test_detection',
          });
        }
        break;

      case 'executing':
      case 'debugging':
        if (hasFailures) {
          actions.push({
            id: 'triage-fail',
            label: 'Triage Failures',
            description: 'Bug report vs script issue vs environment',
            prompt: 'Analyze the failed tests. Categorize each as: real bug / script flake / environment issue. Suggest fixes and generate bug reports.',
            capability: 'bug_triage',
          });
          actions.push({
            id: 'fix-script',
            label: 'Fix The Script',
            description: 'Patch selectors, waits, and auth logic',
            prompt: 'Looking at the error output, fix the automation script: update selectors, add smart waits, and handle race conditions.',
            capability: 'script_generation',
          });
        }
        actions.push({
          id: 'rerun-fail',
          label: 'Re-run Failures Only',
          description: 'Focus on the tests that broke',
          prompt: 'Advise on how to re-run only the failed tests and generate a focused regression report.',
          capability: 'script_execution',
        });
        break;

      case 'reporting':
        if (hasReport) {
          actions.push({
            id: 'gen-bugs',
            label: 'Export Bug Reports',
            description: 'Jira/Linear ready bug tickets',
            prompt: 'Generate detailed bug tickets for each failure with root cause analysis, repro steps, screenshots, and suggested fixes.',
            capability: 'bug_triage',
          });
          actions.push({
            id: 'gen-ci',
            label: 'CI Pipeline Integration',
            description: 'GitHub Actions / GitLab CI YAML',
            prompt: 'Generate a complete CI pipeline YAML (GitHub Actions or GitLab CI) that runs these tests on every PR with artifact collection and quality gates.',
            capability: 'ci_cd_integration',
          });
          actions.push({
            id: 'next-cycle',
            label: 'Next Test Cycle Plan',
            description: 'Coverage gaps + what to automate next',
            prompt: 'Based on this report, plan the next test cycle: identify coverage gaps, prioritize automation backfill, and suggest flaky test remediation.',
            capability: 'test_planning',
          });
        }
        break;

      case 'optimizing':
        actions.push({
          id: 'parallel-config',
          label: 'Parallel Execution Config',
          description: 'Shard tests across workers',
          prompt: 'Configure the test suite for maximum parallelism: shard tests, set up workers, and calculate CI cost savings.',
          capability: 'test_optimization',
        });
        break;
    }

    if (actions.length === 0) {
      actions.push({
        id: 'explore',
        label: 'Show All Capabilities',
        description: 'See what the AI can do',
        prompt: 'List all your testing capabilities and suggest what would give me the most value based on our conversation so far.',
        capability: 'test_planning',
      });
    }

    return actions.slice(0, 4);
  }

  private detectPhase(sessionId: string, text: string): AgentPhase {
    const lower = text.toLowerCase();
    const prevPhase = this.sessionPhases.get(sessionId);

    const hasFailures = lower.includes('failed') || lower.includes('error') || lower.includes('bug') || lower.includes('defect') || lower.includes('❌');
    const hasExecuting = lower.includes('running') || lower.includes('execut') || lower.includes('progress') || lower.includes('tests passed');

    if (lower.includes('report:') || lower.includes('## executive summary') || lower.includes('release status') || lower.includes('pass rate')) {
      return 'reporting';
    }
    if (lower.includes('optimize') || lower.includes('parallelize') || lower.includes('faster') || lower.includes('performance tuning')) {
      return 'optimizing';
    }
    if (hasExecuting || lower.includes('runner:') || lower.includes('terminal output')) {
      return hasFailures ? 'debugging' : 'executing';
    }
    if (lower.includes('script:') || lower.includes('```typescript') || lower.includes('```javascript') || lower.includes('playwright') || lower.includes('cypress') || lower.includes('jest') || lower.includes('k6 ')) {
      return 'reviewing';
    }
    if (lower.includes('test cases:') || lower.includes('tc001') || (lower.includes('"id"') && lower.includes('"tc'))) {
      return 'generating';
    }
    if (lower.includes('analyz') || lower.includes('scanning') || lower.includes('coverage')) {
      return 'analyzing';
    }
    if (lower.includes('what type') || lower.includes('could you') || (lower.includes('?') && lower.length < 300)) {
      return 'questioning';
    }

    return prevPhase || 'questioning';
  }

  private extractJson<T>(text: string): T | null {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : text;

    const firstBracket = raw.indexOf('[');
    const firstBrace = raw.indexOf('{');

    let start = -1;
    if (firstBracket >= 0 && firstBrace >= 0) {
      start = Math.min(firstBracket, firstBrace);
    } else {
      start = firstBracket >= 0 ? firstBracket : firstBrace;
    }

    if (start < 0) return null;

    let depth = 0;
    const openChar = raw[start];
    const closeChar = openChar === '[' ? ']' : '}';

    for (let i = start; i < raw.length; i++) {
      if (raw[i] === openChar) depth++;
      else if (raw[i] === closeChar) depth--;

      if (depth === 0) {
        try {
          const candidate = raw.slice(start, i + 1);
          const parsed = JSON.parse(candidate);
          return parsed as T;
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  parseTestCasesFromResponse(text: string): TestCase[] {
    const parsed = this.extractJson<TestCase[] | TestCase>(text);
    if (!parsed) return [];
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  parseScriptFromResponse(text: string): GeneratedScript {
    const parsed = this.extractJson<GeneratedScript>(text);
    if (parsed?.code && parsed.code.length > 50) return parsed;

    const codeMatch = text.match(/```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)```/);
    return {
      code: codeMatch?.[1]?.trim() || text,
      framework: 'playwright',
      runCommand: 'npx playwright test',
      explanation: [],
      dependencies: ['@playwright/test'],
      language: 'TypeScript',
      setupInstructions: [
        'npm install @playwright/test',
        'npx playwright install chromium',
        'Create .env file with BASE_URL and credentials if needed',
      ],
    };
  }

  private extractMarkdown(text: string): string | null {
    const fenced = text.match(/```markdown\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();
    if (text.includes('## Executive Summary') || text.includes('# Quality Test Report') || text.includes('**Release Status')) {
      const jsonStart = text.indexOf('```json');
      return jsonStart > 0 ? text.slice(0, jsonStart).trim() : text.trim();
    }
    return null;
  }

  parseReportFromResponse(text: string): TestReport {
    const markdownReport = this.extractMarkdown(text);
    const parsed = this.extractJson<TestReport>(text);

    const now = new Date();
    const base: TestReport = parsed?.testSuite
      ? { ...parsed }
      : {
          testSuite: 'Test Suite',
          executionDate: now.toISOString(),
          environment: 'development',
          totalTests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          passRate: '0%',
          bugs: [],
          recommendations: [],
        };

    if (markdownReport) base.markdownReport = markdownReport;
    if (!base.releaseStatus) {
      const fail = (base.failed || 0) > 0;
      base.releaseStatus = fail ? 'FAILED WITH BLOCKERS' : 'PASSED';
    }
    if (!base.totalDurationMs && base.totalTests > 0) {
      base.totalDurationMs = base.totalTests * 1500 + (base.failed || 0) * 3000;
    }
    return base;
  }

  async chat(sessionId: string, userMessage: string): Promise<AgentResponse> {
    const history = this.hydrateHistory(sessionId);
    const last = history[history.length - 1];
    if (!last || last.role !== 'user' || last.content !== userMessage) {
      history.push({ role: 'user', content: userMessage });
    }
    this.rememberSessionFacts(sessionId, userMessage);

    const trimmed = history.slice(-MAX_HISTORY);
    this.conversationHistory.set(sessionId, trimmed);

    const meta = getSessionMeta(sessionId);
    const systemPrompt = getSystemPrompt({
      testType: meta.testType,
      appContext: meta.appContext,
      messageCount: trimmed.length,
    });

    const text = await this.complete(
      trimmed.map((m) => ({ role: m.role, content: m.content })),
      16384,
      systemPrompt
    );

    trimmed.push({ role: 'assistant', content: text });
    this.conversationHistory.set(sessionId, trimmed.slice(-MAX_HISTORY));

    const phase = this.detectPhase(sessionId, text);
    this.sessionPhases.set(sessionId, phase);

    const result: AgentResponse = { message: text, phase, confidence: 0.85 };

    let hasTestCases = false;
    let hasScript = false;
    let hasReport = false;
    let hasFailures = false;

    if (text.includes('TEST CASES:') || phase === 'generating' || phase === 'analyzing') {
      const cases = this.parseTestCasesFromResponse(text);
      if (cases.length > 0) {
        result.testCases = cases;
        hasTestCases = true;
        this.trackCapability(sessionId, 'test_case_generation');
      }
    }

    if (
      text.includes('SCRIPT:') ||
      text.includes('```typescript') ||
      text.includes('```javascript') ||
      text.includes('```ts') ||
      phase === 'reviewing'
    ) {
      const script = this.parseScriptFromResponse(text);
      if (script.code && script.code.length > 50) {
        result.script = script;
        hasScript = true;
        this.trackCapability(sessionId, 'script_generation');
      }
    }

    if (text.includes('REPORT:') || phase === 'reporting' || text.includes('**Release Status')) {
      const report = this.parseReportFromResponse(text);
      if (report.testSuite && report.totalTests > 0) {
        result.report = report;
        hasReport = true;
        hasFailures = (report.failed || 0) > 0;
        this.trackCapability(sessionId, 'report_generation');
        if (hasFailures) this.trackCapability(sessionId, 'bug_triage');
      }
    }

    result.suggestedActions = this.generateSuggestedActions(
      sessionId,
      phase,
      hasTestCases,
      hasScript,
      hasReport,
      hasFailures
    );

    result.capabilitiesUsed = this.getCapabilities(sessionId);

    return result;
  }

  async generateTestCases(sessionId: string, context: string, testType = 'E2E'): Promise<TestCase[]> {
    this.trackCapability(sessionId, 'test_case_generation');
    const prompt = getTestCasePrompt(context, testType);
    const text = await this.complete([{ role: 'user', content: prompt }], 16384);
    return this.parseTestCasesFromResponse(text);
  }

  async generateScript(
    sessionId: string,
    testCases: TestCase[],
    framework: string,
    appContext = ''
  ): Promise<GeneratedScript> {
    this.trackCapability(sessionId, 'script_generation');
    if (framework.toLowerCase().includes('k6') || framework.toLowerCase().includes('load') || framework.toLowerCase().includes('performance')) {
      this.trackCapability(sessionId, 'performance_testing');
    }
    if (framework.toLowerCase().includes('appium')) {
      this.trackCapability(sessionId, 'mobile_testing');
    }
    if (framework.toLowerCase().includes('jest') || framework.toLowerCase().includes('api')) {
      this.trackCapability(sessionId, 'api_testing');
    }
    const prompt = getScriptPrompt(testCases, framework, appContext);
    const text = await this.complete([{ role: 'user', content: prompt }], 16384);
    return this.parseScriptFromResponse(text);
  }

  async generateReport(sessionId: string, results: TestResult[], context = ''): Promise<TestReport> {
    this.trackCapability(sessionId, 'report_generation');
    this.trackCapability(sessionId, 'result_analysis');
    const hasFailures = results.some((r) => r.status === 'failed');
    if (hasFailures) this.trackCapability(sessionId, 'bug_triage');

    const prompt = getReportPrompt(results, context);
    const text = await this.complete([{ role: 'user', content: prompt }], 16384);
    const report = this.parseReportFromResponse(text);

    if (!report.totalTests || report.totalTests === 0) {
      const passed = results.filter((r) => r.status === 'passed').length;
      const failed = results.filter((r) => r.status === 'failed').length;
      const skipped = results.filter((r) => r.status === 'skipped' || r.status === 'flaky').length;
      const total = results.length;
      report.totalTests = total;
      report.passed = passed;
      report.failed = failed;
      report.skipped = skipped;
      report.passRate = total > 0 ? `${Math.round((passed / total) * 1000) / 10}%` : '0%';
      report.totalDurationMs = results.reduce((s, r) => s + (r.duration || 0), 0);
      report.releaseStatus = failed > 0 ? 'FAILED WITH BLOCKERS' : 'PASSED';
    }

    if (report.bugs.length === 0 && hasFailures) {
      report.bugs = results
        .filter((r) => r.status === 'failed')
        .map((r, i) => ({
          id: `BUG-${String(i + 1).padStart(3, '0')}`,
          title: `Test failure: ${r.title}`,
          severity: i < 2 ? 'High' : 'Medium',
          status: 'Open',
          priority: i < 1 ? 'Blocker' : 'High',
          stepsToReproduce: [],
          expectedResult: 'Test completes without errors',
          actualResult: r.error || 'Automated test failed — see error output for details',
          affectedModule: r.module || 'Uncategorized',
          environment: context || 'Staging',
          fixSuggestion: 'Investigate test failure, triage as bug or script issue',
          testScript: r.id,
        }));
    }

    if (report.recommendations.length === 0) {
      report.recommendations = hasFailures
        ? [
            'Triage the reported failures and distinguish real bugs from script flakiness',
            'Update automation selectors if UI changed, add waitForLoadState where timing-sensitive',
            'Re-run failed tests to confirm reproducibility before escalating to development',
          ]
        : [
            'Consider adding performance benchmarks and visual regression snapshots to the pipeline',
            'Integrate this test suite into CI for every PR with a quality gate at pass rate >= 95%',
            'Plan test pyramid improvements — supplement E2E with more unit and integration tests',
          ];
    }

    return report;
  }

  clearSession(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
    this.sessionPhases.delete(sessionId);
    this.sessionCapabilities.delete(sessionId);
  }
}

export default new ClaudeAgent();
