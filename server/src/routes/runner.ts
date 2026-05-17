import { Router, Request, Response } from 'express';
import { getScriptById, saveReport } from '../db/queries';
import { param } from '../utils/params';
import scriptRunner from '../services/scriptRunner';
import scriptGenerator from '../services/scriptGenerator';
import reportGenerator from '../services/reportGenerator';

const activeRuns = new Map<string, { status: string; framework: string }>();

const router = Router();

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { scriptId, framework } = req.body;
    if (!scriptId) {
      res.status(400).json({ error: 'scriptId is required' });
      return;
    }

    const script = getScriptById(scriptId);
    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    const scriptPath =
      script.filePath ||
      scriptGenerator.saveScript(
        {
          code: script.code,
          framework: script.framework,
          runCommand: script.runCommand,
          explanation: script.explanation,
          dependencies: script.dependencies,
        },
        script.sessionId
      );

    const fw = (framework || script.framework).toLowerCase();

    const runPromise = (async () => {
      if (fw.includes('appium') || fw.includes('wdio')) {
        return scriptRunner.runAppiumScript(scriptPath);
      }
      if (fw.includes('jest') || fw.includes('api')) {
        return scriptRunner.runApiTests(scriptPath);
      }
      return scriptRunner.runPlaywrightScript(scriptPath);
    })();

    const result = await runPromise;
    activeRuns.set(result.runnerId, { status: 'complete', framework: fw });

    res.json({ runnerId: result.runnerId, status: 'started', results: result.results });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run script',
    });
  }
});

router.get('/status/:runnerId', (req: Request, res: Response) => {
  const run = activeRuns.get(param(req.params.runnerId));
  if (!run) {
    res.status(404).json({ error: 'Runner not found' });
    return;
  }
  res.json(run);
});

router.post('/stop/:runnerId', (req: Request, res: Response) => {
  const runnerId = param(req.params.runnerId);
  const stopped = scriptRunner.stopRunner(runnerId);
  if (stopped) {
    activeRuns.set(runnerId, { status: 'stopped', framework: '' });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Runner not found' });
  }
});

export default router;
