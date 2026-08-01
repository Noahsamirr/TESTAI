/**
 * @package @testmind/ai-agents
 * @description Natural Language Test Generator — converts plain English test scenarios
 * into executable Playwright / Gherkin / Appium / k6 test code.
 *
 * Users write scenarios like:
 *   "Login as Admin, open the Dashboard, create a new Customer, verify they appear in the list"
 *
 * The NLTestGenerator parses intent, identifies actions and targets, generates
 * structured steps, and emits executable code in the requested format.
 */

import { BaseAgent } from '../BaseAgent';
import type { AgentTask, AgentResult, AgentCapabilityType, NLTestInput, NLTestOutput } from '../types';

// ─── Parser Types ─────────────────────────────────────────────────────────────

interface ParsedStep {
  index: number;
  action: string;
  target?: string;
  value?: string;
  assertion?: string;
  raw: string;
}

type OutputFormat = 'playwright' | 'appium' | 'webdriverio' | 'gherkin' | 'jest' | 'pytest' | 'k6';

export class NLTestGenerator extends BaseAgent {
  readonly id = 'nl-test-generator';
  readonly name = 'Natural Language Test Generator';
  readonly description =
    'Converts plain English test scenarios into executable test code (Playwright, Gherkin, Appium, k6, etc.).';
  readonly capabilities: AgentCapabilityType[] = ['nl_test_generation', 'bdd_generation', 'playwright_generation'];

  protected validate(task: AgentTask): string | null {
    const nl = task.input['naturalLanguage'] as string;
    if (!nl?.trim()) return "Field 'naturalLanguage' is required.";
    return null;
  }

  protected async doExecute(
    task: AgentTask
  ): Promise<Omit<AgentResult, 'taskId' | 'agentId' | 'agentName' | 'durationMs' | 'completedAt'>> {
    const input = task.input as unknown as NLTestInput;
    const format: OutputFormat = (input.outputFormat as OutputFormat) ?? 'playwright';

    const parsedSteps = this.parseNaturalLanguage(input.naturalLanguage);
    const gherkin = this.toGherkin(parsedSteps, input.appContext?.url);
    const { code, dependencies } = this.generateCode(parsedSteps, format, input);

    const output: NLTestOutput = {
      parsedSteps: parsedSteps.map(({ raw: _raw, ...rest }) => rest),
      gherkin,
      code,
      framework: format,
      dependencies,
      pageObjects: this.suggestPageObjects(parsedSteps, input.appContext?.url),
    };

    return {
      success: true,
      output: { nlTest: output },
      reasoning: `Parsed ${parsedSteps.length} steps from natural language, identified ${parsedSteps.filter((s) => s.assertion).length} assertions, and generated ${format} code.`,
      confidence: 0.85,
    };
  }

  // ─── Natural Language Parser ───────────────────────────────────────────────

  private parseNaturalLanguage(text: string): ParsedStep[] {
    // Split on common delimiters: commas, periods, "then", "and", newlines
    const rawSteps = text
      .split(/[,\n]|\bthen\b|\band\b/i)
      .map((s) => s.trim())
      .filter(Boolean);

    return rawSteps.map((raw, idx) => this.parseStep(raw, idx + 1));
  }

