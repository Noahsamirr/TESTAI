/**
 * @package @testmind/ai-agents
 * @description Playwright Code Generator Agent — converts structured test cases into
 * production-quality Playwright TypeScript test files with Page Object Model scaffolding.
 *
 * Generates:
 *   - TypeScript Playwright test files with describe/test blocks
 *   - Page Object Model class files
 *   - Fixtures and beforeAll/afterAll setup
 *   - playwright.config.ts with multi-browser matrix
 *   - data-testid annotations for HTML (as comments/suggestions)
 *   - CI/CD GitHub Actions workflow snippet
 */

import { BaseAgent } from '../BaseAgent';
import type { AgentTask, AgentResult, AgentCapabilityType } from '../types';

interface PlaywrightGenInput {
  testCases: TestCaseInput[];
  appUrl?: string;
  framework?: 'playwright' | 'webdriverio';
  browsers?: string[];
  headless?: boolean;
  generatePageObjects?: boolean;
  baselineScreenshots?: boolean;
  ciProvider?: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci';
}

interface TestCaseInput {
  id?: string;
  title: string;
  description?: string;
  steps: string[];
  expectedResult?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  tags?: string[];
  page?: string; // e.g. 'LoginPage', 'DashboardPage'
}

interface PlaywrightGenOutput {
  testFile: string;
  pageObjects: PageObjectFile[];
  configFile: string;
  ciWorkflow?: string;
  installCommand: string;
  runCommand: string;
  summary: {
    testCount: number;
    pageObjects: number;
    browsers: string[];
    estimatedDurationMinutes: number;
  };
}

interface PageObjectFile {
  className: string;
  filePath: string;
  code: string;
}

export class PlaywrightGeneratorAgent extends BaseAgent {
  readonly id = 'playwright-generator-agent';
  readonly name = 'Playwright Generator Agent';
  readonly description =
    'Converts structured test cases into production-quality Playwright TypeScript files with Page Object Model scaffolding, config, and CI workflows.';
  readonly capabilities: AgentCapabilityType[] = ['playwright_generation'];

  protected validate(task: AgentTask): string | null {
    const cases = task.input['testCases'] as TestCaseInput[] | undefined;
    if (!Array.isArray(cases) || cases.length === 0) {
      return "Field 'testCases' must be a non-empty array of test case objects.";
    }
    return null;
  }

  protected async doExecute(
    task: AgentTask
  ): Promise<Omit<AgentResult, 'taskId' | 'agentId' | 'agentName' | 'durationMs' | 'completedAt'>> {
    const input = task.input as unknown as PlaywrightGenInput;
    const {
      testCases,
      appUrl = 'https://your-app.com',
      browsers = ['chromium', 'firefox', 'webkit'],
      headless = true,
      generatePageObjects = true,
      ciProvider = 'github-actions',
    } = input;

    // Group test cases by page
    const byPage = this.groupByPage(testCases);

    // Generate page objects
    const pageObjects: PageObjectFile[] = generatePageObjects
      ? Object.entries(byPage).map(([page, cases]) => this.generatePageObject(page, cases, appUrl))
      : [];

    // Generate the main test file
    const testFile = this.generateTestFile(testCases, byPage, appUrl, generatePageObjects);

    // Generate playwright.config.ts
    const configFile = this.generateConfig(appUrl, browsers, headless);

    // Generate CI workflow
    const ciWorkflow = this.generateCIWorkflow(ciProvider, browsers);

    const output: PlaywrightGenOutput = {
      testFile,
      pageObjects,
      configFile,
      ciWorkflow,
      installCommand: 'npm install @playwright/test && npx playwright install',
      runCommand: `npx playwright test${headless ? '' : ' --headed'} --reporter=html`,
      summary: {
        testCount: testCases.length,
        pageObjects: pageObjects.length,
        browsers,
        estimatedDurationMinutes: Math.ceil(testCases.length * browsers.length * 0.5),
      },
    };

    return {
      success: true,
      output: { playwright: output },
      reasoning: `Generated ${testCases.length} test cases across ${browsers.length} browsers, ${pageObjects.length} Page Object Models, and a ${ciProvider} workflow.`,
      confidence: 0.92,
    };
  }

  // ─── Test File Generator ─────────────────────────────────────────────────

