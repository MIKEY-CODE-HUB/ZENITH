import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';
import { StreakAchievementService } from '../services/streakAchievementService.js';

export class UserController {
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          settings: true,
          userAchievements: { include: { achievement: true } },
          focusSessions: {
            where: { status: 'COMPLETED' },
            orderBy: { startTime: 'desc' },
          },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const streak = await StreakAchievementService.calculateStreak(userId);
      const totalFocusedSeconds = user.focusSessions.reduce((acc, s) => acc + s.focusedDuration, 0);
      const avgScore = user.focusSessions.length > 0
        ? Math.round(user.focusSessions.reduce((acc, s) => acc + s.focusScore, 0) / user.focusSessions.length)
        : 0;
      const bestScore = user.focusSessions.reduce((max, s) => Math.max(max, s.focusScore), 0);
      const longestSessionSeconds = user.focusSessions.reduce((max, s) => Math.max(max, s.focusedDuration), 0);

      const { passwordHash: _, ...safeUser } = user;

      res.json({
        success: true,
        profile: {
          ...safeUser,
          currentStreak: streak,
          totalFocusedMinutes: Math.round(totalFocusedSeconds / 60),
          totalSessionsCount: user.focusSessions.length,
          averageFocusScore: avgScore,
          bestFocusScore: bestScore,
          longestSessionMinutes: Math.round(longestSessionSeconds / 60),
          recentSessions: user.focusSessions.slice(0, 5),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        idleThresholdSeconds,
        warningThresholdSeconds,
        autoStartTimer,
        cameraVisibility,
        activityVisibility,
        showFocusScore,
        distractionAlerts,
        sessionCompleteAlerts,
        streakReminders,
      } = req.body;

      const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: {
          idleThresholdSeconds: idleThresholdSeconds !== undefined ? parseInt(idleThresholdSeconds, 10) : undefined,
          warningThresholdSeconds: warningThresholdSeconds !== undefined ? parseInt(warningThresholdSeconds, 10) : undefined,
          autoStartTimer: autoStartTimer !== undefined ? Boolean(autoStartTimer) : undefined,
          cameraVisibility: cameraVisibility || undefined,
          activityVisibility: activityVisibility || undefined,
          showFocusScore: showFocusScore !== undefined ? Boolean(showFocusScore) : undefined,
          distractionAlerts: distractionAlerts !== undefined ? Boolean(distractionAlerts) : undefined,
          sessionCompleteAlerts: sessionCompleteAlerts !== undefined ? Boolean(sessionCompleteAlerts) : undefined,
          streakReminders: streakReminders !== undefined ? Boolean(streakReminders) : undefined,
        },
        create: {
          userId,
          idleThresholdSeconds: idleThresholdSeconds || 60,
          warningThresholdSeconds: warningThresholdSeconds || 10,
          autoStartTimer: autoStartTimer || false,
          cameraVisibility: cameraVisibility || 'Participants',
          activityVisibility: activityVisibility || 'Room',
          showFocusScore: showFocusScore !== undefined ? showFocusScore : true,
          distractionAlerts: distractionAlerts !== undefined ? distractionAlerts : true,
          sessionCompleteAlerts: sessionCompleteAlerts !== undefined ? sessionCompleteAlerts : true,
          streakReminders: streakReminders !== undefined ? streakReminders : true,
        },
      });

      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getLeaderboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { metric = 'score' } = req.query; // 'score', 'time', 'streak'

      const users = await prisma.user.findMany({
        include: {
          focusSessions: {
            where: { status: 'COMPLETED' },
            select: { focusedDuration: true, focusScore: true },
          },
        },
      });

      const leaderboardData = await Promise.all(
        users.map(async (u) => {
          const streak = await StreakAchievementService.calculateStreak(u.id);
          const totalFocusedMinutes = Math.round(
            u.focusSessions.reduce((acc, s) => acc + s.focusedDuration, 0) / 60
          );
          const avgScore = u.focusSessions.length > 0
            ? Math.round(u.focusSessions.reduce((acc, s) => acc + s.focusScore, 0) / u.focusSessions.length)
            : 0;

          return {
            id: u.id,
            name: u.name,
            username: u.username,
            avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
            preferredActivity: u.preferredActivity,
            streak,
            totalFocusedMinutes,
            averageScore: avgScore,
            sessionsCount: u.focusSessions.length,
          };
        })
      );

      // Sort according to selected metric
      let sorted = [...leaderboardData];
      if (metric === 'time') {
        sorted.sort((a, b) => b.totalFocusedMinutes - a.totalFocusedMinutes);
      } else if (metric === 'streak') {
        sorted.sort((a, b) => b.streak - a.streak);
      } else {
        // default average focus score
        sorted.sort((a, b) => b.averageScore - a.averageScore);
      }

      res.json({
        success: true,
        metric,
        leaderboard: sorted.slice(0, 20),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
