import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import claudeAgent from './claudeAgent';
import { TestReport, TestResult, Bug } from '../types';

class ReportGeneratorService {
  async generateHTMLReport(report: TestReport, sessionId: string): Promise<string> {
    const dir = process.env.REPORTS_OUTPUT_DIR || path.join(process.cwd(), 'test-outputs', 'reports');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const timestamp = Date.now();
    const filename = `report-${sessionId}-${timestamp}.html`;
    const filePath = path.join(dir, filename);

    const aiSummary = await this.generateAISummary(report);
    const passPct = report.totalTests > 0 ? (report.passed / report.totalTests) * 100 : 0;
    const failPct = report.totalTests > 0 ? (report.failed / report.totalTests) * 100 : 0;
    const skipPct = report.totalTests > 0 ? (report.skipped / report.totalTests) * 100 : 0;

    const circumference = 2 * Math.PI * 40;
    const passDash = (passPct / 100) * circumference;
    const failDash = (failPct / 100) * circumference;
    const skipDash = (skipPct / 100) * circumference;

    const severityColor = (s: string) => {
      const map: Record<string, string> = {
        Critical: '#ff4444',
        High: '#ff8c00',
        Medium: '#ffd700',
        Low: '#00b4ff',
      };
      return map[s] || '#888';
    };

    const bugRows = report.bugs
      .map(
        (bug, i) => `
      <tr class="bug-row" onclick="toggleBug(${i})">
        <td>${bug.id}</td>
        <td>${escapeHtml(bug.title)}</td>
        <td><span class="badge" style="background:${severityColor(bug.severity)}">${bug.severity}</span></td>
        <td>${bug.status}</td>
        <td>${new Date(report.executionDate).toLocaleDateString()}</td>
      </tr>
      <tr class="bug-detail" id="bug-detail-${i}" style="display:none">
        <td colspan="5">
          <p><strong>Steps:</strong></p>
          <ol>${(bug.stepsToReproduce || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
          <p><strong>Expected:</strong> ${escapeHtml(bug.expectedResult)}</p>
          <p><strong>Actual:</strong> ${escapeHtml(bug.actualResult)}</p>
        </td>
      </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TestMind AI Report — ${escapeHtml(report.testSuite)}</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', system-ui, sans-serif; background: #0c0f14; color: #e2e8f0; padding: 2rem; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid #243044; padding-bottom: 1rem; }
    .logo { font-size: 1.5rem; color: #5eead4; font-weight: 600; }
    .env-badge { background: #162217; padding: 0.25rem 0.75rem; border-radius: 4px; color: #00b4ff; font-size: 0.8rem; }
    .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .kpi { background: #1a2234; border-radius: 8px; padding: 1.5rem; text-align: center; }
    .kpi .value { font-size: 2rem; font-weight: 600; }
    .kpi.passed .value { color: #5eead4; }
    .kpi.failed .value { color: #ff4444; }
    .kpi.skipped .value { color: #888; }
    .kpi.rate .value { color: #ffd700; font-size: 2.5rem; }
    .chart-section { display: flex; gap: 2rem; margin-bottom: 2rem; align-items: center; }
    .donut-label { font-size: 1.2rem; color: #5eead4; margin-left: 1rem; }
    table { width: 100%; border-collapse: collapse; background: #1a2234; border-radius: 8px; overflow: hidden; margin-bottom: 2rem; }
    th { background: #243044; padding: 0.75rem 1rem; text-align: left; color: #5eead4; font-size: 0.85rem; }
    td { padding: 0.75rem 1rem; border-top: 1px solid #1d2e1e; font-size: 0.85rem; }
    .bug-row { cursor: pointer; }
    .bug-row:hover { background: #162217; }
    .bug-detail td { background: #0a0f0d; padding: 1rem 1.5rem; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; color: #000; font-weight: 600; }
    .recommendations { background: #0f1812; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; }
    .recommendations li { margin: 0.5rem 0; list-style: none; }
    .recommendations li::before { content: '· '; color: #5eead4; }
    .ai-summary { background: #0f1812; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; line-height: 1.8; }
    .footer { text-align: center; color: #555; font-size: 0.8rem; margin-top: 2rem; }
    .print-btn { background: #2dd4bf; color: #0c0f14; border: none; padding: 0.5rem 1.5rem; border-radius: 6px; cursor: pointer; font-family: inherit; font-weight: 600; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">TestMind AI Report</div>
      <h2 style="margin-top:0.5rem">${escapeHtml(report.testSuite)}</h2>
      <p style="color:#888;font-size:0.85rem">${new Date(report.executionDate).toLocaleString()}</p>
    </div>
    <div>
      <span class="env-badge">${escapeHtml(report.environment)}</span>
      <button class="print-btn" onclick="window.print()" style="margin-left:1rem">Export PDF</button>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="value">${report.totalTests}</div><div>Total Tests</div></div>
    <div class="kpi passed"><div class="value">${report.passed}</div><div>Passed</div></div>
    <div class="kpi failed"><div class="value">${report.failed}</div><div>Failed</div></div>
    <div class="kpi skipped"><div class="value">${report.skipped}</div><div>Skipped</div></div>
    <div class="kpi rate"><div class="value">${report.passRate}</div><div>Pass Rate</div></div>
  </div>

  <div class="chart-section">
    <svg width="120" height="120" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#1d2e1e" stroke-width="12"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#5eead4" stroke-width="12"
        stroke-dasharray="${passDash} ${circumference}" transform="rotate(-90 50 50)"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#ff4444" stroke-width="12"
        stroke-dasharray="${failDash} ${circumference}" stroke-dashoffset="${-passDash}" transform="rotate(-90 50 50)"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#888" stroke-width="12"
        stroke-dasharray="${skipDash} ${circumference}" stroke-dashoffset="${-(passDash + failDash)}" transform="rotate(-90 50 50)"/>
    </svg>
    <div class="donut-label">${report.passRate}</div>
  </div>

  <h3 style="margin-bottom:1rem;color:#5eead4">Defects (${report.bugs.length})</h3>
  <table>
    <thead><tr><th>Bug ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Reported</th></tr></thead>
    <tbody>${bugRows || '<tr><td colspan="5">No bugs found</td></tr>'}</tbody>
  </table>

  <div class="recommendations">
    <h3 style="color:#5eead4;margin-bottom:1rem">Recommendations</h3>
    <ol>${report.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join('') || '<li>No recommendations</li>'}</ol>
  </div>

  <div class="ai-summary">
    <h3 style="color:#5eead4;margin-bottom:1rem">Executive Summary</h3>
    ${aiSummary.split('\n').map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
  </div>

  <div class="footer">Generated by TestMind AI</div>

  <script>
    function toggleBug(i) {
      const el = document.getElementById('bug-detail-' + i);
      el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
    }
  </script>
</body>
</html>`;

    fs.writeFileSync(filePath, html, 'utf-8');

    if (report.markdownReport) {
      const mdPath = path.join(dir, `report-${sessionId}-${timestamp}.md`);
      fs.writeFileSync(mdPath, report.markdownReport, 'utf-8');
    }

    return filePath;
  }

  async generateJSONReport(report: TestReport, sessionId: string): Promise<string> {
    const dir = process.env.REPORTS_OUTPUT_DIR || path.join(process.cwd(), 'test-outputs', 'reports');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `report-${sessionId}-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    return filePath;
  }

  async generateAllureResults(results: TestResult[], sessionId: string): Promise<void> {
    const dir = process.env.ALLURE_RESULTS_DIR || path.join(process.cwd(), 'test-outputs', 'allure-results');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    for (const result of results) {
      const resultUuid = uuidv4();
      const allureResult: Record<string, unknown> = {
        uuid: resultUuid,
        name: result.title,
        status: result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed',
        stage: 'finished',
        start: Date.now() - result.duration,
        stop: Date.now(),
        steps: [],
        attachments: [],
        parameters: [{ name: 'sessionId', value: sessionId }],
        labels: [
          { name: 'framework', value: 'testmind-ai' },
          { name: 'session', value: sessionId },
        ],
      };

      if (result.error) {
        allureResult.statusDetails = { message: result.error };
      }

      fs.writeFileSync(path.join(dir, `${resultUuid}-result.json`), JSON.stringify(allureResult), 'utf-8');
    }
  }

  async generateAISummary(report: TestReport): Promise<string> {
    try {
      const prompt = `Write a 3-5 paragraph executive summary of these test results. Be professional and actionable.

Suite: ${report.testSuite}
Pass Rate: ${report.passRate}
Passed: ${report.passed}, Failed: ${report.failed}, Skipped: ${report.skipped}
Bugs: ${report.bugs.length}
Recommendations: ${report.recommendations.join('; ')}`;

      // Use direct prompt completion (not chat) to avoid polluting session history / creating phantom sessions
      const text = await claudeAgent.completeUserPrompt(prompt, 1024);
      return text;
    } catch {
      return `Test suite "${report.testSuite}" completed with a pass rate of ${report.passRate}. ${report.passed} tests passed, ${report.failed} failed, and ${report.skipped} were skipped. ${report.bugs.length} bugs were identified requiring attention.`;
    }
  }

  exportToCSV(bugs: Bug[]): string {
    const headers = ['ID', 'Title', 'Severity', 'Status', 'Steps', 'Expected', 'Actual'];
    const rows = bugs.map((b) =>
      [
        b.id,
        `"${b.title.replace(/"/g, '""')}"`,
        b.severity,
        b.status,
        `"${(b.stepsToReproduce || []).join('; ').replace(/"/g, '""')}"`,
        `"${b.expectedResult.replace(/"/g, '""')}"`,
        `"${b.actualResult.replace(/"/g, '""')}"`,
      ].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default new ReportGeneratorService();
