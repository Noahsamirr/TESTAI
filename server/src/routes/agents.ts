/**
 * @route /api/agents
 * @description AI Agent orchestration endpoints.
 *
 * Endpoints:
 *   GET  /api/agents           — List all registered agents
 *   POST /api/agents/run       — Run a specific agent capability
 *   POST /api/agents/nl-tests  — Natural language → executable tests
 *   POST /api/agents/heal      — Self-heal a broken selector
 *   POST /api/agents/investigate — Bug root cause analysis
 *   POST /api/agents/plan      — Generate test plan from requirements
 *   GET  /api/agents/runs      — Recent agent run history
 *   GET  /api/agents/runs/:id  — Get a specific run record
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import agentOrchestrator from '../services/agentOrchestrator';
import type { AgentCapabilityType } from '../../../packages/ai/agents/src/types';

const router = Router();

// Initialise agents on first load
agentOrchestrator.initialize();

// ─── GET /api/agents ──────────────────────────────────────────────────────────
router.get('/', (_req: Request, res: Response): void => {
  const agents = agentOrchestrator.listAgents();
  res.json({ agents, count: agents.length });
});

// ─── POST /api/agents/run ─────────────────────────────────────────────────────
router.post('/run', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { capability, input, description } = req.body as {
    capability: AgentCapabilityType;
    input: Record<string, unknown>;
    description?: string;
  };

  if (!capability || !input) {
    res.status(400).json({ error: "Fields 'capability' and 'input' are required." });
    return;
  }

  try {
    const record = await agentOrchestrator.runTask(capability, input, {
      userId: req.user?.userId,
      description,
    });
    res.json({ success: true, run: record });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Agent execution failed' });
  }
});

// ─── POST /api/agents/nl-tests ────────────────────────────────────────────────
router.post('/nl-tests', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { naturalLanguage, appContext, outputFormat, instructions, sessionId } = req.body as {
    naturalLanguage: string;
    appContext?: Record<string, unknown>;
    outputFormat?: string;
    instructions?: string;
    sessionId?: string;
  };

  if (!naturalLanguage?.trim()) {
    res.status(400).json({ error: "'naturalLanguage' is required." });
    return;
  }

  try {
    const record = await agentOrchestrator.generateFromNaturalLanguage(naturalLanguage, {
      appContext,
      outputFormat,
      instructions,
      userId: req.user?.userId,
      sessionId,
    });
    res.json({ success: record.status === 'success', run: record });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'NL test generation failed' });
  }
});

// ─── POST /api/agents/heal ───────────────────────────────────────────────────
router.post('/heal', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { brokenSelector, domElements, elementContext, targetDescription } = req.body as {
    brokenSelector: string;
    domElements: unknown[];
    elementContext?: Record<string, string>;
    targetDescription?: string;
  };

  if (!brokenSelector?.trim()) {
    res.status(400).json({ error: "'brokenSelector' is required." });
    return;
  }

  try {
    const record = await agentOrchestrator.healSelector(brokenSelector, domElements ?? [], {
      elementContext,
      targetDescription,
      userId: req.user?.userId,
    });
    res.json({ success: record.status === 'success', run: record });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Self-healing failed' });
  }
});

// ─── POST /api/agents/investigate ────────────────────────────────────────────
router.post('/investigate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { errorLog, stackTrace, testCode, testName, retryCount } = req.body as {
    errorLog: string;
    stackTrace?: string;
    testCode?: string;
    testName?: string;
    retryCount?: number;
  };

  if (!errorLog?.trim() && !stackTrace?.trim()) {
    res.status(400).json({ error: "'errorLog' or 'stackTrace' is required." });
    return;
  }

  try {
    const record = await agentOrchestrator.investigateBug(errorLog ?? stackTrace ?? '', {
      stackTrace,
      testCode,
      testName,
      retryCount,
      userId: req.user?.userId,
    });
    res.json({ success: record.status === 'success', run: record });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Bug investigation failed' });
  }
});

// ─── POST /api/agents/plan ───────────────────────────────────────────────────
router.post('/plan', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { requirements, appType, techStack } = req.body as {
    requirements: string;
    appType?: string;
    techStack?: string;
  };

  if (!requirements?.trim()) {
    res.status(400).json({ error: "'requirements' is required." });
    return;
  }

  try {
    const record = await agentOrchestrator.planTests(requirements, {
      appType,
      techStack,
      userId: req.user?.userId,
    });
    res.json({ success: record.status === 'success', run: record });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Test planning failed' });
  }
});

// ─── GET /api/agents/runs ────────────────────────────────────────────────────
router.get('/runs', requireAuth, (req: Request, res: Response): void => {
  const limit = Math.min(parseInt(String(req.query['limit'] ?? '20'), 10), 100);
  const runs = agentOrchestrator.getRecentRuns(req.user?.userId, limit);
  res.json({ runs, count: runs.length });
});

// ─── GET /api/agents/runs/:id ────────────────────────────────────────────────
router.get('/runs/:id', requireAuth, (req: Request, res: Response): void => {
  const { id } = req.params;
  const runs = agentOrchestrator.getRecentRuns(req.user?.userId, 100);
  const run = runs.find((r) => r.id === id);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json({ run });
});

export default router;
