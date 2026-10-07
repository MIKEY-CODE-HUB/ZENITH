import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { StreakAchievementService } from '../services/streakAchievementService.js';
import { PointService } from '../services/pointService.js';
import { prisma } from '../config/prisma.js';

export class AnalyticsController {
  public static async getDaily(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await AnalyticsService.getDailyAnalytics(userId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getWeekly(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await AnalyticsService.getWeeklyAnalytics(userId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getMonthly(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await AnalyticsService.getMonthlyAnalytics(userId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getActivityBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await AnalyticsService.getActivityBreakdown(userId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getRewardingAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || (await AnalyticsService.getDailyAnalytics('guest')).sessions[0]?.userId || '';
      const fallbackUser = userId || (await prisma.user.findFirst())?.id || '';
      const data = await AnalyticsService.getRewardingAnalytics(fallbackUser);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.json({
          success: true,
          stats: {
            todayFocusedMinutes: 0,
            todayDistractedMinutes: 0,
            todayFocusScore: 100,
            todaySessionsCount: 0,
            weeklyPoints: 0,
            lifetimePoints: 0,
            categoryMinutes: {
              education: 0,
              exercise: 0,
              sideQuest: 0,
              interaction: 0,
            },
            currentStreak: 0,
            totalLifetimeFocusedMinutes: 0,
            lifetimeAvgScore: 0,
            totalLifetimeSessions: 0,
            recentSessions: [],
            insights: [],
          },
        });
        return;
      }
      const daily = await AnalyticsService.getDailyAnalytics(userId);
      const streak = await StreakAchievementService.calculateStreak(userId);
      const points = await PointService.getUserPointSummary(userId);

      const recentSessions = await prisma.focusSession.findMany({
        where: { userId, status: 'COMPLETED' },
        include: { room: { select: { name: true, roomCode: true, category: true } } },
        orderBy: { startTime: 'desc' },
        take: 5,
      });

      const allCompleted = await prisma.focusSession.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { focusedDuration: true, focusScore: true },
      });

      const totalLifetimeFocusedMinutes = Math.round(
        allCompleted.reduce((acc, s) => acc + s.focusedDuration, 0) / 60
      );
      const lifetimeAvgScore = allCompleted.length > 0
        ? Math.round(allCompleted.reduce((acc, s) => acc + s.focusScore, 0) / allCompleted.length)
        : 0;

      const insights = await AnalyticsService.getProductivityInsights(userId);

      res.json({
        success: true,
        stats: {
          todayFocusedMinutes: Math.round(daily.totalFocusedSeconds / 60),
          todayDistractedMinutes: Math.round(daily.totalDistractedSeconds / 60),
          todayFocusScore: daily.averageFocusScore,
          todaySessionsCount: daily.sessionsCount,
          weeklyPoints: points.weeklyPoints,
          lifetimePoints: points.lifetimePoints,
          categoryMinutes: {
            education: Math.round(daily.categorySeconds.education / 60),
            exercise: Math.round(daily.categorySeconds.exercise / 60),
            sideQuest: Math.round(daily.categorySeconds.sideQuest / 60),
            interaction: Math.round(daily.categorySeconds.interaction / 60),
          },
          currentStreak: streak,
          totalLifetimeFocusedMinutes,
          lifetimeAvgScore,
          totalLifetimeSessions: allCompleted.length,
          recentSessions,
          insights,
        },
      });
    } catch (error: any) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
