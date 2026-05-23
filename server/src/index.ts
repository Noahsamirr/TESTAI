import './loadEnv';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initializeDB } from './db/schema';
import scriptRunner from './services/scriptRunner';
import { WSEvent } from './types';

import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import testcasesRoutes from './routes/testcases';
import scriptsRoutes from './routes/scripts';
import runnerRoutes from './routes/runner';
import reportsRoutes from './routes/reports';
import platformRoutes from './routes/platform';
import claudeAgent from './services/claudeAgent';
import { getProviderSetupHint } from './services/providers';

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
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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

app.get('/api/health', (_req, res) => {
  const ai = claudeAgent.getProviderInfo();
  res.json({
    status: 'ok',
    service: 'TestMind AI',
    ai: { provider: ai.provider, model: ai.model },
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

server.listen(PORT, () => {
  console.log(`TestMind AI Server running on port ${PORT}`);
});