  private generateTestFile(
    cases: TestCaseInput[],
    byPage: Record<string, TestCaseInput[]>,
    appUrl: string,
    usePageObjects: boolean
  ): string {
    const imports = [`import { test, expect } from '@playwright/test';`];
    if (usePageObjects) {
      for (const page of Object.keys(byPage)) {
        imports.push(`import { ${this.toClassName(page)}Page } from '../pages/${this.toClassName(page)}Page';`);
      }
    }

    const describe = Object.entries(byPage).map(([page, pageCases]) => {
      const tests = pageCases.map((tc) => this.generateTestBlock(tc, page, usePageObjects, appUrl));
      return `test.describe('${this.toClassName(page)}', () => {\n${tests.join('\n\n')}\n});`;
    });

    return `${imports.join('\n')}\n\n${describe.join('\n\n')}\n`;
  }

  private generateTestBlock(tc: TestCaseInput, page: string, usePageObjects: boolean, appUrl: string): string {
    const priority = tc.priority ? ` // Priority: ${tc.priority}` : '';
    const tags = tc.tags?.length ? ` @${tc.tags.join(' @')}` : '';

    const setupCode = usePageObjects
      ? `    const po = new ${this.toClassName(page)}Page(page);\n    await po.navigate();`
      : `    await page.goto('${appUrl}');`;

    const stepsCode = tc.steps.map((step, i) => this.stepToPlaywright(step, i, page)).join('\n');

    const assertionCode = tc.expectedResult
      ? `\n    // Verify: ${tc.expectedResult}\n    await expect(page).toHaveURL(/${this.toUrlSlug(tc.expectedResult ?? '').slice(0, 20)}/);\n    await expect(page.locator('text=${tc.expectedResult.slice(0, 60)}').first()).toBeVisible({ timeout: 10000 });`
      : '';

    return `  test('${tc.title}${tags}', async ({ page }) => {${priority}\n${setupCode}\n\n${stepsCode}${assertionCode}\n  });`;
  }

  private stepToPlaywright(step: string, _index: number, _page: string): string {
    const lower = step.toLowerCase();

    if (/^(navigate|go to|open|visit)/i.test(step)) {
      const url = step.replace(/^(navigate|go to|open|visit)\s+/i, '');
      return `    await page.goto('${url.startsWith('http') ? url : 'https://your-app.com'}');`;
    }
    if (/^click/i.test(step)) {
      const target = step.replace(/^click\s+/i, '');
      return `    await page.click('[aria-label="${target}"], text="${target}", button:has-text("${target}")');`;
    }
    if (/^(fill|enter|type|input)/i.test(step)) {
      const match = step.match(/^(?:fill|enter|type|input)\s+"?(.+?)"?\s+(?:in|into|for|on)\s+(.+)/i);
      if (match) {
        return `    await page.fill('[placeholder*="${match[2].trim()}" i], [aria-label="${match[2].trim()}"]', '${match[1].trim()}');`;
      }
      return `    // ${step}`;
    }
    if (/^(submit|save|confirm)/i.test(step)) {
      return `    await page.click('[type="submit"], button:has-text("Submit"), button:has-text("Save")');`;
    }
    if (/^(verify|check|assert|expect|see)/i.test(step)) {
      const assertion = step.replace(/^(verify|check|assert|expect|see)\s+/i, '');
      return `    await expect(page.locator('text=${assertion.slice(0, 60)}').first()).toBeVisible({ timeout: 10000 });`;
    }
    if (/^(wait|wait for)/i.test(step)) {
      return `    await page.waitForTimeout(1000); // ${step}`;
    }
    if (/^(screenshot|capture)/i.test(step)) {
      return `    await page.screenshot({ path: 'screenshots/${_index}.png', fullPage: true });`;
    }
    if (/^login/i.test(step)) {
      return `    await page.fill('[data-testid="email"], #email', 'test@example.com');\n    await page.fill('[data-testid="password"], #password', 'password');\n    await page.click('[type="submit"]');`;
    }
    return `    // ${step}`;
  }

  // ─── Page Object Generator ───────────────────────────────────────────────

