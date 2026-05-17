import { TestCase } from '../types';

export function getScriptPrompt(testCases: TestCase[], framework: string, appContext: string): string {
  const testCasesJson = JSON.stringify(testCases, null, 2);

  const playwrightRules = `
FOR PLAYWRIGHT (E2E Web):
1. Import { test, expect, Page, Browser } from '@playwright/test'
2. Use Page Object Model pattern — create a class for each page
3. Use data-testid attributes as primary locators, fall back to role/label/text
4. Add test.beforeAll for browser launch, test.afterAll for cleanup
5. Add test.beforeEach for navigation/login, test.afterEach for screenshot on failure
6. Use await expect(locator).toBeVisible() style assertions
7. Add await page.waitForLoadState('networkidle') after navigation
8. Wrap each test in try/catch — on error, call await page.screenshot({ path: 'failure.png' })
9. Add test.use({ retries: 2 }) at describe level
10. Include playwright.config.ts content as a comment block at top`;

  const appiumRules = `
FOR APPIUM + WEBDRIVERIO (Mobile):
1. Import from '@wdio/globals' and 'webdriverio'
2. Define capabilities object with platform, deviceName, app path
3. Use $('~accessibilityId') or $('id:resourceId') locators
4. Add swipe/scroll helpers using driver.touchAction()
5. Add driver.pause() with comments explaining why each wait is needed
6. Use expect(element).toBeDisplayed() assertions
7. Handle both iOS and Android with driver.isIOS conditionals where needed
8. Include wdio.conf.ts content as comment block`;

  const apiRules = `
FOR AXIOS + JEST (API):
1. Create an apiClient with axios.create({ baseURL, headers })
2. Use beforeAll to handle authentication — store token
3. Test: status code, response schema (check required fields exist and have correct types), response time (< 2000ms), error cases (4xx, 5xx)
4. Use expect(response.status).toBe(200) style
5. Include negative test cases
6. Add afterAll to clean up created test data`;

  let frameworkRules = '';
  if (framework.toLowerCase().includes('playwright')) {
    frameworkRules = playwrightRules;
  } else if (framework.toLowerCase().includes('appium') || framework.toLowerCase().includes('wdio')) {
    frameworkRules = appiumRules;
  } else {
    frameworkRules = apiRules;
  }

  return `Generate a COMPLETE, RUNNABLE automation script for the following test cases.

Framework: ${framework}
App Context: ${appContext}

Test Cases:
${testCasesJson}

${frameworkRules}

Requirements:
- Full imports and configuration/setup
- Each test case implemented as a test
- Detailed JSDoc comments above each function
- Inline explanations as code comments (WHAT and WHY)
- Error handling with try/catch
- Screenshot capture on failure
- Meaningful assertions with descriptive failure messages

Return ONLY valid JSON (no markdown) with this schema:
{
  "code": "string (complete script code)",
  "framework": "string",
  "runCommand": "string (command to run the script)",
  "explanation": [
    { "section": "string", "description": "string", "lineRange": "string" }
  ],
  "dependencies": ["string"]
}`;
}
