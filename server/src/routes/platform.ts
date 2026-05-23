import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { attachUserIfPresent, requireAuth } from '../middleware/auth';
import * as platform from '../services/platformService';
import { param } from '../utils/params';

const router = Router();

router.get('/capabilities', (_req: Request, res: Response) => {
  res.json(platform.getCapabilities());
});

router.get('/dashboard', attachUserIfPresent, (req: Request, res: Response) => {
  res.json(platform.getDashboard(req.user?.userId));
});

router.get('/runs', attachUserIfPresent, (req: Request, res: Response) => {
  res.json(platform.listRuns(req.user?.userId));
});

router.post('/live/start', attachUserIfPresent, async (req: Request, res: Response) => {
  try {
    const { url, browser, os, resolution } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }
    const session = await platform.startLiveSession(req.user?.userId, {
      url,
      browser: browser || 'Chrome 120',
      os: os || 'macOS 14',
      resolution: resolution || '1920x1080',
    });
    res.json(session);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start live session',
    });
  }
});

router.post('/live/:sessionId/stop', attachUserIfPresent, (req: Request, res: Response) => {
  res.json(platform.stopLiveSession(param(req.params.sessionId)));
});

router.post('/devices/:deviceId/reserve', attachUserIfPresent, (req: Request, res: Response) => {
  try {
    res.json(platform.reserveDeviceSession(param(req.params.deviceId), req.user?.userId));
  } catch (error) {
    res.status(409).json({
      error: error instanceof Error ? error.message : 'Device unavailable',
    });
  }
});

router.post('/devices/:deviceId/release', attachUserIfPresent, (req: Request, res: Response) => {
  res.json(platform.releaseDeviceSession(param(req.params.deviceId), req.user?.userId));
});

router.get('/ci/:provider', requireAuth, (req: Request, res: Response) => {
  try {
    const { projectName, testCommand, nodeVersion } = req.query;
    const template = platform.generateCiTemplate(param(req.params.provider), {
      projectName: typeof projectName === 'string' ? projectName : undefined,
      testCommand: typeof testCommand === 'string' ? testCommand : undefined,
      nodeVersion: typeof nodeVersion === 'string' ? nodeVersion : undefined,
    });
    res.json(template);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid CI provider',
    });
  }
});

router.get('/tunnel', (_req: Request, res: Response) => {
  res.json(platform.getTunnelStatus());
});

router.post('/matrix/run', attachUserIfPresent, async (req: Request, res: Response) => {
  try {
    const { scriptId, browsers } = req.body;
    if (!scriptId) {
      res.status(400).json({ error: 'scriptId is required' });
      return;
    }
    const configs = Array.isArray(browsers) && browsers.length > 0
      ? browsers
      : [{ browser: 'Chrome', os: 'macOS' }];
    const runIds: string[] = [];
    for (const cfg of configs) {
      const id = platform.createRunRecord({
        userId: req.user?.userId,
        scriptId,
        name: `Matrix: ${cfg.browser || 'Chrome'} on ${cfg.os || 'macOS'}`,
        status: 'queued',
        framework: 'playwright',
        browser: cfg.browser,
        os: cfg.os,
      });
      runIds.push(id);
    }
    res.json({ runIds, message: 'Matrix queued — run each config via Automated Runs or AI Assistant.' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Matrix run failed',
    });
  }
});

router.get('/screenshots/:filename', (req: Request, res: Response) => {
  const filename = param(req.params.filename).replace(/[^a-zA-Z0-9._-]/g, '');
  const base = path.resolve(
    process.env.PLATFORM_ARTIFACTS_DIR || path.join(process.cwd(), 'test-outputs', 'platform'),
    'screenshots'
  );
  const filePath = path.join(base, filename);
  if (!filePath.startsWith(base) || !fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Screenshot not found' });
    return;
  }
  res.sendFile(filePath);
});

export default router;
