import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { navigateForScan } from '../utils/playwrightNavigate';

export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export interface SecurityFinding {
  id: string;
  title: string;
  severity: FindingSeverity;
  category: string;
  url?: string;
  description: string;
  evidence?: string;
  remediation: string;
  cvss?: number;
  cwe?: string;
  compliance: string[]; // e.g. ['OWASP A03', 'SOC2 CC6']
}

export interface SecurityScanResult {
  scanId: string;
  targetUrl: string;
  timestamp: string;
  scanType: 'dast' | 'sca' | 'full';
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    totalChecks: number;
    riskScore: number; // 0–100
  };
  headerAnalysis: { header: string; present: boolean; value?: string; recommendation: string }[];
  scaResults?: { package: string; version: string; severity: string; advisory: string; fixedIn?: string }[];
  passed: boolean;
}

const SECURITY_HEADERS = [
  { header: 'Content-Security-Policy', recommendation: 'Add CSP to prevent XSS and data injection attacks.' },
  { header: 'Strict-Transport-Security', recommendation: 'Add HSTS with max-age >= 31536000 to enforce HTTPS.' },
  { header: 'X-Content-Type-Options', recommendation: 'Set to "nosniff" to prevent MIME sniffing.' },
  { header: 'X-Frame-Options', recommendation: 'Set to DENY or SAMEORIGIN to prevent clickjacking.' },
  { header: 'Referrer-Policy', recommendation: 'Set to "strict-origin-when-cross-origin" to limit referrer leakage.' },
  { header: 'Permissions-Policy', recommendation: 'Restrict browser feature access (camera, mic, geolocation).' },
  { header: 'X-XSS-Protection', recommendation: 'Set to "1; mode=block" (legacy browsers).' },
  { header: 'Cross-Origin-Opener-Policy', recommendation: 'Set to "same-origin" to isolate browsing context.' },
];

const XSS_PAYLOADS = [
  '<script>alert("qf-xss")</script>',
  '"><script>alert(1)</script>',
  "';alert(1)//",
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
];

const SQLI_PAYLOADS = [
  "' OR '1'='1",
  "1; DROP TABLE users--",
  "1' AND 1=1--",
  "admin'--",
];

