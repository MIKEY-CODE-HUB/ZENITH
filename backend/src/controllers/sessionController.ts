import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { FocusScoringService } from '../services/focusScoringService.js';
import { StreakAchievementService } from '../services/streakAchievementService.js';
import { PointService } from '../services/pointService.js';

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
      } = req.body;

      // Abandon any previous orphan active session
      await prisma.focusSession.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'ABANDONED', endTime: new Date() },
      });
      await prisma.blockerSession.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });

      const session = await prisma.focusSession.create({
        data: {
          userId,
          roomId: roomId || null,
          category,
          activityType,
          specificActivity: specificActivity || activityType,
          atmosphere,
          plannedDuration: parseInt(plannedDuration, 10) || 50,
          status: 'ACTIVE',
          startTime: new Date(),
        },
      });

      // Automatically activate BlockerSession for live-status synchronization
      await prisma.blockerSession.upsert({
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

      // Log session start event
      await prisma.focusEvent.create({
        data: {
          sessionId: session.id,
          userId,
          eventType: 'SESSION_START',
          startTime: new Date(),
          duration: 0,
        },
      });

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
      const {
        focusedDuration = 0,
        distractedDuration = 0,
        idleDuration = 0,
        tabSwitchCount = 0,
        warningCount = 0,
        blockAttemptCount = 0,
        longestFocusStreak = 0,
        notes,
      } = req.body;

      const session = await prisma.focusSession.findFirst({
        where: { id: sessionId, userId },
      });

      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      // Count block attempts recorded in DB
      const dbBlockAttempts = await prisma.blockAttempt.count({
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
        session.category
      );

      const updatedSession = await prisma.focusSession.update({
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
      await prisma.blockerSession.updateMany({
        where: { focusSessionId: sessionId },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });

      // Log session end event
      await prisma.focusEvent.create({
        data: {
          sessionId,
          userId,
          eventType: 'SESSION_END',
          startTime: new Date(),
          duration: Math.round(focusedDuration),
          metadata: JSON.stringify({ ...scoreBreakdown, points: pointReward }),
        },
      });

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
