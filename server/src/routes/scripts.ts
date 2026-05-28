import { Router, Request, Response } from 'express';
import { getScripts, getScriptById, saveScript } from '../db/queries';
import { param } from '../utils/params';
import scriptGenerator from '../services/scriptGenerator';
import fs from 'fs';

const router = Router();

router.get('/:sessionId', (req: Request, res: Response) => {
  try {
    const scripts = getScripts(param(req.params.sessionId));
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

router.post('/update', async (req: Request, res: Response) => {
  try {
    const { scriptId, code } = req.body;
    if (!scriptId || code === undefined) {
      res.status(400).json({ error: 'scriptId and code are required' });
      return;
    }

    const existing = getScriptById(scriptId);
    if (!existing) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    existing.code = code;

    // Overwrite the file on disk if it already has a path
    if (existing.filePath && fs.existsSync(existing.filePath)) {
      fs.writeFileSync(existing.filePath, code, 'utf-8');
    } else {
      // Clear file path so it regenerates on run
      existing.filePath = undefined;
    }

    saveScript(existing.sessionId, existing);
    res.json({ success: true, script: existing });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update script',
    });
  }
});

router.post('/refine', async (req: Request, res: Response) => {
  try {
    const { scriptId, feedback } = req.body;
    if (!scriptId || !feedback) {
      res.status(400).json({ error: 'scriptId and feedback are required' });
      return;
    }

    const existing = getScriptById(scriptId);
    if (!existing) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    const refined = await scriptGenerator.refineScript(existing, feedback);
    saveScript(existing.sessionId, { ...refined, id: scriptId });
    res.json(refined);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to refine script',
    });
  }
});

export default router;
