import './loadEnv';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initializeDB } from './db/schema';
import scriptRunner from './services/scriptRunner';
import performanceRunner from './services/performanceRunner';
import { WSEvent } from './types';

import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import testcasesRoutes from './routes/testcases';
import scriptsRoutes from './routes/scripts';
import runnerRoutes from './routes/runner';
import reportsRoutes from './routes/reports';
import platformRoutes from './routes/platform';
import visualRoutes from './routes/visual';
import performanceRoutes from './routes/performance';
import securityRoutes from './routes/security';
import aiEvalsRoutes from './routes/ai-evals';
import agentsRoutes from './routes/agents';
import apiTestingRoutes from './routes/api-testing';
import testDataRoutes from './routes/test-data';
import settingsRoutes from './routes/settings';
import claudeAgent from './services/claudeAgent';
import { getProviderSetupHint } from './services/providers';
import agentOrchestrator from './services/agentOrchestrator';

try {
  claudeAgent.getProviderInfo();
} catch (err) {
  const message = err instanceof Error ? err.message : 'AI provider configuration error';
  throw new Error(`${message}\n\n${getProviderSetupHint()}`);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/testcases', testcasesRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/runner', runnerRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/visual', visualRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/ai-evals', aiEvalsRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/api-testing', apiTestingRoutes);
app.use('/api/test-data', testDataRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (_req, res) => {
  const ai = claudeAgent.getProviderInfo();
  const agents = agentOrchestrator.listAgents();
  res.json({
    status: 'ok',
    service: 'TestMind AI',
    version: '3.0.0',
    modules: [
      'web', 'mobile', 'api-testing', 'visual', 'accessibility',
      'performance', 'security', 'ai-evals', 'ci-cd',
      'agents', 'test-data', 'self-healing', 'settings',
    ],
    ai: { provider: ai.provider, model: ai.model },
    agents: { count: agents.length, capabilities: agents.flatMap((a) => a.capabilities) },
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

initializeDB();

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const subscriptions = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.subscribe) {
        const runnerId = msg.subscribe;
        if (!subscriptions.has(runnerId)) {
          subscriptions.set(runnerId, new Set());
        }
        subscriptions.get(runnerId)!.add(ws);
      }
    } catch {
      // ignore invalid messages
    }
  });

  ws.on('close', () => {
    for (const subs of subscriptions.values()) {
      subs.delete(ws);
    }
  });
});

scriptRunner.onWSEvent((event: WSEvent) => {
  if ('runnerId' in event) {
    const subs = subscriptions.get(event.runnerId);
    if (subs) {
      const payload = JSON.stringify(event);
      for (const ws of subs) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  }
});

function broadcastRunnerEvent(event: WSEvent) {
  if (!('runnerId' in event)) return;
  const subs = subscriptions.get(event.runnerId);
  if (!subs) return;
  const payload = JSON.stringify(event);
  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

performanceRunner.on('log', (event: WSEvent) => broadcastRunnerEvent(event));
performanceRunner.on('complete', (event: WSEvent) => broadcastRunnerEvent(event));
performanceRunner.on('error', (event: WSEvent) => broadcastRunnerEvent(event));

server.listen(PORT, () => {
  console.log(`QualityForge AI Server v2.0 running on port ${PORT}`);
  console.log(`Modules: Web | Mobile | API | Visual/A11y | Performance | Security | AI-Evals | CI-CD`);
});
