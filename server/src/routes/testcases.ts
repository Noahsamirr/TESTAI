import { Router, Request, Response } from 'express';
import { getTestCases, deleteTestCase } from '../db/queries';
import { param } from '../utils/params';

const router = Router();

router.get('/:sessionId', (req: Request, res: Response) => {
  try {
    const cases = getTestCases(param(req.params.sessionId));
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    deleteTestCase(param(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test case' });
  }
});

export default router;
