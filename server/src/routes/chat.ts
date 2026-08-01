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
      suggestedActions: response.suggestedActions,
      capabilitiesUsed: response.capabilitiesUsed,
      confidence: response.confidence,
    });
  } catch (error) {
    console.error('Chat error:', error);
    let message =
      error instanceof Error
        ? error.message
        : 'Failed to process chat message';
    let status = 500;
    if (message.includes('token limit')) status = 402;
    else if (message.includes('rate limit') || message.includes('429')) status = 429;
    const hint =
      message.includes('PUTER_AUTH_TOKEN') || message.includes('Puter')
        ? ' Get a free token at https://puter.com/dashboard#account'
        : status === 429
          ? ' Try again in a minute or set AI_PROVIDER=gemini in .env.'
          : '';
    res.status(status).json({ error: message + hint });
  }
});

export default router;
