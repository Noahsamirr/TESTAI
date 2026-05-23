import { v4 as uuidv4 } from 'uuid';
import { getDB } from './schema';

export interface TestRunRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  script_id: string | null;
  name: string;
  status: string;
  framework: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  duration_ms: number | null;
  passed: number;
  failed: number;
  skipped: number;
  log_path: string | null;
  video_path: string | null;
  screenshot_path: string | null;
  report_id: string | null;
  created_at: string;
}

export interface LiveSessionRow {
  id: string;
  user_id: string | null;
  url: string;
  browser: string;
  os: string;
  resolution: string;
  status: string;
  screenshot_path: string | null;
  created_at: string;
  ended_at: string | null;
}

export function saveTestRun(data: {
  userId?: string;
  sessionId?: string;
  scriptId?: string;
  name: string;
  status: string;
  framework: string;
  browser?: string;
  os?: string;
  device?: string;
  durationMs?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  logPath?: string;
  videoPath?: string;
  screenshotPath?: string;
  reportId?: string;
}): string {
  const id = uuidv4();
  getDB()
    .prepare(
      `INSERT INTO test_runs (
        id, user_id, session_id, script_id, name, status, framework,
        browser, os, device, duration_ms, passed, failed, skipped,
        log_path, video_path, screenshot_path, report_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.userId || null,
      data.sessionId || null,
      data.scriptId || null,
      data.name,
      data.status,
      data.framework,
      data.browser || null,
      data.os || null,
      data.device || null,
      data.durationMs ?? null,
      data.passed ?? 0,
      data.failed ?? 0,
      data.skipped ?? 0,
      data.logPath || null,
      data.videoPath || null,
      data.screenshotPath || null,
      data.reportId || null
    );
  return id;
}

export function updateTestRun(
  id: string,
  patch: Partial<{
    status: string;
    durationMs: number;
    passed: number;
    failed: number;
    skipped: number;
    logPath: string;
    videoPath: string;
    screenshotPath: string;
    reportId: string;
  }>
): void {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (patch.status !== undefined) {
    fields.push('status = ?');
    values.push(patch.status);
  }
  if (patch.durationMs !== undefined) {
    fields.push('duration_ms = ?');
    values.push(patch.durationMs);
  }
  if (patch.passed !== undefined) {
    fields.push('passed = ?');
    values.push(patch.passed);
  }
  if (patch.failed !== undefined) {
    fields.push('failed = ?');
    values.push(patch.failed);
  }
  if (patch.skipped !== undefined) {
    fields.push('skipped = ?');
    values.push(patch.skipped);
  }
  if (patch.logPath !== undefined) {
    fields.push('log_path = ?');
    values.push(patch.logPath);
  }
  if (patch.videoPath !== undefined) {
    fields.push('video_path = ?');
    values.push(patch.videoPath);
  }
  if (patch.screenshotPath !== undefined) {
    fields.push('screenshot_path = ?');
    values.push(patch.screenshotPath);
  }
  if (patch.reportId !== undefined) {
    fields.push('report_id = ?');
    values.push(patch.reportId);
  }
  if (fields.length === 0) return;
  values.push(id);
  getDB().prepare(`UPDATE test_runs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function listTestRuns(userId?: string, limit = 50): TestRunRow[] {
  if (userId) {
    return getDB()
      .prepare(
        `SELECT * FROM test_runs WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT ?`
      )
      .all(userId, limit) as TestRunRow[];
  }
  return getDB()
    .prepare(`SELECT * FROM test_runs ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as TestRunRow[];
}

export function getTestRun(id: string): TestRunRow | undefined {
  return getDB().prepare(`SELECT * FROM test_runs WHERE id = ?`).get(id) as TestRunRow | undefined;
}

export function getDashboardStats(userId?: string): {
  activeVms: number;
  availableDevices: number;
  passedTests: number;
  failedTests: number;
  totalRuns: number;
} {
  const db = getDB();
  const runs = userId
    ? (db
        .prepare(`SELECT passed, failed, status FROM test_runs WHERE user_id = ? OR user_id IS NULL`)
        .all(userId) as { passed: number; failed: number; status: string }[])
    : (db.prepare(`SELECT passed, failed, status FROM test_runs`).all() as {
        passed: number;
        failed: number;
        status: string;
      }[]);

  const passedTests = runs.reduce((s, r) => s + (r.passed || 0), 0);
  const failedTests = runs.reduce((s, r) => s + (r.failed || 0), 0);
  const activeSessions = db
    .prepare(`SELECT COUNT(*) as c FROM live_sessions WHERE status = 'active'`)
    .get() as { c: number };

  return {
    activeVms: activeSessions.c,
    availableDevices: 5,
    passedTests,
    failedTests,
    totalRuns: runs.length,
  };
}

export function createLiveSession(data: {
  userId?: string;
  url: string;
  browser: string;
  os: string;
  resolution: string;
}): string {
  const id = uuidv4();
  getDB()
    .prepare(
      `INSERT INTO live_sessions (id, user_id, url, browser, os, resolution, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`
    )
    .run(id, data.userId || null, data.url, data.browser, data.os, data.resolution);
  return id;
}

export function endLiveSession(id: string, screenshotPath?: string): void {
  getDB()
    .prepare(
      `UPDATE live_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP, screenshot_path = ?
       WHERE id = ?`
    )
    .run(screenshotPath || null, id);
}

export function listLiveSessions(userId?: string, limit = 20): LiveSessionRow[] {
  if (userId) {
    return getDB()
      .prepare(
        `SELECT * FROM live_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(userId, limit) as LiveSessionRow[];
  }
  return getDB()
    .prepare(`SELECT * FROM live_sessions ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as LiveSessionRow[];
}

export function reserveDevice(deviceId: string, userId?: string): boolean {
  const row = getDB()
    .prepare(`SELECT status FROM device_reservations WHERE device_id = ? AND status = 'active'`)
    .get(deviceId);
  if (row) return false;
  getDB()
    .prepare(
      `INSERT INTO device_reservations (id, device_id, user_id, status) VALUES (?, ?, ?, 'active')`
    )
    .run(uuidv4(), deviceId, userId || null);
  return true;
}

export function releaseDevice(deviceId: string, userId?: string): void {
  if (userId) {
    getDB()
      .prepare(
        `UPDATE device_reservations SET status = 'released', released_at = CURRENT_TIMESTAMP
         WHERE device_id = ? AND user_id = ? AND status = 'active'`
      )
      .run(deviceId, userId);
  } else {
    getDB()
      .prepare(
        `UPDATE device_reservations SET status = 'released', released_at = CURRENT_TIMESTAMP
         WHERE device_id = ? AND status = 'active'`
      )
      .run(deviceId);
  }
}

export function getActiveDeviceReservations(userId?: string): string[] {
  const rows = userId
    ? (getDB()
        .prepare(
          `SELECT device_id FROM device_reservations WHERE status = 'active' AND (user_id = ? OR user_id IS NULL)`
        )
        .all(userId) as { device_id: string }[])
    : (getDB()
        .prepare(`SELECT device_id FROM device_reservations WHERE status = 'active'`)
        .all() as { device_id: string }[]);
  return rows.map((r) => r.device_id);
}
