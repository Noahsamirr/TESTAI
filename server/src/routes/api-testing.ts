/**
 * @route /api/api-testing
 * @description API Testing endpoints — REST, GraphQL, contract validation.
 *
 * Endpoints:
 *   POST /api/api-testing/request    — Run a single HTTP request with assertions
 *   POST /api/api-testing/suite      — Run a collection of chained requests
 *   POST /api/api-testing/graphql    — Execute a GraphQL query/mutation
 *   POST /api/api-testing/validate   — Validate an OpenAPI/Swagger spec
 *   GET  /api/api-testing/runs       — List recent API test runs
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import apiTester from '../services/apiTester';
import type { ApiRequest, GraphQLRequest } from '../services/apiTester';
import { getDB } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── POST /api/api-testing/request ───────────────────────────────────────────
router.post('/request', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const apiReq = req.body as ApiRequest;

  if (!apiReq.url?.trim() || !apiReq.method) {
    res.status(400).json({ error: "Fields 'url' and 'method' are required." });
    return;
  }

  try {
    const result = await apiTester.runRequest(apiReq);
    persistApiRun(req.user?.userId, [apiReq], [result]);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'API request failed' });
  }
});

// ─── POST /api/api-testing/suite ─────────────────────────────────────────────
router.post('/suite', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, requests } = req.body as { name: string; requests: ApiRequest[] };

  if (!requests?.length) {
    res.status(400).json({ error: "'requests' array is required and must not be empty." });
    return;
  }

  try {
    const suite = await apiTester.runSuite(name ?? 'API Test Suite', requests);
    persistApiRun(req.user?.userId, requests, suite.results);
    res.json({ success: true, suite });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'API suite failed' });
  }
});

// ─── POST /api/api-testing/graphql ───────────────────────────────────────────
router.post('/graphql', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const gqlReq = req.body as GraphQLRequest;

  if (!gqlReq.url?.trim() || !gqlReq.query?.trim()) {
    res.status(400).json({ error: "Fields 'url' and 'query' are required." });
    return;
  }

  try {
    const result = await apiTester.runGraphQL(gqlReq);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'GraphQL request failed' });
  }
});

// ─── POST /api/api-testing/validate ──────────────────────────────────────────
router.post('/validate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { specUrl } = req.body as { specUrl: string };

  if (!specUrl?.trim()) {
    res.status(400).json({ error: "'specUrl' is required (URL to OpenAPI/Swagger JSON)." });
    return;
  }

  try {
    const validation = await apiTester.validateOpenAPI(specUrl);
    res.json({ success: true, validation });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Validation failed' });
  }
});

// ─── GET /api/api-testing/runs ───────────────────────────────────────────────
router.get('/runs', requireAuth, (req: Request, res: Response): void => {
  const limit = Math.min(parseInt(String(req.query['limit'] ?? '20'), 10), 100);
  try {
    const db = getDB();
    const runs = db
      .prepare(`SELECT * FROM api_test_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
      .all(req.user!.userId, limit);
    res.json({ runs });
  } catch {
    res.json({ runs: [] });
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function persistApiRun(
  userId: string | undefined,
  _requests: ApiRequest[],
  results: import('../services/apiTester').ApiTestResult[]
): void {
  try {
    const db = getDB();
    const passed = results.filter((r) => r.passed).length;
    db.prepare(`
      INSERT INTO api_test_runs (id, user_id, name, total, passed, failed, results_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId ?? null,
      'API Test Run',
      results.length,
      passed,
      results.length - passed,
      JSON.stringify(results),
      new Date().toISOString()
    );
  } catch {
    // Table may not exist yet
  }
}

export default router;
