import { Router, Request, Response } from 'express';
import { attachUserIfPresent } from '../middleware/auth';
import { runAccessibilityScan } from '../services/accessibilityScanner';

const router = Router();

// POST /api/visual/scan
router.post('/scan', attachUserIfPresent, async (req: Request, res: Response) => {
  const { url, viewportWidth, viewportHeight } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  try {
    const viewport = viewportWidth && viewportHeight
      ? { width: parseInt(viewportWidth), height: parseInt(viewportHeight) }
      : undefined;

    const result = await runAccessibilityScan(url, viewport);
    res.json(result);
  } catch (err) {
    console.error('[visual/scan]', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Accessibility scan failed',
    });
  }
});

// GET /api/visual/viewports — predefined viewport presets
router.get('/viewports', (_req: Request, res: Response) => {
  res.json([
    { name: 'Desktop 1920', width: 1920, height: 1080 },
    { name: 'Desktop 1440', width: 1440, height: 900 },
    { name: 'Desktop 1280', width: 1280, height: 800 },
    { name: 'Laptop 1024', width: 1024, height: 768 },
    { name: 'Tablet 768', width: 768, height: 1024 },
    { name: 'Mobile 390', width: 390, height: 844 },
    { name: 'Mobile 375', width: 375, height: 667 },
  ]);
});

// GET /api/visual/wcag-levels — WCAG level reference
router.get('/wcag-levels', (_req: Request, res: Response) => {
  res.json({
    levels: ['A', 'AA', 'AAA'],
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'],
    description: 'axe-core checks against WCAG 2.0 A/AA, WCAG 2.1 AA, WCAG 2.2 AA, and best practices.',
  });
});

export default router;
