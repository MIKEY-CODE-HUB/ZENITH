import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { FocusScoringService } from '../services/focusScoringService.js';
import { StreakAchievementService } from '../services/streakAchievementService.js';
import { PointService } from '../services/pointService.js';

const trackedEventTypes = new Set(['TAB_SWITCH', 'IDLE', 'FOCUSED', 'WINDOW_FOCUS', 'WARNING', 'BLOCK_ATTEMPT']);

export class SessionController {
  public static async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        roomId,
        category = 'EDUCATION',
        activityType = 'Deep Focus',
        specificActivity,
        atmosphere = 'Rainy Window',
        plannedDuration = 50,
        protectionEnabled = true,
      } = req.body;

      if (typeof protectionEnabled !== 'boolean') {
        res.status(400).json({ success: false, error: 'protectionEnabled must be a boolean.' });
        return;
      }
      const duration = Number(plannedDuration);
      if (!Number.isInteger(duration) || duration < 1 || duration > 240) {
        res.status(400).json({ success: false, error: 'Focus duration must be between 1 and 240 minutes.' });
        return;
      }
      const session = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'membership_' + userId}))`;
        const membership = roomId ? await tx.roomParticipant.findUnique({
          where: { roomId_userId: { roomId, userId } }, include: { room: true },
        }) : null;
        if (roomId && membership?.status !== 'ACTIVE') return null;
        if (membership?.room.category === 'INTERACTION') {
          const auth = await tx.interactionAuthorization.findFirst({
            where: { roomId, userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
          });
          if (!auth) return null;
        }
        const active = await tx.focusSession.findFirst({
          where: { userId, roomId: roomId || null, status: 'ACTIVE' },
          orderBy: { startTime: 'desc' },
        });
        if (active) return active;

        // Abandon any previous orphan active session
        await tx.focusSession.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'ABANDONED', endTime: new Date() },
        });
        await tx.blockerSession.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'COMPLETED', endedAt: new Date() },
        });

        const session = await tx.focusSession.create({
          data: {
            userId,
            roomId: roomId || null,
            category: membership?.room.category ?? category,
            activityType,
            specificActivity: specificActivity || activityType,
            atmosphere,
            plannedDuration: duration,
            protectionEnabled,
            status: 'ACTIVE',
            startTime: new Date(),
          },
        });

        if (protectionEnabled) {
          await tx.blockerSession.upsert({
            where: { focusSessionId: session.id },
            update: {
              mode: 'STRICT',
              status: 'ACTIVE',
              startedAt: new Date(),
              endedAt: null,
            },
            create: {
              userId,
              focusSessionId: session.id,
              mode: 'STRICT',
              status: 'ACTIVE',
            },
          });
        }

        // Log session start event
        await tx.focusEvent.create({
          data: {
            sessionId: session.id,
            userId,
            eventType: 'SESSION_START',
            startTime: new Date(),
            duration: 0,
          },
        });

        return session;
      });
      if (!session) {
        res.status(403).json({ success: false, error: 'Join the room before starting a focus session.' });
        return;
      }
      res.status(201).json({ success: true, session });
    } catch (error: any) {
      console.error('Error starting session:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to start session' });
    }
  }

  public static async logEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { sessionId } = req.params;
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({ success: false, error: 'Events array is required' });
        return;
      }

      const session = await prisma.focusSession.findFirst({
        where: { id: sessionId, userId },
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const createData = events.map((e: any) => ({
        sessionId,
        userId,
        eventType: e.eventType,
        startTime: e.startTime ? new Date(e.startTime) : new Date(),
        endTime: e.endTime ? new Date(e.endTime) : null,
        duration: e.duration || 0,
        metadata: e.metadata ? JSON.stringify(e.metadata) : null,
      }));

      await prisma.focusEvent.createMany({
        data: createData,
      });

      res.json({ success: true, message: 'Events logged successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to log events' });
    }
  }

  public static async endSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { sessionId } = req.params;
      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'membership_' + userId}))`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'finish_' + sessionId}))`;
        const session = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
        if (!session || session.status !== 'ACTIVE') return { session };

        const elapsed = Math.max(0, Math.min(session.plannedDuration * 60,
          Math.floor((Date.now() - session.startTime.getTime()) / 1000)));
        const bounded = (value: unknown, max = elapsed) =>
          typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : 0;
        const distractedDuration = bounded(req.body?.distractedDuration);
        const idleDuration = bounded(req.body?.idleDuration, elapsed - distractedDuration);
        const focusedDuration = bounded(req.body?.focusedDuration, elapsed - distractedDuration - idleDuration);
        const tabSwitchCount = bounded(req.body?.tabSwitchCount, 10000);
        const warningCount = bounded(req.body?.warningCount, 10000);
        const blockAttemptCount = bounded(req.body?.blockAttemptCount, 10000);
        const longestFocusStreak = bounded(req.body?.longestFocusStreak, focusedDuration);
        const notes = typeof req.body?.notes === 'string' ? req.body.notes : null;

        // Count block attempts recorded in DB
        const dbBlockAttempts = await tx.blockAttempt.count({
          where: { sessionId },
        });
        const totalBlockAttempts = Math.max(dbBlockAttempts, blockAttemptCount);

        // Server-side authoritative score calculation
        const scoreBreakdown = FocusScoringService.calculateScore({
          plannedDurationMinutes: session.plannedDuration,
          focusedDurationSeconds: focusedDuration,
          distractedDurationSeconds: distractedDuration,
          idleDurationSeconds: idleDuration,
          tabSwitchCount,
          warningCount,
          blockAttemptCount: totalBlockAttempts,
        });

        // Award Points Authoritatively via PointService
        const pointReward = await PointService.awardSessionPoints(
          userId,
          sessionId,
          focusedDuration,
          scoreBreakdown.finalScore,
          session.category,
          tx
        );

        const updatedSession = await tx.focusSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            endTime: new Date(),
            focusedDuration: Math.round(focusedDuration),
            distractedDuration: Math.round(distractedDuration),
            idleDuration: Math.round(idleDuration),
            tabSwitchCount: Math.round(tabSwitchCount),
            warningCount: Math.round(warningCount),
            blockAttemptCount: totalBlockAttempts,
            longestFocusStreak: Math.round(longestFocusStreak),
            baseScore: scoreBreakdown.baseScore,
            penaltyScore: scoreBreakdown.totalPenalty,
            focusScore: scoreBreakdown.finalScore,
            pointsEarned: pointReward.totalAwarded,
            notes: notes || null,
          },
          include: { room: true, blockAttempts: true },
        });

        // Complete BlockerSession if active
        await tx.blockerSession.updateMany({
          where: { focusSessionId: sessionId },
          data: { status: 'COMPLETED', endedAt: new Date() },
        });

        if (Array.isArray(req.body?.events)) {
          const end = session.startTime.getTime() + (elapsed + 1) * 1000;
          const events = req.body.events.slice(0, 1000).flatMap((event: unknown) => {
            if (!event || typeof event !== 'object' || !('eventType' in event) ||
                typeof event.eventType !== 'string' || !trackedEventTypes.has(event.eventType) ||
                !('startTime' in event) || typeof event.startTime !== 'string') return [];
            const time = Date.parse(event.startTime);
            if (!Number.isFinite(time) || time < session.startTime.getTime() || time > end) return [];
            return [{
              sessionId, userId, eventType: event.eventType, startTime: new Date(time),
              metadata: 'metadata' in event && typeof event.metadata === 'string' ? event.metadata.slice(0, 400) : null,
            }];
          });
          if (events.length) await tx.focusEvent.createMany({ data: events });
        }

        // Log session end event
        await tx.focusEvent.create({
          data: {
            sessionId,
            userId,
            eventType: 'SESSION_END',
            startTime: new Date(),
            duration: Math.round(focusedDuration),
            metadata: JSON.stringify({ ...scoreBreakdown, points: pointReward }),
          },
        });

        return { session: updatedSession, scoreBreakdown, pointReward };
      });
      if (!result.session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }
      if (!result.scoreBreakdown || !result.pointReward) {
        if (result.session.status !== 'COMPLETED') {
          res.status(409).json({ success: false, error: 'Session is no longer active' });
          return;
        }
        res.json({ success: true, session: result.session, pointsAwarded: result.session.pointsEarned });
        return;
      }
      const { session: updatedSession, scoreBreakdown, pointReward } = result;

      // Evaluate Achievements & Streaks
      const newAchievements = await StreakAchievementService.evaluateSessionAchievements(userId, updatedSession);
      const currentStreak = await StreakAchievementService.calculateCurrentStreak(userId);
      const pointSummary = await PointService.getUserPointSummary(userId);

      // Compare against previous session
      const previousSession = await prisma.focusSession.findFirst({
        where: {
          userId,
          status: 'COMPLETED',
          id: { not: sessionId },
        },
        orderBy: { createdAt: 'desc' },
      });

      const scoreDelta = previousSession ? updatedSession.focusScore - previousSession.focusScore : 0;
      const scoreImprovementPercent = previousSession && previousSession.focusScore > 0
        ? Math.round(((updatedSession.focusScore - previousSession.focusScore) / previousSession.focusScore) * 100)
        : null;

      res.json({
        success: true,
        session: updatedSession,
        scoreBreakdown,
        pointsAwarded: pointReward.totalAwarded,
        pointsBreakdown: pointReward.breakdown,
        weeklyPoints: pointSummary.weeklyPoints,
        lifetimePoints: pointSummary.lifetimePoints,
        newAchievements,
        currentStreak,
        comparison: {
          previousScore: previousSession?.focusScore || null,
          scoreDelta: Math.round(scoreDelta * 10) / 10,
          scoreImprovementPercent,
        },
      });
    } catch (error: any) {
      console.error('Error ending session:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to complete session' });
    }
  }

  public static async abandonSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    try {
      const session = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'membership_' + userId}))`;
        const current = await tx.focusSession.findFirst({ where: { id: sessionId, userId } });
        if (!current || current.status !== 'ACTIVE') return current;
        const endTime = new Date();
        const notes = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) || null : null;
        const result = await tx.focusSession.updateMany({
          where: { id: sessionId, status: 'ACTIVE' }, data: { status: 'ABANDONED', endTime, notes },
        });
        if (result.count > 0) {
          await tx.blockerSession.updateMany({
            where: { focusSessionId: sessionId, status: 'ACTIVE' }, data: { status: 'COMPLETED', endedAt: endTime },
          });
        }
        return await tx.focusSession.findUnique({ where: { id: sessionId } });
      });
      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found.' });
        return;
      }
      if (session.status !== 'ABANDONED') {
        res.status(409).json({ success: false, error: 'This session has already finished.' });
        return;
      }
      res.json({ success: true, session });
    } catch {
      res.status(500).json({ success: false, error: 'Could not discard your session.' });
    }
  }

  public static async getActiveSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const session = await prisma.focusSession.findFirst({
        where: { userId: req.user!.userId, status: 'ACTIVE' },
        orderBy: { startTime: 'desc' },
      });
      res.setHeader('Cache-Control', 'no-store').json({ success: true, session });
    } catch {
      res.status(500).json({ success: false, error: 'Could not restore your focus session.' });
    }
  }

  public static async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { activity, page = '1', limit = '10' } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      const where: any = { userId, status: 'COMPLETED' };
      if (activity && activity !== 'All') {
        where.activityType = activity;
      }

      const [sessions, total] = await Promise.all([
        prisma.focusSession.findMany({
          where,
          orderBy: { startTime: 'desc' },
          skip,
          take: limitNum,
          include: { room: true },
        }),
        prisma.focusSession.count({ where }),
      ]);

      res.json({
        success: true,
        sessions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch history' });
    }
  }

  public static async getSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const session = await prisma.focusSession.findFirst({
        where: { id, userId },
        include: {
          room: true,
          events: { orderBy: { startTime: 'asc' } },
          blockAttempts: { orderBy: { timestamp: 'asc' } },
        },
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      res.json({ success: true, session });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch session' });
    }
  }
}
