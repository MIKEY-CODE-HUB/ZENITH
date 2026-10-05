import { prisma } from '../config/prisma.js';

export class StreakAchievementService {
  /**
   * Calculates the user's current daily streak
   */
  public static async calculateStreak(userId: string): Promise<number> {
    const sessions = await prisma.focusSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        focusedDuration: { gte: 300 }, // at least 5 minutes to count as focus day
      },
      orderBy: { startTime: 'desc' },
      select: { startTime: true },
    });

    if (sessions.length === 0) return 0;

    const uniqueDates = new Set<string>();
    for (const s of sessions) {
      uniqueDates.add(s.startTime.toISOString().split('T')[0]);
    }

    const sortedDates = Array.from(uniqueDates).sort().reverse();
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // Streak must include today or yesterday to be active
    if (!sortedDates.includes(todayStr) && !sortedDates.includes(yesterdayStr)) {
      return 0;
    }

    let streak = 0;
    let expectedDate = sortedDates.includes(todayStr) ? new Date() : yesterdayDate;

    for (const dateStr of sortedDates) {
      const targetStr = expectedDate.toISOString().split('T')[0];
      if (dateStr === targetStr) {
        streak++;
        expectedDate = new Date(expectedDate.getTime() - 86400000);
      } else if (dateStr < targetStr) {
        break;
      }
    }

    return streak;
  }

  /**
   * Alias for calculateStreak
   */
  public static async calculateCurrentStreak(userId: string): Promise<number> {
    return this.calculateStreak(userId);
  }

  /**
   * Checks and awards newly unlocked achievements
   */
  public static async evaluateAchievements(userId: string): Promise<any[]> {
    const newlyUnlocked: any[] = [];
    const allAchievements = await prisma.achievement.findMany();
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

    const completedSessions = await prisma.focusSession.findMany({
      where: { userId, status: 'COMPLETED' },
    });

    const totalSessionsCount = completedSessions.length;
    const totalFocusedSeconds = completedSessions.reduce((acc, s) => acc + s.focusedDuration, 0);
    const maxScore = completedSessions.reduce((max, s) => Math.max(max, s.focusScore), 0);
    const hasDeepWork = completedSessions.some((s) => s.plannedDuration >= 90 && s.focusScore >= 85);

    const streak = await this.calculateStreak(userId);

    const uniqueDays = new Set(
      completedSessions.map((s) => s.startTime.toISOString().split('T')[0])
    ).size;

    for (const ach of allAchievements) {
      if (unlockedIds.has(ach.id)) continue;

      let qualify = false;
      if (ach.code === 'FIRST_SESSION' && totalSessionsCount >= 1) qualify = true;
      if (ach.code === 'FOCUS_STARTER' && totalSessionsCount >= 5) qualify = true;
      if (ach.code === 'SEVEN_DAY_STREAK' && streak >= 7) qualify = true;
      if (ach.code === 'FOCUS_MASTER' && maxScore >= 90) qualify = true;
      if (ach.code === 'DEEP_WORK' && hasDeepWork) qualify = true;
      if (ach.code === 'TEN_HOURS' && totalFocusedSeconds >= 36000) qualify = true;
      if (ach.code === 'CONSISTENCY_KING' && uniqueDays >= 30) qualify = true;

      if (qualify) {
        const ua = await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
          },
          include: { achievement: true },
        });
        newlyUnlocked.push(ua.achievement);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Evaluates achievements after a focus session concludes
   */
  public static async evaluateSessionAchievements(userId: string, _session?: any): Promise<any[]> {
    return this.evaluateAchievements(userId);
  }
}
