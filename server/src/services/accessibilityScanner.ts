import { chromium } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { navigateForScan } from '../utils/playwrightNavigate';

export interface A11yViolation {
  id: string;
  wcag: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: number;
  nodeDetails: { html: string; failureSummary: string }[];
}

export interface A11yScanResult {
  scanId: string;
  url: string;
  timestamp: string;
  passedChecks: number;
  violations: A11yViolation[];
  incomplete: number;
  inapplicable: number;
  score: number; // 0–100
}

const IMPACT_ORDER: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

export async function runAccessibilityScan(url: string, viewport?: { width: number; height: number }): Promise<A11yScanResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: viewport || { width: 1280, height: 800 },
    userAgent: 'QualityForge-A11y-Scanner/1.0',
  });
  const page = await context.newPage();

  try {
    await navigateForScan(page, url);
    // Inject axe-core from CDN (fallback) or use the installed package
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js' });

    const axeResults = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      });
    });

    const violations: A11yViolation[] = (axeResults as any).violations
      .sort((a: any, b: any) => (IMPACT_ORDER[a.impact] ?? 4) - (IMPACT_ORDER[b.impact] ?? 4))
      .map((v: any) => ({
        id: v.id,
        wcag: v.tags.filter((t: string) => t.startsWith('wcag')).join(', ') || 'best-practice',
        impact: v.impact as A11yViolation['impact'],
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
        nodeDetails: v.nodes.slice(0, 3).map((n: any) => ({
          html: n.html?.slice(0, 300) || '',
          failureSummary: n.failureSummary || '',
        })),
      }));

    const passed = (axeResults as any).passes?.length ?? 0;
    const incomplete = (axeResults as any).incomplete?.length ?? 0;
    const inapplicable = (axeResults as any).inapplicable?.length ?? 0;

    // Score: penalise by impact weights
    const penaltyMap = { critical: 15, serious: 8, moderate: 4, minor: 1 };
    const totalPenalty = violations.reduce((sum, v) => sum + (penaltyMap[v.impact] ?? 0) * v.nodes, 0);
    const score = Math.max(0, Math.min(100, 100 - totalPenalty));

    return {
      scanId: uuidv4(),
      url,
      timestamp: new Date().toISOString(),
      passedChecks: passed,
      violations,
      incomplete,
      inapplicable,
      score,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}
