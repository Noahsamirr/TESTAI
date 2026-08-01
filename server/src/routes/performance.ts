import { Router, Request, Response } from 'express';
import { attachUserIfPresent } from '../middleware/auth';
import performanceRunner from '../services/performanceRunner';
import { getDB } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory store of completed perf run results (extend to DB if needed)
const perfResults = new Map<string, unknown>();

performanceRunner.on('complete', ({ runnerId, result }) => {
  perfResults.set(runnerId, result);
});

// POST /api/performance/run — start a k6 load test
router.post('/run', attachUserIfPresent, (req: Request, res: Response) => {
  const { url, duration = 30, vus = 10, rampUpSeconds = 10, thresholdP95 = 2000, thresholdErrorRate = 0.05 } = req.body;
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  const runnerId = uuidv4();

  // Fire & forget — stream events over WebSocket by wiring into main server
  performanceRunner.run({
    url,
    duration: parseInt(duration),
    vus: parseInt(vus),
    rampUpSeconds: parseInt(rampUpSeconds),
    thresholdP95: parseInt(thresholdP95),
    thresholdErrorRate: parseFloat(thresholdErrorRate),
    runnerId,
  }).catch((err) => {
    console.error('[perf runner] error', err);
  });

  res.json({ runnerId, status: 'started' });
});

// GET /api/performance/runs/:runnerId — get completed result
router.get('/runs/:runnerId', (req: Request, res: Response) => {
  const result = perfResults.get(String(req.params.runnerId));
  if (!result) {
    res.status(404).json({ error: 'Run not found or not yet complete' });
    return;
  }
  res.json(result);
});

// POST /api/performance/stop/:runnerId
router.post('/stop/:runnerId', (req: Request, res: Response) => {
  const stopped = performanceRunner.stop(String(req.params.runnerId));
  res.json({ stopped });
});

// GET /api/performance/k6-script — generate a k6 script without running it
router.post('/generate-script', (req: Request, res: Response) => {
  const { url, duration = 30, vus = 50, rampUpSeconds = 10, thresholdP95 = 2000, thresholdErrorRate = 0.05 } = req.body;
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  const script = performanceRunner.generateK6Script({ url, duration, vus, rampUpSeconds, thresholdP95, thresholdErrorRate });
  res.json({ script, language: 'javascript', runner: 'k6' });
});

// GET /api/performance/check — verify k6 is installed
router.get('/check', (_req: Request, res: Response) => {
  const { execSync } = require('child_process');
  try {
    const version = execSync('k6 version 2>&1', { encoding: 'utf8' }).trim();
    res.json({ installed: true, version });
  } catch {
    res.json({
      installed: false,
      installGuide: 'Install k6: https://k6.io/docs/get-started/installation/ — on macOS: brew install k6',
    });
  }
});

export default router;