export async function runSecurityScan(targetUrl: string, scanType: 'dast' | 'sca' | 'full' = 'full'): Promise<SecurityScanResult> {
  const scanId = uuidv4();
  const findings: SecurityFinding[] = [];
  let headerAnalysis: SecurityScanResult['headerAnalysis'] = [];
  let scaResults: SecurityScanResult['scaResults'] = [];
  let totalChecks = 0;

  // ── DAST Checks ─────────────────────────────────────────────────────────────
  if (scanType === 'dast' || scanType === 'full') {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: 'QualityForge-SecurityScanner/1.0 (staging-only)',
    });
    const page = await context.newPage();

    // Capture responses for header analysis
    const capturedHeaders: Record<string, string> = {};
    page.on('response', (res) => {
      if (res.url() === targetUrl || res.url().startsWith(targetUrl)) {
        for (const [k, v] of Object.entries(res.headers())) {
          capturedHeaders[k.toLowerCase()] = v;
        }
      }
    });

    try {
      await navigateForScan(page, targetUrl, 30000);

      // 1. Security Header Analysis
      totalChecks += SECURITY_HEADERS.length;
      headerAnalysis = SECURITY_HEADERS.map(({ header, recommendation }) => {
        const key = header.toLowerCase();
        const present = key in capturedHeaders;
        return { header, present, value: capturedHeaders[key], recommendation };
      });

      const missingCritical = headerAnalysis.filter(h => !h.present && ['Strict-Transport-Security', 'Content-Security-Policy', 'X-Content-Type-Options'].includes(h.header));
      for (const h of missingCritical) {
        findings.push({
          id: uuidv4(),
          title: `Missing Security Header: ${h.header}`,
          severity: h.header === 'Content-Security-Policy' ? 'High' : 'Medium',
          category: 'Security Headers',
          url: targetUrl,
          description: `The ${h.header} header is not set.`,
          remediation: h.recommendation,
          compliance: ['OWASP A05:2021', 'SOC2 CC6.1'],
          cwe: 'CWE-693',
        });
      }

      // 2. Mixed Content / HTTP check
      totalChecks++;
      if (targetUrl.startsWith('http://')) {
        findings.push({
          id: uuidv4(),
          title: 'Unencrypted HTTP Connection',
          severity: 'High',
          category: 'Transport Security',
          url: targetUrl,
          description: 'The target is served over HTTP, not HTTPS. All data is transmitted in plaintext.',
          remediation: 'Enable HTTPS and redirect all HTTP traffic to HTTPS.',
          compliance: ['OWASP A02:2021', 'PCI DSS 4.2', 'SOC2 CC6.7'],
          cvss: 7.5,
          cwe: 'CWE-319',
        });
      }

      // 3. XSS Input Probing (passive – inject into URL params / visible inputs)
      totalChecks++;
      const inputs = await page.$$('input:not([type=hidden]):not([type=submit])');
      if (inputs.length > 0) {
        // Try first input with a payload
        try {
          await inputs[0].fill(XSS_PAYLOADS[0]);
          const pageContent = await page.content();
          if (pageContent.includes(XSS_PAYLOADS[0])) {
            findings.push({
              id: uuidv4(),
              title: 'Reflected XSS – Unescaped Input',
              severity: 'Critical',
              category: 'Injection',
              url: targetUrl,
              description: 'User-supplied input is reflected in the page without encoding, enabling Cross-Site Scripting.',
              evidence: `Payload "${XSS_PAYLOADS[0]}" was reflected unescaped.`,
              remediation: 'Escape all user input before rendering. Use Content-Security-Policy.',
              compliance: ['OWASP A03:2021', 'CWE-79'],
              cvss: 9.0,
              cwe: 'CWE-79',
            });
          }
        } catch { /* input interaction failed – skip */ }
      }

      // 4. Open redirect probing (check for ?redirect= / ?url= / ?next= params)
      totalChecks++;
      const currentUrl = page.url();
      const urlParams = new URL(currentUrl).searchParams;
      const redirectParams = ['redirect', 'url', 'next', 'return', 'goto'];
      for (const p of redirectParams) {
        if (urlParams.has(p)) {
          findings.push({
            id: uuidv4(),
            title: `Potential Open Redirect via ?${p}= parameter`,
            severity: 'Medium',
            category: 'Open Redirect',
            url: currentUrl,
            description: `The application accepts a "${p}" query parameter that may allow open redirect attacks.`,
            remediation: 'Validate redirect targets against an allowlist of trusted URLs.',
            compliance: ['OWASP A01:2021'],
            cwe: 'CWE-601',
          });
          break;
        }
      }

      // 5. Cookie Security Check
      totalChecks++;
      const cookies = await context.cookies([targetUrl]);
      for (const cookie of cookies) {
        if (!cookie.httpOnly) {
          findings.push({
            id: uuidv4(),
            title: `Cookie "${cookie.name}" Missing HttpOnly Flag`,
            severity: 'Medium',
            category: 'Cookie Security',
            url: targetUrl,
            description: `Cookie "${cookie.name}" does not have the HttpOnly flag, making it accessible to JavaScript.`,
            evidence: `Set-Cookie: ${cookie.name}=...`,
            remediation: 'Set the HttpOnly attribute on all session cookies.',
            compliance: ['OWASP A02:2021', 'PCI DSS 6.4'],
            cwe: 'CWE-1004',
          });
        }
        if (!cookie.secure && targetUrl.startsWith('https')) {
          findings.push({
            id: uuidv4(),
            title: `Cookie "${cookie.name}" Missing Secure Flag`,
            severity: 'Low',
            category: 'Cookie Security',
            url: targetUrl,
            description: `Cookie "${cookie.name}" is missing the Secure flag and may be sent over HTTP.`,
            remediation: 'Set the Secure attribute on all cookies.',
            compliance: ['OWASP A02:2021'],
            cwe: 'CWE-614',
          });
        }
      }
    } finally {
      await context.close();
      await browser.close();
    }
  }

  // ── SCA via retire.js ───────────────────────────────────────────────────────
  if (scanType === 'sca' || scanType === 'full') {
    try {
      scaResults = await runRetireScan();
      totalChecks += scaResults.length;
      for (const dep of scaResults) {
        if (dep.severity === 'high' || dep.severity === 'critical') {
          findings.push({
            id: uuidv4(),
            title: `Vulnerable Dependency: ${dep.package}@${dep.version}`,
            severity: dep.severity === 'critical' ? 'Critical' : 'High',
            category: 'Dependency Vulnerability',
            description: dep.advisory,
            remediation: dep.fixedIn ? `Upgrade to ${dep.package}@${dep.fixedIn}` : 'Remove or replace this package.',
            compliance: ['OWASP A06:2021'],
            cwe: 'CWE-937',
          });
        }
      }
    } catch { /* retire not available or no package.json */ }
  }

  // ── Compute Summary ──────────────────────────────────────────────────────────
  const countBy = (sev: FindingSeverity) => findings.filter(f => f.severity === sev).length;
  const critical = countBy('Critical');
  const high = countBy('High');
  const medium = countBy('Medium');
  const low = countBy('Low');
  const info = countBy('Info');

  // Risk score: weighted sum capped at 100
  const riskScore = Math.min(100, critical * 25 + high * 10 + medium * 5 + low * 1);

  return {
    scanId,
    targetUrl,
    timestamp: new Date().toISOString(),
    scanType,
    findings,
    summary: { critical, high, medium, low, info, totalChecks, riskScore },
    headerAnalysis,
    scaResults,
    passed: critical === 0 && high === 0,
  };
}

async function runRetireScan(): Promise<{ package: string; version: string; severity: string; advisory: string; fixedIn?: string }[]> {
  type ScaEntry = { package: string; version: string; severity: string; advisory: string; fixedIn?: string };
  return new Promise((resolve) => {
    const results: ScaEntry[] = [];
    const proc = spawn('npx', ['retire', '--outputformat', 'json', '--outputpath', '/dev/stdout', '--path', process.cwd()], {
      shell: true,
      cwd: process.cwd(),
    });

    let stdout = '';
    proc.stdout?.on('data', (d: Buffer) => (stdout += d.toString()));
    proc.on('close', () => {
      try {
        const json = JSON.parse(stdout);
        const data = Array.isArray(json) ? json : json.data || [];
        for (const entry of data) {
          for (const result of entry.results || []) {
            for (const vuln of result.vulnerabilities || []) {
              results.push({
                package: result.component || entry.file,
                version: result.version || '?',
                severity: vuln.severity || 'medium',
                advisory: Array.isArray(vuln.info) ? vuln.info[0] : String(vuln.info),
                fixedIn: vuln.below,
              });
            }
          }
        }
      } catch { /* not parseable */ }
      resolve(results);
    });
    proc.on('error', () => resolve([]));
  });
}
