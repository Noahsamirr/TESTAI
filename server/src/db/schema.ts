import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

export function getDB(): Database.Database {
  if (!db) {
    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'testmind.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initializeDB(): void {
  const database = getDB();

  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      test_type TEXT,
      app_context TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id),
      role TEXT CHECK(role IN ('user', 'assistant')),
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS test_cases (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id),
      title TEXT,
      type TEXT,
      priority TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id),
      framework TEXT,
      code TEXT,
      explanation TEXT,
      run_command TEXT,
      dependencies TEXT,
      file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id),
      data TEXT,
      html_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bugs (
      id TEXT PRIMARY KEY,
      report_id TEXT REFERENCES reports(id),
      title TEXT,
      severity TEXT,
      status TEXT DEFAULT 'Open',
      steps TEXT,
      expected TEXT,
      actual TEXT,
      screenshot_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'team')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      tokens_used INTEGER NOT NULL,
      action TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_token_usage_user_month
      ON token_usage(user_id, created_at);

    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      session_id TEXT REFERENCES sessions(id),
      script_id TEXT REFERENCES scripts(id),
      name TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      framework TEXT,
      browser TEXT,
      os TEXT,
      device TEXT,
      duration_ms INTEGER,
      passed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      skipped INTEGER DEFAULT 0,
      log_path TEXT,
      video_path TEXT,
      screenshot_path TEXT,
      report_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      url TEXT NOT NULL,
      browser TEXT,
      os TEXT,
      resolution TEXT,
      status TEXT DEFAULT 'active',
      screenshot_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS device_reservations (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      user_id TEXT REFERENCES users(id),
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      released_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS visual_baselines (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      url TEXT,
      baseline_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_test_runs_user ON test_runs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_live_sessions_user ON live_sessions(user_id, created_at);

    -- ── AI Agent Runs ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      capability TEXT NOT NULL,
      agent_id TEXT,
      agent_name TEXT,
      status TEXT DEFAULT 'running' CHECK(status IN ('running', 'success', 'failed')),
      input_json TEXT,
      output_json TEXT,
      reasoning TEXT,
      confidence REAL,
      duration_ms INTEGER,
      user_id TEXT REFERENCES users(id),
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_capability ON agent_runs(capability, created_at);

    -- ── API Test Runs ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS api_test_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      name TEXT,
      total INTEGER DEFAULT 0,
      passed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      results_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_api_runs_user ON api_test_runs(user_id, created_at);

    -- ── Self-Healing Selector Cache ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS healed_selectors (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      original_selector TEXT NOT NULL,
      healed_selector TEXT,
      strategy_used TEXT,
      confidence REAL DEFAULT 0,
      url_pattern TEXT,
      failure_count INTEGER DEFAULT 1,
      success_count INTEGER DEFAULT 0,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_healed_selectors_original ON healed_selectors(original_selector);

    -- ── Team Members (RBAC) ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      email TEXT NOT NULL,
      role TEXT DEFAULT 'viewer' CHECK(role IN ('admin', 'editor', 'viewer')),
      status TEXT DEFAULT 'invited' CHECK(status IN ('invited', 'active', 'suspended')),
      invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      joined_at DATETIME
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_owner_email ON team_members(owner_id, email);

    -- ── User Settings / Integration Configs ────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      key TEXT NOT NULL,
      config_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(user_id, key);

    -- ── Audit Logs ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at);
  `);

  // ── Backward-compatible column migrations ─────────────────────────────────

  const sessionCols = database.prepare(`PRAGMA table_info(sessions)`).all() as { name: string }[];
  if (!sessionCols.some((c) => c.name === 'user_id')) {
    database.exec(`ALTER TABLE sessions ADD COLUMN user_id TEXT REFERENCES users(id)`);
  }

  console.log('[DB] Schema initialized — all tables ready.');
}
