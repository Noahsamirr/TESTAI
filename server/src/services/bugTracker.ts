import { getDB } from '../db/schema';
import { Bug } from '../types';
import reportGenerator from './reportGenerator';

class BugTrackerService {
  generateBugId(): string {
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `BUG-${Date.now()}-${random}`;
  }

  createBug(bugData: Omit<Bug, 'id'> & { reportId?: string | null }): Bug {
    const id = this.generateBugId();
    const db = getDB();
    db.prepare(
      `INSERT INTO bugs (id, report_id, title, severity, status, steps, expected, actual, screenshot_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      bugData.reportId || null,
      bugData.title,
      bugData.severity,
      bugData.status || 'Open',
      JSON.stringify(bugData.stepsToReproduce || []),
      bugData.expectedResult,
      bugData.actualResult,
      bugData.screenshot || null
    );
    return { ...bugData, id, status: bugData.status || 'Open' };
  }

  updateBugStatus(bugId: string, status: string): boolean {
    const validStatuses = ['Open', 'In Progress', 'Fixed', 'Verified', 'Closed'];
    if (!validStatuses.includes(status)) return false;
    const result = getDB().prepare(`UPDATE bugs SET status = ? WHERE id = ?`).run(status, bugId);
    return result.changes > 0;
  }

  getAllBugs(sessionId: string): Bug[] {
    const rows = getDB()
      .prepare(
        `SELECT b.* FROM bugs b
         JOIN reports r ON b.report_id = r.id
         WHERE r.session_id = ?
         ORDER BY b.created_at DESC`
      )
      .all(sessionId) as {
      id: string;
      title: string;
      severity: string;
      status: string;
      steps: string;
      expected: string;
      actual: string;
      screenshot_path: string | null;
    }[];

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity as Bug['severity'],
      status: r.status,
      stepsToReproduce: JSON.parse(r.steps || '[]'),
      expectedResult: r.expected,
      actualResult: r.actual,
      screenshot: r.screenshot_path || undefined,
    }));
  }

  getSeverityStats(sessionId: string): Record<string, number> {
    const bugs = this.getAllBugs(sessionId);
    const stats: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const bug of bugs) {
      stats[bug.severity] = (stats[bug.severity] || 0) + 1;
    }
    return stats;
  }

  exportBugs(sessionId: string, format: 'json' | 'csv'): string {
    const bugs = this.getAllBugs(sessionId);
    if (format === 'csv') return reportGenerator.exportToCSV(bugs);
    return JSON.stringify(bugs, null, 2);
  }
}

export default new BugTrackerService();
