import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';

export class AchievementController {
  public static async getAchievements(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const [allAchievements, userAchievements] = await Promise.all([
        prisma.achievement.findMany({ orderBy: { requirementCount: 'asc' } }),
        prisma.userAchievement.findMany({
          where: { userId },
          include: { achievement: true },
        }),
      ]);

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
