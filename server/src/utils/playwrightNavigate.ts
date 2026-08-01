import type { Page } from 'playwright';

/** Navigate reliably for scanning — avoids networkidle timeouts on SPAs. */
export async function navigateForScan(page: Page, url: string, timeoutMs = 45000): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(1500);
  } catch (err) {
    // Some sites never fire domcontentloaded cleanly — try a lighter wait
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: timeoutMs });
      await page.waitForTimeout(2000);
    } catch {
      throw err;
    }
  }
}
