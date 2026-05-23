import { Router, Request, Response } from 'express';
import claudeAgent from '../services/claudeAgent';
import { createSession, saveMessage, saveTestCases, saveScript, saveReport } from '../db/queries';
import { requireAuth } from '../middleware/auth';
import { assertHasTokens, consumeTokens, estimateTokens } from '../services/tokenService';

const router = Router();

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId: existingSessionId, message } = req.body;
    const userId = req.user!.userId;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const estimated = estimateTokens(message, '');
    assertHasTokens(userId, estimated);

    const sessionId = createSession(existingSessionId, userId);

    const response = await claudeAgent.chat(sessionId, message);
    saveMessage(sessionId, 'user', message);
    saveMessage(sessionId, 'assistant', response.message);

    const tokensUsed = estimateTokens(message, response.message);
    const usage = consumeTokens(userId, tokensUsed, 'chat');

    if (response.testCases?.length) {
      saveTestCases(sessionId, response.testCases);
    }

    if (response.script) {
      const scriptId = saveScript(sessionId, response.script);
      response.script.id = scriptId;
    }

    if (response.report) {
      saveReport(sessionId, response.report);
    }

    res.json({
      reply: response.message,
      testCases: response.testCases,
      script: response.script,
      report: response.report,
      phase: response.phase,
      sessionId,
      usage,
      tokensUsedThisMessage: tokensUsed,
    });
  } catch (error) {
    console.error('Chat error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to process chat message';
    const status = message.includes('token limit') ? 402 : 500;
    const hint =
      message.includes('PUTER_AUTH_TOKEN') || message.includes('Puter')
        ? ' Get a free token at https://puter.com/dashboard#account'
        : '';
    res.status(status).json({ error: message + hint });
  }
});

export default router;
