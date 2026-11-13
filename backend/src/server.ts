import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { randomUUID } from 'node:crypto';
import cron from 'node-cron';
import { prisma } from './config/prisma.js';
import { logger } from './config/logger.js';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import achievementRoutes from './routes/achievementRoutes.js';
import userRoutes from './routes/userRoutes.js';
import blockerRoutes from './routes/blockerRoutes.js';
import interactionRoutes from './routes/interactionRoutes.js';
import pointRoutes from './routes/pointRoutes.js';
import moderationRoutes from './routes/moderationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeSocket } from './sockets/socketManager.js';
import { validateJwtSecret } from './utils/jwt.js';

// Enforce strong JWT secret configuration
validateJwtSecret();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

app.use((req, res, next) => {
  const incomingId = req.get('x-request-id');
  const requestId = incomingId && /^[a-f0-9-]{36}$/i.test(incomingId) ? incomingId : randomUUID();
  const started = Date.now();
  res.setHeader('x-request-id', requestId);
  res.on('finish', () => logger.log(res.statusCode >= 500 ? 'error' : 'info', 'http.request', {
    requestId, method: req.method, route: req.route ? req.baseUrl + req.route.path : 'unmatched',
    status: res.statusCode, durationMs: Date.now() - started,
  }));
  next();
});

// Global Middleware
app.use(
  cors({
    origin: [CLIENT_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ZENITH Immersion Platform API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'unavailable', code: 'DATABASE_UNAVAILABLE' });
  }
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blocker', blockerRoutes);
app.use('/api/interaction', interactionRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/moderation', moderationRoutes);

// Global Error Handler
app.use(errorHandler);

const io = initializeSocket(server);

let reconciliation: cron.ScheduledTask | null = null;
if (process.env.NODE_ENV !== 'test') {
  reconciliation = cron.schedule('* * * * *', async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(hashtext('zenith.reconcile.expired_blockers')) AS acquired
        `;
        if (!lock.acquired) return;
        const expiredSessions = await tx.$executeRaw`
          UPDATE focus_sessions SET status = 'ABANDONED', "endTime" = NOW(), "updatedAt" = NOW()
          WHERE status = 'ACTIVE'
            AND NOW() > "startTime" + (GREATEST(30, "plannedDuration") + 15) * INTERVAL '1 minute'
        `;
        const updated = await tx.$executeRaw`
          UPDATE blocker_sessions AS blocker
          SET status = 'COMPLETED', "endedAt" = NOW()
          FROM focus_sessions AS focus
          WHERE blocker."focusSessionId" = focus.id AND blocker.status = 'ACTIVE'
            AND (focus.status <> 'ACTIVE'
              OR NOW() > focus."startTime" + (GREATEST(30, focus."plannedDuration") + 15) * INTERVAL '1 minute')
        `;
        const releasedSeats = await tx.$executeRaw`
          UPDATE room_participants AS member SET status = 'LEFT', "leftAt" = NOW()
          WHERE member.status = 'ACTIVE' AND member."joinedAt" < NOW() - INTERVAL '5 minutes'
            AND NOT EXISTS (
              SELECT 1 FROM focus_sessions AS focus
              WHERE focus."userId" = member."userId" AND focus."roomId" = member."roomId"
                AND focus.status = 'ACTIVE'
            )
        `;
        const expiredBallots = await tx.$executeRaw`
          UPDATE moderation_incidents
          SET status = 'INCONCLUSIVE', "resolvedAt" = NOW(),
              "resolutionReason" = 'Voting window expired without satisfying quorum or majority threshold.'
          WHERE status IN ('OPEN', 'VOTING') AND "votingExpiresAt" <= NOW()
        `;
        if (updated || expiredSessions || releasedSeats || expiredBallots) {
          logger.info('sessions.reconciled', { completedBlockers: updated, expiredSessions, releasedSeats, expiredBallots });
        }
      });
    } catch (err) {
      logger.error('blocker.reconciliation_failed', { errorType: err instanceof Error ? err.name : 'UnknownError' });
    }
  }, { noOverlap: true });

  server.listen(PORT, () => logger.info('server.started', { port: PORT }));
}

server.on('close', () => { if (reconciliation) void reconciliation.stop(); });
process.once('SIGTERM', () => io.close());

export { app, server, io };
