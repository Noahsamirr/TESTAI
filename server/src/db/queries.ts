import { v4 as uuidv4 } from 'uuid';
import { getDB } from './schema';
import { TestCase, GeneratedScript, TestReport } from '../types';

export function createSession(id?: string, userId?: string): string {
  const sessionId = id || uuidv4();
  const db = getDB();
  if (userId) {
    db.prepare(
      `INSERT OR IGNORE INTO sessions (id, status, user_id) VALUES (?, 'active', ?)`
    ).run(sessionId, userId);
    db.prepare(`UPDATE sessions SET user_id = ? WHERE id = ?`).run(userId, sessionId);
  } else {
    db.prepare(`INSERT OR IGNORE INTO sessions (id, status) VALUES (?, 'active')`).run(sessionId);
  }
  return sessionId;
}

export function updateSession(sessionId: string, testType?: string, appContext?: string): void {
  const db = getDB();
  if (testType) {
    db.prepare(`UPDATE sessions SET test_type = ? WHERE id = ?`).run(testType, sessionId);
  }
  if (appContext) {
    db.prepare(`UPDATE sessions SET app_context = ? WHERE id = ?`).run(appContext, sessionId);
  }
}

export function saveMessage(sessionId: string, role: 'user' | 'assistant', content: string): string {
  const id = uuidv4();
  getDB().prepare(
    `INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)`
  ).run(id, sessionId, role, content);
  return id;
}

export function getMessages(sessionId: string): { role: string; content: string }[] {
  return getDB()
    .prepare(`SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC`)
    .all(sessionId) as { role: string; content: string }[];
}

export function getSessionMeta(sessionId: string): {
  testType?: string;
  appContext?: string;
} {
  const row = getDB()
    .prepare(`SELECT test_type, app_context FROM sessions WHERE id = ?`)
    .get(sessionId) as { test_type?: string; app_context?: string } | undefined;
  if (!row) return {};
  return {
    testType: row.test_type || undefined,
    appContext: row.app_context || undefined,
  };
}

export function appendSessionContext(sessionId: string, note: string): void {
  const { appContext } = getSessionMeta(sessionId);
  const combined = appContext ? `${appContext}\n${note}` : note;
  const trimmed = combined.slice(-4000);
  getDB()
    .prepare(`UPDATE sessions SET app_context = ? WHERE id = ?`)
    .run(trimmed, sessionId);
}

export function saveTestCases(sessionId: string, cases: TestCase[]): void {
  const db = getDB();
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO test_cases (id, session_id, title, type, priority, data) VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const tc of cases) {
    stmt.run(tc.id, sessionId, tc.title, tc.type, tc.priority, JSON.stringify(tc));
  }
}

export function getTestCases(sessionId: string): TestCase[] {
  const rows = getDB()
    .prepare(`SELECT data FROM test_cases WHERE session_id = ? ORDER BY created_at ASC`)
    .all(sessionId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as TestCase);
}

export function deleteTestCase(id: string): void {
  getDB().prepare(`DELETE FROM test_cases WHERE id = ?`).run(id);
}

export function saveScript(sessionId: string, script: GeneratedScript & { filePath?: string }): string {
  const id = script.id || uuidv4();
  getDB().prepare(
    `INSERT OR REPLACE INTO scripts (id, session_id, framework, code, explanation, run_command, dependencies, file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    sessionId,
    script.framework,
    script.code,
    JSON.stringify(script.explanation),
    script.runCommand,
    JSON.stringify(script.dependencies),
    script.filePath || null
  );
  return id;
}

export function getScripts(sessionId: string): (GeneratedScript & { id: string; filePath?: string })[] {
  const rows = getDB()
    .prepare(`SELECT id, framework, code, explanation, run_command, dependencies, file_path FROM scripts WHERE session_id = ?`)
    .all(sessionId) as {
    id: string;
    framework: string;
    code: string;
    explanation: string;
    run_command: string;
    dependencies: string;
    file_path: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    framework: r.framework,
    runCommand: r.run_command,
    explanation: JSON.parse(r.explanation),
    dependencies: JSON.parse(r.dependencies),
    filePath: r.file_path || undefined,
  }));
}

export function getScriptById(scriptId: string): (GeneratedScript & { id: string; sessionId: string; filePath?: string }) | null {
  const row = getDB()
    .prepare(`SELECT id, session_id, framework, code, explanation, run_command, dependencies, file_path FROM scripts WHERE id = ?`)
    .get(scriptId) as {
    id: string;
    session_id: string;
    framework: string;
    code: string;
    explanation: string;
    run_command: string;
    dependencies: string;
    file_path: string | null;
  } | undefined;

  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    code: row.code,
    framework: row.framework,
    runCommand: row.run_command,
    explanation: JSON.parse(row.explanation),
    dependencies: JSON.parse(row.dependencies),
    filePath: row.file_path || undefined,
  };
}

export function saveReport(sessionId: string, report: TestReport, htmlPath?: string): string {
  const id = uuidv4();
  getDB().prepare(
    `INSERT INTO reports (id, session_id, data, html_path) VALUES (?, ?, ?, ?)`
  ).run(id, sessionId, JSON.stringify(report), htmlPath || null);
  return id;
}

export function getReports(sessionId: string): { id: string; data: TestReport; htmlPath?: string }[] {
  const rows = getDB()
    .prepare(`SELECT id, data, html_path FROM reports WHERE session_id = ? ORDER BY created_at DESC`)
    .all(sessionId) as { id: string; data: string; html_path: string | null }[];

  return rows.map((r) => ({
    id: r.id,
    data: JSON.parse(r.data) as TestReport,
    htmlPath: r.html_path || undefined,
  }));
}

export function getReportById(reportId: string): { id: string; sessionId: string; data: TestReport; htmlPath?: string } | null {
  const row = getDB()
    .prepare(`SELECT id, session_id, data, html_path FROM reports WHERE id = ?`)
    .get(reportId) as { id: string; session_id: string; data: string; html_path: string | null } | undefined;

  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    data: JSON.parse(row.data) as TestReport,
    htmlPath: row.html_path || undefined,
  };
}

export function getSessions(): { id: string; created_at: string; test_type: string | null; status: string }[] {
  return getDB()
    .prepare(`SELECT id, created_at, test_type, status FROM sessions ORDER BY created_at DESC LIMIT 50`)
    .all() as { id: string; created_at: string; test_type: string | null; status: string }[];
}
