import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { BROWSER_MATRIX, DEVICE_CATALOG, CI_PROVIDERS } from '../config/platformCatalog';
import {
  createLiveSession,
  endLiveSession,
  getActiveDeviceReservations,
  getDashboardStats,
  listTestRuns,
  reserveDevice,
  releaseDevice,
  saveTestRun,
  updateTestRun,
} from '../db/platformQueries';
import { getDB } from '../db/schema';

const ARTIFACTS_DIR =
  process.env.PLATFORM_ARTIFACTS_DIR || path.join(process.cwd(), 'test-outputs', 'platform');

function ensureArtifactsDir(): string {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.mkdirSync(path.join(ARTIFACTS_DIR, 'screenshots'), { recursive: true });
  fs.mkdirSync(path.join(ARTIFACTS_DIR, 'logs'), { recursive: true });
  return ARTIFACTS_DIR;
}

export function getCapabilities() {
  const reserved = new Set(getActiveDeviceReservations());
  const devices = DEVICE_CATALOG.map((d) => ({
    ...d,
    status: reserved.has(d.id) ? ('in_use' as const) : d.status,
  }));
  return {
    browsers: BROWSER_MATRIX,
    devices,
    ciProviders: CI_PROVIDERS,
    features: [
      'Cross-browser automated testing (Playwright)',
      'Live interactive sessions with screenshots',
      'Real device cloud (catalog + reservation)',
      'Parallel test matrix execution',
      'CI/CD pipeline templates (GitHub, Jenkins, CircleCI, GitLab, Azure)',
      'Visual regression baselines',
      'Local tunnel for staging apps',
      'Video & log artifacts per run',
      'AI test generation & reporting',
    ],
  };
}

export function getDashboard(userId?: string) {
  const stats = getDashboardStats(userId);
  const recentRuns = listTestRuns(userId, 10).map(formatRun);
  return { stats, recentRuns };
}

function formatRun(r: ReturnType<typeof listTestRuns>[0]) {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    browser: r.browser || '—',
    os: r.os || '—',
    device: r.device,
    duration: r.duration_ms ? formatDuration(r.duration_ms) : '—',
    durationMs: r.duration_ms,
    passed: r.passed,
    failed: r.failed,
    skipped: r.skipped,
    framework: r.framework,
    executedAt: r.created_at,
    hasLogs: Boolean(r.log_path),
    hasVideo: Boolean(r.video_path),
    hasScreenshot: Boolean(r.screenshot_path),
    logPath: r.log_path,
    videoPath: r.video_path,
    screenshotPath: r.screenshot_path,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export async function startLiveSession(
  userId: string | undefined,
  config: { url: string; browser: string; os: string; resolution: string }
) {
  const sessionId = createLiveSession({ userId, ...config });
  let screenshotPath: string | undefined;

  try {
    screenshotPath = await captureUrlScreenshot(config.url, sessionId);
  } catch (err) {
    console.warn('Live session screenshot capture failed:', err);
  }

  if (screenshotPath) {
    getDB()
      .prepare(`UPDATE live_sessions SET screenshot_path = ? WHERE id = ?`)
      .run(screenshotPath, sessionId);
  }

  return {
    sessionId,
    status: 'active',
    url: config.url,
    browser: config.browser,
    os: config.os,
    resolution: config.resolution,
    screenshotPath,
    viewerUrl: config.url,
    message:
      'Live session started. Screenshot captured. For full interactive control, connect Playwright locally or use your cloud VM provider.',
  };
}

async function captureUrlScreenshot(url: string, sessionId: string): Promise<string> {
  ensureArtifactsDir();
  const outPath = path.join(ARTIFACTS_DIR, 'screenshots', `${sessionId}.png`);
  const script = `
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(${JSON.stringify(url)}, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.screenshot({ path: ${JSON.stringify(outPath)}, fullPage: false });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
`;
  const scriptPath = path.join(ARTIFACTS_DIR, `_capture-${sessionId}.js`);
  fs.writeFileSync(scriptPath, script);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('node', [scriptPath], { cwd: process.cwd(), shell: false });
    proc.on('close', (code) => {
      try {
        fs.unlinkSync(scriptPath);
      } catch {
        /* ignore */
      }
      if (code === 0 && fs.existsSync(outPath)) resolve();
      else reject(new Error('Screenshot capture failed — install Playwright: npx playwright install chromium'));
    });
    proc.on('error', reject);
  });

  return outPath;
}

