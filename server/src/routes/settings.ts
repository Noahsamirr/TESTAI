/**
 * @route /api/settings
 * @description Platform settings, team management, and AI provider configuration.
 *
 * Endpoints:
 *   GET  /api/settings/profile       — Get current user profile
 *   PUT  /api/settings/profile       — Update profile (name, email)
 *   GET  /api/settings/providers     — List AI providers and active one
 *   PUT  /api/settings/providers     — Switch active AI provider / update keys
 *   GET  /api/settings/team          — List team members
 *   POST /api/settings/team/invite   — Invite a new team member
 *   PUT  /api/settings/team/:id/role — Change team member role
 *   DELETE /api/settings/team/:id    — Remove team member
 *   GET  /api/settings/integrations  — Get integration configs
 *   PUT  /api/settings/integrations  — Update integration configs
 *   GET  /api/settings/audit         — Get audit log entries
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getDB } from '../db/schema';
import claudeAgent from '../services/claudeAgent';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── GET /api/settings/profile ───────────────────────────────────────────────
router.get('/profile', requireAuth, (req: Request, res: Response): void => {
  try {
    const db = getDB();
    const user = db.prepare(`SELECT id, email, name, plan, created_at FROM users WHERE id = ?`)
      .get(req.user!.userId) as { id: string; email: string; name: string; plan: string; created_at: string } | undefined;

    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load profile' });
  }
});

// ─── PUT /api/settings/profile ───────────────────────────────────────────────
router.put('/profile', requireAuth, (req: Request, res: Response): void => {
  const { name, currentPassword, newPassword } = req.body as {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  try {
    const db = getDB();

    if (name) {
      db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(name, req.user!.userId);
    }

    if (newPassword) {
      if (!currentPassword) { res.status(400).json({ error: 'currentPassword is required to change password' }); return; }
      const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user!.userId) as { password_hash: string } | undefined;
      if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
        res.status(401).json({ error: 'Current password is incorrect' }); return;
      }
      const hash = bcrypt.hashSync(newPassword, 12);
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, req.user!.userId);
    }

    appendAuditLog(req.user!.userId, 'profile_updated', { name: name ?? null });
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update profile' });
  }
});

// ─── GET /api/settings/providers ─────────────────────────────────────────────
router.get('/providers', requireAuth, (_req: Request, res: Response): void => {
  const current = claudeAgent.getProviderInfo();
  const available = claudeAgent.listAvailableProviders();

  res.json({
    current,
    available: available.map((p) => ({
      id: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      configured: isProviderConfigured(p),
    })),
  });
});

// ─── PUT /api/settings/providers ─────────────────────────────────────────────
router.put('/providers', requireAuth, (req: Request, res: Response): void => {
  const { provider } = req.body as { provider: string };
  if (!provider) { res.status(400).json({ error: "'provider' is required." }); return; }

  try {
    const result = claudeAgent.switchProvider(provider);
    appendAuditLog(req.user!.userId, 'provider_switched', { provider });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to switch provider' });
  }
});

// ─── GET /api/settings/team ──────────────────────────────────────────────────
router.get('/team', requireAuth, (req: Request, res: Response): void => {
  try {
    const db = getDB();
    const members = db.prepare(`
      SELECT tm.id, tm.email, tm.role, tm.status, tm.invited_at, tm.joined_at,
             u.name, u.plan
      FROM team_members tm
      LEFT JOIN users u ON u.email = tm.email
      WHERE tm.owner_id = ? OR tm.email = ?
      ORDER BY tm.invited_at DESC
    `).all(req.user!.userId, req.user!.email) as unknown[];
    res.json({ members });
  } catch {
    // Table may not exist yet
    res.json({ members: [] });
  }
});

// ─── POST /api/settings/team/invite ──────────────────────────────────────────
router.post('/team/invite', requireAuth, (req: Request, res: Response): void => {
  const { email, role = 'viewer' } = req.body as { email: string; role?: string };
  if (!email?.includes('@')) { res.status(400).json({ error: 'Valid email is required.' }); return; }

  const validRoles = ['admin', 'editor', 'viewer'];
  if (!validRoles.includes(role)) { res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` }); return; }

  try {
    const db = getDB();
    const id = uuidv4();
    db.prepare(`
      INSERT OR REPLACE INTO team_members (id, owner_id, email, role, status, invited_at)
      VALUES (?, ?, ?, ?, 'invited', ?)
    `).run(id, req.user!.userId, email, role, new Date().toISOString());

    appendAuditLog(req.user!.userId, 'team_member_invited', { email, role });
    res.json({ success: true, id, message: `Invitation sent to ${email}` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to invite member' });
  }
});

// ─── PUT /api/settings/team/:id/role ─────────────────────────────────────────
router.put('/team/:id/role', requireAuth, (req: Request, res: Response): void => {
  const { role } = req.body as { role: string };
  const validRoles = ['admin', 'editor', 'viewer'];
  if (!validRoles.includes(role)) { res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` }); return; }

  try {
    const db = getDB();
    db.prepare(`UPDATE team_members SET role = ? WHERE id = ? AND owner_id = ?`)
      .run(role, req.params['id'], req.user!.userId);
    appendAuditLog(req.user!.userId, 'team_member_role_changed', { id: req.params['id'], role });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update role' });
  }
});

// ─── DELETE /api/settings/team/:id ──────────────────────────────────────────
router.delete('/team/:id', requireAuth, (req: Request, res: Response): void => {
  try {
    const db = getDB();
    db.prepare(`DELETE FROM team_members WHERE id = ? AND owner_id = ?`)
      .run(req.params['id'], req.user!.userId);
    appendAuditLog(req.user!.userId, 'team_member_removed', { id: req.params['id'] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to remove member' });
  }
});

// ─── GET /api/settings/integrations ─────────────────────────────────────────
router.get('/integrations', requireAuth, (req: Request, res: Response): void => {
  try {
    const db = getDB();
    const row = db.prepare(`SELECT config_json FROM user_settings WHERE user_id = ? AND key = 'integrations'`)
      .get(req.user!.userId) as { config_json: string } | undefined;
    const config = row ? JSON.parse(row.config_json) : {};
    res.json({ integrations: config });
  } catch {
    res.json({ integrations: {} });
  }
});

// ─── PUT /api/settings/integrations ─────────────────────────────────────────
router.put('/integrations', requireAuth, (req: Request, res: Response): void => {
  const config = req.body as Record<string, unknown>;
  try {
    const db = getDB();
    db.prepare(`
      INSERT OR REPLACE INTO user_settings (id, user_id, key, config_json, updated_at)
      VALUES (?, ?, 'integrations', ?, ?)
    `).run(uuidv4(), req.user!.userId, JSON.stringify(config), new Date().toISOString());
    appendAuditLog(req.user!.userId, 'integrations_updated', {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save integrations' });
  }
});

// ─── GET /api/settings/audit ─────────────────────────────────────────────────
router.get('/audit', requireAuth, (req: Request, res: Response): void => {
  const limit = Math.min(parseInt(String(req.query['limit'] ?? '50'), 10), 200);
  try {
    const db = getDB();
    const logs = db.prepare(`
      SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(req.user!.userId, limit) as unknown[];
    res.json({ logs });
  } catch {
    res.json({ logs: [] });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isProviderConfigured(provider: string): boolean {
  const keyMap: Record<string, string> = {
    gemini: 'GEMINI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    groq: 'GROQ_API_KEY',
    ollama: 'OLLAMA_BASE_URL',
    puter: 'PUTER_AUTH_TOKEN',
  };
  const key = keyMap[provider];
  const val = key ? process.env[key] : undefined;
  return !!(val && !val.includes('your_') && val.length > 5);
}

function appendAuditLog(userId: string, action: string, details: Record<string, unknown>): void {
  try {
    const db = getDB();
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, action, JSON.stringify(details), new Date().toISOString());
  } catch {
    // Table may not exist yet
  }
}

export default router;
