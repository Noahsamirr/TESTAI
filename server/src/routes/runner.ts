import { Router, Request, Response } from 'express';
import { getScriptById } from '../db/queries';
import { param } from '../utils/params';
import scriptRunner from '../services/scriptRunner';
import scriptGenerator from '../services/scriptGenerator';
import * as platform from '../services/platformService';
import { attachUserIfPresent } from '../middleware/auth';

const activeRuns = new Map<string, { status: string; framework: string }>();

const router = Router();

router.post('/run', attachUserIfPresent, async (req: Request, res: Response) => {
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
    const userId = req.user?.userId;

    const immediateRunnerId = `run-${Date.now()}`;
    activeRuns.set(immediateRunnerId, { status: 'running', framework: fw });

    const dbRunId = platform.createRunRecord({
      userId,
      sessionId: script.sessionId,
      scriptId: script.id,
      name: `Run: ${script.framework} suite`,
      status: 'running',
      framework: fw,
      browser: 'Chrome',
      os: 'Local',
    });

    res.json({ runnerId: immediateRunnerId, status: 'started', runId: dbRunId });

    const started = Date.now();
    (async () => {
      try {
        let result: { runnerId: string; results: { status: string }[] };
        if (fw.includes('appium') || fw.includes('wdio')) {
          result = await scriptRunner.runAppiumScript(scriptPath, { runnerId: immediateRunnerId });
        } else if (fw.includes('jest') || fw.includes('api')) {
          result = await scriptRunner.runApiTests(scriptPath, { runnerId: immediateRunnerId });
        } else {
          result = await scriptRunner.runPlaywrightScript(scriptPath, { runnerId: immediateRunnerId });
        }
        const passed = result.results.filter((r) => r.status === 'passed').length;
        const failed = result.results.filter((r) => r.status === 'failed').length;
        const skipped = result.results.filter((r) => r.status === 'skipped').length;
        platform.completeRunRecord(dbRunId, {
          status: failed > 0 ? 'failed' : 'passed',
          durationMs: Date.now() - started,
          passed,
          failed,
          skipped,
        });
        activeRuns.set(immediateRunnerId, { status: 'complete', framework: fw });
      } catch (err) {
        console.error('Background runner error:', err);
        platform.completeRunRecord(dbRunId, {
          status: 'error',
          durationMs: Date.now() - started,
        });
        activeRuns.set(immediateRunnerId, { status: 'error', framework: fw });
      }
    })();
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
