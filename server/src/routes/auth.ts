import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PLANS, PlanId, getPlan } from '../config/plans';
import {
  createUser,
  getUserByEmail,
  getUserById,
  toPublicUser as pub,
  updateUserPlan,
} from '../db/authQueries';
import { requireAuth, signToken } from '../middleware/auth';
import { getUsageSummary } from '../services/tokenService';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    if (getUserByEmail(email)) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = createUser(email, passwordHash, name || '');
    const token = signToken({ userId: user.id, email: user.email });
    const usage = getUsageSummary(user.id);

    res.status(201).json({
      token,
      user: pub(user),
      usage,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });
    const usage = getUsageSummary(user.id);

    res.json({
      token,
      user: pub(user),
      usage,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = getUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: pub(user), usage: getUsageSummary(user.id) });
});

router.get('/usage', requireAuth, (req: Request, res: Response) => {
  res.json(getUsageSummary(req.user!.userId));
});

router.get('/plans', (_req: Request, res: Response) => {
  res.json(
    Object.values(PLANS).map((p) => ({
      id: p.id,
      label: p.label,
      monthlyTokens: p.monthlyTokens,
      priceLabel: p.priceLabel,
    }))
  );
});

router.post('/subscribe', requireAuth, (req: Request, res: Response) => {
  const { plan } = req.body as { plan?: PlanId };
  if (!plan || !getPlan(plan)) {
    res.status(400).json({ error: 'Invalid plan. Choose free, pro, or team.' });
    return;
  }

  updateUserPlan(req.user!.userId, plan);
  const user = getUserById(req.user!.userId)!;
  res.json({
    user: pub(user),
    usage: getUsageSummary(user.id),
    message: `Subscribed to ${getPlan(plan).label} plan`,
  });
});

export default router;
