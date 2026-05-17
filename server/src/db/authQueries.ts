import { v4 as uuidv4 } from 'uuid';
import { getDB } from './schema';
import { PlanId } from '../config/plans';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  plan: PlanId;
  created_at: string;
}

export function createUser(email: string, passwordHash: string, name: string): UserRow {
  const db = getDB();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, plan) VALUES (?, ?, ?, ?, 'free')`
  ).run(id, email.toLowerCase().trim(), passwordHash, name.trim() || email.split('@')[0]);
  return getUserById(id)!;
}

export function getUserByEmail(email: string): UserRow | undefined {
  const db = getDB();
  return db
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email.toLowerCase().trim()) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  const db = getDB();
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
}

export function updateUserPlan(userId: string, plan: PlanId): void {
  const db = getDB();
  db.prepare(`UPDATE users SET plan = ? WHERE id = ?`).run(plan, userId);
}

export function getMonthlyTokenUsage(userId: string, periodStartIso: string): number {
  const db = getDB();
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(tokens_used), 0) as total
       FROM token_usage
       WHERE user_id = ? AND created_at >= ?`
    )
    .get(userId, periodStartIso) as { total: number };
  return row.total;
}

export function recordTokenUsage(
  id: string,
  userId: string,
  tokensUsed: number,
  action: string
): void {
  const db = getDB();
  db.prepare(
    `INSERT INTO token_usage (id, user_id, tokens_used, action) VALUES (?, ?, ?, ?)`
  ).run(id, userId, tokensUsed, action);
}

export function toPublicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    createdAt: user.created_at,
  };
}