  private parseStep(raw: string, index: number): ParsedStep {
    const lower = raw.toLowerCase();

    // Navigation patterns
    if (/^(go to|navigate to|open|visit|load)\s+/i.test(raw)) {
      const target = raw.replace(/^(go to|navigate to|open|visit|load)\s+/i, '').trim();
      return { index, action: 'navigate', target, raw };
    }

    // Login patterns
    if (/^(login|log in|sign in)\s*(as|with)?\s*/i.test(raw)) {
      const valueMatch = raw.match(/(?:as|with)?\s*(.+)/i);
      return { index, action: 'login', value: valueMatch?.[1]?.trim(), raw };
    }

    // Click patterns
    if (/^(click|press|tap|select|choose)\s+/i.test(raw)) {
      const target = raw.replace(/^(click|press|tap|select|choose)\s+/i, '').trim();
      return { index, action: 'click', target, raw };
    }

    // Fill/type patterns
    if (/^(fill|type|enter|input|set)\s+/i.test(raw)) {
      const match = raw.match(/^(?:fill|type|enter|input|set)\s+["']?(.+?)["']?\s+(?:in|into|for)\s+(.+)/i);
      if (match) return { index, action: 'fill', value: match[1].trim(), target: match[2].trim(), raw };
      return { index, action: 'fill', value: raw.replace(/^(?:fill|type|enter|input|set)\s+/i, '').trim(), raw };
    }

    // Submit / form actions
    if (/^(submit|save|confirm|approve|publish|deploy)\s*/i.test(raw)) {
      const target = raw.replace(/^(submit|save|confirm|approve|publish|deploy)\s*/i, '').trim();
      return { index, action: 'submit', target: target || 'form', raw };
    }

    // Verification/assertion patterns
    if (/^(verify|check|assert|ensure|validate|confirm that|see|expect)\s+/i.test(raw)) {
      const assertion = raw.replace(/^(verify|check|assert|ensure|validate|confirm that|see|expect)\s+/i, '').trim();
      return { index, action: 'assert', assertion, raw };
    }

    // Wait patterns
    if (/^(wait\s+for|wait\s+until)\s+/i.test(raw)) {
      const target = raw.replace(/^(wait\s+for|wait\s+until)\s+/i, '').trim();
      return { index, action: 'wait', target, raw };
    }

    // Logout patterns
    if (/^(logout|log out|sign out)/i.test(raw)) {
      return { index, action: 'logout', raw };
    }

    // Upload patterns
    if (/^(upload|attach)\s+/i.test(raw)) {
      const target = raw.replace(/^(upload|attach)\s+/i, '').trim();
      return { index, action: 'upload', target, raw };
    }

    // Create patterns
    if (/^(create|add|new)\s+/i.test(raw)) {
      const target = raw.replace(/^(create|add|new)\s+/i, '').trim();
      return { index, action: 'create', target, raw };
    }

    // Delete patterns
    if (/^(delete|remove)\s+/i.test(raw)) {
      const target = raw.replace(/^(delete|remove)\s+/i, '').trim();
      return { index, action: 'delete', target, raw };
    }

    // Screenshot
    if (/^(screenshot|capture|snapshot)/i.test(raw)) {
      return { index, action: 'screenshot', raw };
    }

    // Default: treat as an action
    return { index, action: 'action', target: raw, raw };
  }

  // ─── Gherkin Generator ────────────────────────────────────────────────────

  private toGherkin(steps: ParsedStep[], url?: string): string {
    const lines: string[] = ['Feature: Automated Test Scenario', ''];
    lines.push('  Scenario: User journey', '');
    if (url) lines.push(`    Given the application is available at "${url}"`);

    for (const step of steps) {
      lines.push(`    ${this.stepToGherkin(step, steps.indexOf(step) === 0)}`);
    }
    return lines.join('\n');
  }

  private stepToGherkin(step: ParsedStep, isFirst: boolean): string {
    const prefix = isFirst ? 'Given' : step.action === 'assert' ? 'Then' : 'When';
    switch (step.action) {
      case 'navigate': return `${prefix} I navigate to ${step.target}`;
      case 'login': return `${prefix} I log in${step.value ? ` as "${step.value}"` : ''}`;
      case 'click': return `${prefix} I click on ${step.target}`;
      case 'fill': return `${prefix} I enter "${step.value}" in the ${step.target} field`;
      case 'submit': return `${prefix} I submit the ${step.target}`;
      case 'assert': return `Then ${step.assertion}`;
      case 'wait': return `${prefix} I wait for ${step.target}`;
      case 'logout': return `${prefix} I log out`;
      case 'upload': return `${prefix} I upload ${step.target}`;
      case 'create': return `${prefix} I create a new ${step.target}`;
      case 'delete': return `${prefix} I delete ${step.target}`;
      case 'screenshot': return `${prefix} I take a screenshot`;
      default: return `${prefix} ${step.raw}`;
    }
  }

  // ─── Code Generator ───────────────────────────────────────────────────────

  private generateCode(steps: ParsedStep[], format: OutputFormat, input: NLTestInput): { code: string; dependencies: string[] } {
    switch (format) {
      case 'playwright': return this.generatePlaywright(steps, input);
      case 'gherkin': return { code: this.toGherkin(steps, input.appContext?.url), dependencies: ['@cucumber/cucumber'] };
      case 'jest': return this.generateJest(steps, input);
      case 'pytest': return this.generatePytest(steps, input);
      case 'k6': return this.generateK6(steps, input);
      case 'appium': return this.generateAppium(steps, input);
      default: return this.generatePlaywright(steps, input);
    }
  }

  private generatePlaywright(steps: ParsedStep[], input: NLTestInput): { code: string; dependencies: string[] } {
    const url = input.appContext?.url ?? 'https://your-app.com';
    const stepsCode = steps
      .map((s) => `  // Step ${s.index}: ${s.raw}\n  ${this.stepToPlaywright(s)}`)
      .join('\n\n');

    const code = `import { test, expect } from '@playwright/test';

/**
 * Auto-generated by TestMind AI — Natural Language Test Generator
 * Source: "${(input.naturalLanguage ?? '').slice(0, 100)}"
 */
test.describe('AI-Generated Test Suite', () => {
  test('User journey test', async ({ page }) => {
    // Navigate to application
    await page.goto('${url}');

${stepsCode}
  });
});
`;
    return { code, dependencies: ['@playwright/test'] };
  }

  private stepToPlaywright(step: ParsedStep): string {
    switch (step.action) {
      case 'navigate':
        return `await page.goto('${step.target ?? '/'}');`;
      case 'login':
        return `// Login as ${step.value ?? 'user'}\nawait page.fill('[data-testid="email"], [placeholder*="email" i], #email', 'admin@example.com');\nawait page.fill('[data-testid="password"], [placeholder*="password" i], #password', 'password');\nawait page.click('[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');`;
      case 'click':
        return `await page.click('[aria-label="${step.target}"], text="${step.target}", button:has-text("${step.target}")');`;
      case 'fill':
        return `await page.fill('[placeholder*="${step.target}" i], [aria-label="${step.target}"], #${this.toId(step.target ?? '')}', '${step.value ?? ''}');`;
      case 'submit':
        return `await page.click('[type="submit"], button:has-text("Submit"), button:has-text("Save"), button:has-text("Confirm")');`;
      case 'assert':
        return `await expect(page.locator('text=${step.assertion?.slice(0, 60) ?? ''}')).toBeVisible();\nawait expect(page).toHaveURL(/${this.toSlug(step.assertion ?? '')}/);`;
      case 'wait':
        return `await page.waitForSelector('text=${step.target ?? ''}', { timeout: 10000 });`;
      case 'logout':
        return `await page.click('[aria-label="Logout"], [aria-label="Sign out"], button:has-text("Logout"), button:has-text("Sign out")');`;
      case 'upload':
        return `await page.setInputFiles('input[type="file"]', './${step.target ?? 'test-file.txt'}');`;
      case 'create':
        return `await page.click('button:has-text("Create"), button:has-text("New"), button:has-text("Add")');`;
      case 'delete':
        return `await page.click('button:has-text("Delete"), button:has-text("Remove")');`;
      case 'screenshot':
        return `await page.screenshot({ path: 'screenshots/step-${step.index}.png', fullPage: true });`;
      default:
        return `// TODO: Implement step: ${step.raw}`;
    }
  }

  private generateJest(steps: ParsedStep[], input: NLTestInput): { code: string; dependencies: string[] } {
    const url = input.appContext?.url ?? 'https://your-app.com';
    const stepsCode = steps
      .map((s) => `    // ${s.raw}\n    ${this.stepToPlaywright(s)}`)
      .join('\n\n');

    const code = `const { chromium } = require('playwright');

describe('AI-Generated Test Suite', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('User journey', async () => {
    await page.goto('${url}');

${stepsCode}
  });
});
`;
    return { code, dependencies: ['playwright', 'jest'] };
  }

  private generatePytest(steps: ParsedStep[], input: NLTestInput): { code: string; dependencies: string[] } {
    const url = input.appContext?.url ?? 'https://your-app.com';
    const stepsCode = steps
      .map((s) => `    # ${s.raw}\n    ${this.stepToPython(s)}`)
      .join('\n\n');

    const code = `import pytest
from playwright.sync_api import Page, expect

"""
Auto-generated by TestMind AI — Natural Language Test Generator
"""

def test_user_journey(page: Page):
    """${input.naturalLanguage?.slice(0, 100) ?? 'User journey test'}"""
    page.goto("${url}")

${stepsCode}
`;
    return { code, dependencies: ['pytest', 'playwright', 'pytest-playwright'] };
  }

  private stepToPython(step: ParsedStep): string {
    switch (step.action) {
      case 'navigate': return `page.goto("${step.target ?? '/'}")`;
      case 'click': return `page.click('[aria-label="${step.target}"]')`;
      case 'fill': return `page.fill('[placeholder*="${step.target}"]', "${step.value ?? ''}")`;
      case 'assert': return `expect(page.locator('text=${step.assertion ?? ''}')).to_be_visible()`;
      case 'logout': return `page.click('button:has-text("Logout")')`;
      case 'screenshot': return `page.screenshot(path="screenshots/step_${step.index}.png")`;
      default: return `# TODO: ${step.raw}`;
    }
  }

  private generateK6(steps: ParsedStep[], input: NLTestInput): { code: string; dependencies: string[] } {
    const url = input.appContext?.url ?? 'https://your-app.com';
    const code = `import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Auto-generated by TestMind AI — k6 Load Test
 */
export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const res = http.get('${url}');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  sleep(1);
}
`;
    return { code, dependencies: ['k6'] };
  }

  private generateAppium(steps: ParsedStep[], input: NLTestInput): { code: string; dependencies: string[] } {
    const stepsCode = steps
      .map((s) => `    // ${s.raw}\n    ${this.stepToAppium(s)}`)
      .join('\n\n');

    const code = `const wdio = require('@wdio/globals');

describe('Mobile Test Suite', () => {
  it('User journey', async () => {
${stepsCode}
  });
});
`;
    return { code, dependencies: ['@wdio/cli', 'appium', 'appium-uiautomator2-driver'] };
  }

  private stepToAppium(step: ParsedStep): string {
    switch (step.action) {
      case 'click': return `await $('~${step.target}').click();`;
      case 'fill': return `await $('~${step.target}').setValue('${step.value ?? ''}');`;
      case 'assert': return `expect(await $('~${step.assertion?.slice(0, 40) ?? ''}').isDisplayed()).toBe(true);`;
      default: return `// TODO: ${step.raw}`;
    }
  }

  // ─── Page Object Suggestions ──────────────────────────────────────────────

  private suggestPageObjects(steps: ParsedStep[], _url?: string): Array<{ name: string; selectors: Record<string, string> }> {
    const pages: Record<string, Record<string, string>> = {};

    for (const step of steps) {
      if (step.action === 'navigate' && step.target) {
        const pageName = this.toPageName(step.target);
        if (!pages[pageName]) pages[pageName] = {};
      }
      if ((step.action === 'click' || step.action === 'fill') && step.target) {
        const pageName = pages['Main'] ? 'Main' : 'Page';
        if (!pages[pageName]) pages[pageName] = {};
        pages[pageName][this.toCamelCase(step.target)] = `[aria-label="${step.target}"]`;
      }
    }

    if (!Object.keys(pages).length) {
      pages['MainPage'] = { loginButton: 'button:has-text("Log in")', submitButton: 'button[type="submit"]' };
    }

    return Object.entries(pages).map(([name, selectors]) => ({ name, selectors }));
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  private toId(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private toSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);
  }

  private toCamelCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase());
  }

  private toPageName(url: string): string {
    const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/\//g, ' ').trim() || 'Home';
    return path.split(' ').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Page';
  }
}
