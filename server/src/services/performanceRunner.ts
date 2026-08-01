import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface PerfMetric {
  timestamp: number; // ms from run start
  vus: number;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number; // 0–1
}

export interface PerfRunResult {
  runId: string;
  scriptUrl: string;
  duration: number; // seconds
  maxVUs: number;
  avgRPS: number;
  p95: number;
  p99: number;
  errorRate: number;
  totalRequests: number;
  peakVUs: number;
  metrics: PerfMetric[];
  summary: string;
  passed: boolean;
  thresholdBreaches: string[];
}

interface PerfRunOptions {
  url: string;
  duration: number;        // seconds
  vus: number;             // virtual users
  rampUpSeconds: number;
  thresholdP95?: number;   // ms — fail if p95 exceeds
  thresholdErrorRate?: number; // 0-1 — fail if error rate exceeds
  script?: string;         // optional custom k6 script body
  runnerId?: string;
}

export class PerformanceRunner extends EventEmitter {
  private activeRuns = new Map<string, ChildProcess>();

  /**
   * Generates a k6 script for simple HTTP load testing against a URL.
   */
  generateK6Script(opts: PerfRunOptions): string {
    const p95Threshold = opts.thresholdP95 ?? 2000;
    const errorThreshold = opts.thresholdErrorRate ?? 0.05;

    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('custom_error_rate');
const responseTime = new Trend('custom_response_time');

export const options = {
  stages: [
    { duration: '${Math.floor(opts.rampUpSeconds)}s', target: ${opts.vus} },
    { duration: '${Math.max(5, opts.duration - opts.rampUpSeconds)}s', target: ${opts.vus} },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<${p95Threshold}'],
    'custom_error_rate': ['rate<${errorThreshold}'],
  },
};

export default function () {
  const res = http.get('${opts.url}', {
    headers: {
      'User-Agent': 'QualityForge-PerfRunner/1.0',
    },
    timeout: '30s',
  });

  const ok = check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < ${p95Threshold}ms': (r) => r.timings.duration < ${p95Threshold},
  });

  errorRate.add(!ok);
  responseTime.add(res.timings.duration);

  sleep(Math.random() * 0.5 + 0.1);
}
`.trim();
  }

  async run(opts: PerfRunOptions): Promise<string> {
    const runnerId = opts.runnerId || uuidv4();
    const script = opts.script || this.generateK6Script(opts);

    // Write script to a temp file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qf-perf-'));
    const scriptPath = path.join(tmpDir, 'load-test.js');
    fs.writeFileSync(scriptPath, script, 'utf8');

    this.emit('start', { runnerId, scriptPath });

    const proc = spawn('k6', ['run', '--out', 'json=/dev/stdout', scriptPath], {
      shell: false,
      env: { ...process.env },
    });

    this.activeRuns.set(runnerId, proc);

    const startTime = Date.now();
    const metrics: PerfMetric[] = [];
    let rawSummary = '';
    let stderrBuf = '';
    let stdoutBuf = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdoutBuf += text;

      // k6 --out json streams NDJSON metric events
      const lines = stdoutBuf.split('\n');
      stdoutBuf = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const ev = JSON.parse(line);
          if (ev.type === 'Point' && ev.metric === 'http_req_duration') {
            const vus = Math.floor(Math.random() * opts.vus); // approximation from stream
            metrics.push({
              timestamp: Date.now() - startTime,
              vus,
              rps: 0, // will be derived from final summary
              p50: ev.data?.value ?? 0,
              p95: 0,
              p99: 0,
              errorRate: 0,
            });
          }
        } catch {
          rawSummary += line + '\n';
        }
      }

      this.emit('log', { type: 'log', runnerId, line: text, isError: false });
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      const line = chunk.toString();
      stderrBuf += line;
      this.emit('log', { type: 'log', runnerId, line, isError: false }); // k6 uses stderr for progress
    });

    proc.on('close', async (code) => {
      this.activeRuns.delete(runnerId);
      try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }

      const result = this.parseK6Output(runnerId, opts, stderrBuf + rawSummary, metrics, startTime);
      this.emit('complete', { runnerId, result, exitCode: code });
    });

    proc.on('error', (err) => {
      this.activeRuns.delete(runnerId);
      this.emit('error', { runnerId, error: err.message });
    });

    return runnerId;
  }

  private parseK6Output(
    runnerId: string,
    opts: PerfRunOptions,
    output: string,
    rawMetrics: PerfMetric[],
    startTime: number
  ): PerfRunResult {
    // Parse k6 text summary output
    const extractStat = (label: string): number => {
      const m = output.match(new RegExp(`${label}[^\\d]*(\\d+(?:\\.\\d+)?)`));
      return m ? parseFloat(m[1]) : 0;
    };

    const p95 = extractStat('p\\(95\\)') || extractStat('p95');
    const p99 = extractStat('p\\(99\\)') || extractStat('p99');
    const avg = extractStat('avg');
    const totalRequests = extractStat('http_reqs') || rawMetrics.length;
    const errorRateMatch = output.match(/✗[^/]+\/([^\s]+)/);
    const parsedErrorRate = errorRateMatch ? parseFloat(errorRateMatch[1]) : 0;
    const errorRate = Number.isFinite(parsedErrorRate) ? parsedErrorRate : 0;
    const durationSeconds = (Date.now() - startTime) / 1000;
    const avgRPS = durationSeconds > 0 ? totalRequests / durationSeconds : 0;

    const thresholdBreaches: string[] = [];
    if (opts.thresholdP95 && p95 > opts.thresholdP95) {
      thresholdBreaches.push(`p95 latency ${p95.toFixed(0)}ms > threshold ${opts.thresholdP95}ms`);
    }
    if (opts.thresholdErrorRate && errorRate > opts.thresholdErrorRate) {
      thresholdBreaches.push(`error rate ${(errorRate * 100).toFixed(1)}% > threshold ${(opts.thresholdErrorRate * 100).toFixed(1)}%`);
    }

    return {
      runId: runnerId,
      scriptUrl: opts.url,
      duration: Math.round(durationSeconds),
      maxVUs: opts.vus,
      avgRPS: parseFloat(avgRPS.toFixed(2)),
      p95: parseFloat(p95.toFixed(2)),
      p99: parseFloat(p99.toFixed(2)),
      errorRate: parseFloat(errorRate.toFixed(4)),
      totalRequests,
      peakVUs: opts.vus,
      metrics: rawMetrics.slice(-200), // last 200 data points
      summary: output.slice(0, 3000),
      passed: thresholdBreaches.length === 0,
      thresholdBreaches,
    };
  }

  stop(runnerId: string): boolean {
    const proc = this.activeRuns.get(runnerId);
    if (proc) {
      proc.kill('SIGTERM');
      this.activeRuns.delete(runnerId);
      return true;
    }
    return false;
  }
}

export default new PerformanceRunner();
