import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';

export class AchievementController {
  public static async getAchievements(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      // Ensure default canonical achievements exist in DB
      let allAchievements = await prisma.achievement.findMany({ orderBy: { requirementCount: 'asc' } });
      if (allAchievements.length === 0) {
        const defaultAchievements = [
          { code: 'FIRST_SESSION', title: 'First Step', description: 'Complete your first focus session.', icon: '🎯', category: 'SESSIONS', requirementCount: 1 },
          { code: 'FOCUS_STARTER', title: 'Focus Starter', description: 'Complete 5 full focus sessions.', icon: '⚡', category: 'SESSIONS', requirementCount: 5 },
          { code: 'SEVEN_DAY_STREAK', title: '7-Day Iron Streak', description: 'Focus for 7 consecutive days without breaking.', icon: '🔥', category: 'STREAK', requirementCount: 7 },
          { code: 'FOCUS_MASTER', title: 'Focus Master', description: 'Achieve a session focus score above 90%.', icon: '👑', category: 'SCORE', requirementCount: 90 },
          { code: 'DEEP_WORK', title: 'Deep Work Monk', description: 'Complete a 90-minute session with >85% focus.', icon: '🧘', category: 'DURATION', requirementCount: 90 },
          { code: 'BLOCKER_SHIELD', title: 'Iron Shield', description: 'Block 20+ distraction attempts during focus sessions.', icon: '🛡️', category: 'BLOCKER', requirementCount: 20 },
        ];
        for (const ach of defaultAchievements) {
          await prisma.achievement.upsert({ where: { code: ach.code }, update: ach, create: ach });
        }
        allAchievements = await prisma.achievement.findMany({ orderBy: { requirementCount: 'asc' } });
      }

      const userAchievements = userId
        ? await prisma.userAchievement.findMany({
            where: { userId },
            include: { achievement: true },
          })
        : [];

      const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt]));

      const achievementsWithStatus = allAchievements.map((ach) => ({
        ...ach,
        unlocked: unlockedMap.has(ach.id),
        unlockedAt: unlockedMap.get(ach.id) || null,
      }));

      res.json({
        success: true,
        achievements: achievementsWithStatus,
        unlockedCount: userAchievements.length,
        totalCount: allAchievements.length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