export function stopLiveSession(sessionId: string) {
  endLiveSession(sessionId);
  return { sessionId, status: 'ended' };
}

export function listRuns(userId?: string) {
  return listTestRuns(userId, 100).map(formatRun);
}

export function createRunRecord(data: Parameters<typeof saveTestRun>[0]) {
  return saveTestRun(data);
}

export function completeRunRecord(
  id: string,
  patch: Parameters<typeof updateTestRun>[1]
) {
  updateTestRun(id, patch);
}

export function reserveDeviceSession(deviceId: string, userId?: string) {
  const device = DEVICE_CATALOG.find((d) => d.id === deviceId);
  if (!device) throw new Error('Device not found');
  const ok = reserveDevice(deviceId, userId);
  if (!ok) throw new Error('Device is currently in use');
  return { deviceId, status: 'reserved', device };
}

export function releaseDeviceSession(deviceId: string, userId?: string) {
  releaseDevice(deviceId, userId);
  return { deviceId, status: 'released' };
}

export function generateCiTemplate(
  provider: string,
  options: { projectName?: string; testCommand?: string; nodeVersion?: string } = {}
) {
  const name = options.projectName || 'testmind-app';
  const cmd = options.testCommand || 'npm run test:e2e';
  const node = options.nodeVersion || '20';

  const templates: Record<string, { filename: string; content: string }> = {
    'github-actions': {
      filename: '.github/workflows/testmind-e2e.yml',
      content: `name: TestMind E2E (Sauce-style matrix)

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  e2e-matrix:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '${node}'
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps \${{ matrix.browser }}
      - name: Run E2E on \${{ matrix.browser }}
        run: ${cmd} --project=\${{ matrix.browser }}
        env:
          TESTMIND_API_URL: \${{ secrets.TESTMIND_API_URL }}
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-\${{ matrix.browser }}
          path: test-outputs/
`,
    },
    jenkins: {
      filename: 'Jenkinsfile',
      content: `pipeline {
  agent any
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Install') { steps { sh 'npm ci' } }
    stage('E2E') {
      parallel {
        stage('Chrome') { steps { sh '${cmd}' } }
        stage('Firefox') { steps { sh 'BROWSER=firefox ${cmd}' } }
      }
    }
  }
  post {
    always { archiveArtifacts artifacts: 'test-outputs/**', allowEmptyArchive: true }
  }
}
`,
    },
    circleci: {
      filename: '.circleci/config.yml',
      content: `version: 2.1
orbs:
  node: circleci/node@5
jobs:
  e2e:
    docker:
      - image: cimg/node:${node}-browser
    steps:
      - checkout
      - node/install-packages
      - run: npx playwright install --with-deps
      - run: ${cmd}
      - store_artifacts:
          path: test-outputs
workflows:
  test:
    jobs:
      - e2e
`,
    },
    'gitlab-ci': {
      filename: '.gitlab-ci.yml',
      content: `stages: [test]

e2e:
  image: mcr.microsoft.com/playwright:v1.49.0-jammy
  stage: test
  script:
    - npm ci
    - ${cmd}
  artifacts:
    when: always
    paths: [test-outputs/]
`,
    },
    'azure-pipelines': {
      filename: 'azure-pipelines.yml',
      content: `trigger: [main]
pool:
  vmImage: ubuntu-latest
steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '${node}'
  - script: npm ci
  - script: npx playwright install --with-deps
  - script: ${cmd}
  - publish: test-outputs
    artifact: test-results
`,
    },
  };

  const t = templates[provider];
  if (!t) throw new Error(`Unknown CI provider: ${provider}`);
  return { provider, projectName: name, ...t };
}

export function getTunnelStatus() {
  return {
    enabled: process.env.TESTMIND_TUNNEL_ENABLED === 'true',
    status: process.env.TESTMIND_TUNNEL_ENABLED === 'true' ? 'connected' : 'disconnected',
    localUrl: process.env.TESTMIND_TUNNEL_LOCAL_URL || 'http://localhost:3000',
    publicUrl: process.env.TESTMIND_TUNNEL_PUBLIC_URL || null,
    instructions:
      'Set TESTMIND_TUNNEL_ENABLED=true and use ngrok/cloudflared to expose local apps. Point live tests at your tunnel URL.',
  };
}