  private generatePageObject(pageName: string, cases: TestCaseInput[], appUrl: string): PageObjectFile {
    const className = `${this.toClassName(pageName)}Page`;
    const filePath = `pages/${className}.ts`;

    // Extract unique actions from steps
    const selectors = new Set<string>();
    for (const tc of cases) {
      for (const step of tc.steps) {
        const target = this.extractTarget(step);
        if (target) selectors.add(target);
      }
    }

    const selectorFields = [...selectors].slice(0, 10).map((s) =>
      `  readonly ${this.toCamelCase(s)}Locator = this.page.locator('[aria-label="${s}"], text="${s}"');`
    );

    const methods = [...selectors].slice(0, 10).map((s) => {
      const camel = this.toCamelCase(s);
      return `  async click${this.capitalise(camel)}(): Promise<void> {\n    await this.${camel}Locator.click();\n  }`;
    });

    const code = `import { Page, Locator } from '@playwright/test';

export class ${className} {
  readonly page: Page;
  readonly url = '${appUrl}';

${selectorFields.join('\n')}

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

${methods.join('\n\n')}
}
`;

    return { className, filePath, code };
  }

  // ─── Config Generator ────────────────────────────────────────────────────

  private generateConfig(appUrl: string, browsers: string[], headless: boolean): string {
    const projectBlocks = browsers.map((b) => {
      const browserMap: Record<string, string> = {
        chromium: "{ name: 'chromium' }",
        firefox: "{ name: 'firefox' }",
        webkit: "{ name: 'webkit' }",
        'mobile-chrome': "{ name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } }",
        'mobile-safari': "{ name: 'Mobile Safari', use: { ...devices['iPhone 14'] } }",
      };
      return `    { name: '${b}', use: { browserName: '${b === 'chromium' ? 'chromium' : b === 'firefox' ? 'firefox' : 'webkit'}' } }`;
    });

    return `import { defineConfig, devices } from '@playwright/test';

/**
 * TestMind AI — Generated Playwright Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'results.xml' }],
    ['json', { outputFile: 'results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || '${appUrl}',
    headless: ${headless},
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
${projectBlocks.join(',\n')}
  ],
  outputDir: 'test-results',
});
`;
  }

  // ─── CI Workflow Generator ────────────────────────────────────────────────

  private generateCIWorkflow(ciProvider: string, _browsers: string[]): string {
    if (ciProvider === 'github-actions') {
      return `# TestMind AI — Generated GitHub Actions Workflow
name: Playwright Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests (shard \${{ matrix.shard }}/4)
        run: npx playwright test --shard=\${{ matrix.shard }}/4
        env:
          BASE_URL: \${{ secrets.BASE_URL || 'https://staging.your-app.com' }}
          CI: true

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-\${{ matrix.shard }}
          path: playwright-report/
          retention-days: 30
`;
    }

    if (ciProvider === 'gitlab-ci') {
      return `# TestMind AI — Generated GitLab CI Configuration
stages:
  - test

playwright:
  stage: test
  image: mcr.microsoft.com/playwright:v1.44.0-jammy
  script:
    - npm ci
    - npx playwright test --reporter=junit
  artifacts:
    reports:
      junit: results.xml
    paths:
      - playwright-report/
    expire_in: 1 week
  variables:
    BASE_URL: \${STAGING_URL}
`;
    }

    return `# CI workflow for ${ciProvider} — configure manually`;
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  private groupByPage(cases: TestCaseInput[]): Record<string, TestCaseInput[]> {
    const groups: Record<string, TestCaseInput[]> = {};
    for (const tc of cases) {
      const page = tc.page ?? this.inferPage(tc.title);
      if (!groups[page]) groups[page] = [];
      groups[page].push(tc);
    }
    return groups;
  }

  private inferPage(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('login') || lower.includes('auth') || lower.includes('signin')) return 'Login';
    if (lower.includes('dashboard') || lower.includes('home')) return 'Dashboard';
    if (lower.includes('profile') || lower.includes('account')) return 'Profile';
    if (lower.includes('settings') || lower.includes('configuration')) return 'Settings';
    if (lower.includes('checkout') || lower.includes('payment')) return 'Checkout';
    if (lower.includes('search') || lower.includes('filter')) return 'Search';
    return 'App';
  }

  private extractTarget(step: string): string | null {
    const clickMatch = step.match(/^click\s+(.+)/i);
    if (clickMatch) return clickMatch[1].trim();
    const fillMatch = step.match(/^(?:fill|enter|type)\s+.+\s+(?:in|into|for|on)\s+(.+)/i);
    if (fillMatch) return fillMatch[1].trim();
    return null;
  }

  private toClassName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase());
  }

  private toCamelCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase());
  }

  private capitalise(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private toUrlSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
