import { prisma } from '../config/prisma.js';

export class AnalyticsService {
  /**
   * Daily focus summary
   */
  public static async getDailyAnalytics(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessionsToday = await prisma.focusSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        startTime: { gte: today, lt: tomorrow },
      },
    });

    const totalFocusedSeconds = sessionsToday.reduce((acc, s) => acc + s.focusedDuration, 0);
    const totalDistractedSeconds = sessionsToday.reduce((acc, s) => acc + s.distractedDuration, 0);
    const totalIdleSeconds = sessionsToday.reduce((acc, s) => acc + s.idleDuration, 0);
    const avgScore = sessionsToday.length > 0
      ? Math.round(sessionsToday.reduce((acc, s) => acc + s.focusScore, 0) / sessionsToday.length)
      : 0;

    const educationSeconds = sessionsToday
      .filter((s) => s.category === 'EDUCATION' || !s.category)
      .reduce((acc, s) => acc + s.focusedDuration, 0);
    const exerciseSeconds = sessionsToday
      .filter((s) => s.category === 'EXERCISE')
      .reduce((acc, s) => acc + s.focusedDuration, 0);
    const sideQuestSeconds = sessionsToday
      .filter((s) => s.category === 'SIDE_QUEST')
      .reduce((acc, s) => acc + s.focusedDuration, 0);
    const interactionSeconds = sessionsToday
      .filter((s) => s.category === 'INTERACTION')
      .reduce((acc, s) => acc + s.focusedDuration, 0);

    return {
      date: today.toISOString().split('T')[0],
      sessionsCount: sessionsToday.length,
      totalFocusedSeconds,
      totalDistractedSeconds,
      totalIdleSeconds,
      averageFocusScore: avgScore,
      categorySeconds: {
        education: educationSeconds,
        exercise: exerciseSeconds,
        sideQuest: sideQuestSeconds,
        interaction: interactionSeconds,
      },
      sessions: sessionsToday,
    };
  }

  /**
   * Weekly focus summary (Last 7 days)
   */
  public static async getWeeklyAnalytics(userId: string) {
    const days: any[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toISOString().split('T')[0];

      const sessions = await prisma.focusSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          startTime: { gte: d, lt: nextD },
        },
      });

      const focusedMinutes = Math.round(sessions.reduce((acc, s) => acc + s.focusedDuration, 0) / 60);
      const distractedMinutes = Math.round(sessions.reduce((acc, s) => acc + s.distractedDuration, 0) / 60);
      const avgScore = sessions.length > 0
        ? Math.round(sessions.reduce((acc, s) => acc + s.focusScore, 0) / sessions.length)
        : 0;

      days.push({
        day: dayName,
        date: dateStr,
        focusedMinutes,
        distractedMinutes,
        focusScore: avgScore,
        sessionsCount: sessions.length,
      });
    }

    return days;
  }

  /**
   * Monthly focus trends (Last 30 days grouped in 5-day intervals or daily)
   */
  public static async getMonthlyAnalytics(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await prisma.focusSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        startTime: { gte: thirtyDaysAgo },
      },
      orderBy: { startTime: 'asc' },
    });

    const dailyMap: Record<string, { focusedMinutes: number; distractedMinutes: number; scoreSum: number; count: number }> = {};

    for (const s of sessions) {
      const dateStr = s.startTime.toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { focusedMinutes: 0, distractedMinutes: 0, scoreSum: 0, count: 0 };
      }
      dailyMap[dateStr].focusedMinutes += Math.round(s.focusedDuration / 60);
      dailyMap[dateStr].distractedMinutes += Math.round(s.distractedDuration / 60);
      dailyMap[dateStr].scoreSum += s.focusScore;
      dailyMap[dateStr].count += 1;
    }

    return Object.entries(dailyMap).map(([date, data]) => ({
      date,
      focusedMinutes: data.focusedMinutes,
      distractedMinutes: data.distractedMinutes,
      avgScore: Math.round(data.scoreSum / data.count),
      sessionsCount: data.count,
    }));
  }

  /**
   * Activity breakdown
   */
  public static async getActivityBreakdown(userId: string) {
    const sessions = await prisma.focusSession.findMany({
      where: { userId, status: 'COMPLETED' },
    });

    const activityMap: Record<string, { focusedSeconds: number; scoreSum: number; count: number }> = {};

    for (const s of sessions) {
      const act = s.activityType || 'Other';
      if (!activityMap[act]) {
        activityMap[act] = { focusedSeconds: 0, scoreSum: 0, count: 0 };
      }
      activityMap[act].focusedSeconds += s.focusedDuration;
      activityMap[act].scoreSum += s.focusScore;
      activityMap[act].count += 1;
    }

    const totalSeconds = Object.values(activityMap).reduce((acc, v) => acc + v.focusedSeconds, 0);

    return Object.entries(activityMap).map(([activity, data]) => ({
      activity,
      focusedMinutes: Math.round(data.focusedSeconds / 60),
      percentage: totalSeconds > 0 ? Math.round((data.focusedSeconds / totalSeconds) * 100) : 0,
      averageScore: Math.round(data.scoreSum / data.count),
      sessionsCount: data.count,
    }));
  }

  /**
   * Productivity Insights calculation based on stored sessions
   */
  public static async getProductivityInsights(userId: string) {
    const sessions = await prisma.focusSession.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { startTime: 'desc' },
      take: 50,
    });

    const insights: string[] = [];

    if (sessions.length < 2) {
      return [
        'Complete at least 3 focus sessions to generate your personalized behavioral focus insights.',
        'Keep your camera on during focus rooms to boost peer accountability by an average of 28%.',
      ];
    }

    // 1. Best Activity
    const activityScores: Record<string, { sum: number; count: number }> = {};
    for (const s of sessions) {
      if (!activityScores[s.activityType]) activityScores[s.activityType] = { sum: 0, count: 0 };
      activityScores[s.activityType].sum += s.focusScore;
      activityScores[s.activityType].count++;
    }
    const bestActivity = Object.entries(activityScores)
      .map(([act, data]) => ({ act, avg: Math.round(data.sum / data.count), count: data.count }))
      .filter((a) => a.count >= 2)
      .sort((a, b) => b.avg - a.avg)[0];

    if (bestActivity) {
      insights.push(`Your strongest focus activity is ${bestActivity.act} with an average score of ${bestActivity.avg}%.`);
    }

    // 2. Best Time of Day
    const morningSessions = sessions.filter((s) => {
      const h = new Date(s.startTime).getHours();
      return h >= 6 && h < 12;
    });
    const afternoonSessions = sessions.filter((s) => {
      const h = new Date(s.startTime).getHours();
      return h >= 12 && h < 18;
    });
    const eveningSessions = sessions.filter((s) => {
      const h = new Date(s.startTime).getHours();
      return h >= 18 || h < 6;
    });

    const avg = (list: any[]) => list.length > 0 ? list.reduce((a, b) => a + b.focusScore, 0) / list.length : 0;
    const mAvg = avg(morningSessions);
    const aAvg = avg(afternoonSessions);
    const eAvg = avg(eveningSessions);

    if (mAvg > aAvg && mAvg > eAvg && morningSessions.length >= 2) {
      insights.push(`You are significantly more focused during morning sessions (avg ${Math.round(mAvg)}% score).`);
    } else if (eAvg > mAvg && eveningSessions.length >= 2) {
      insights.push(`Night owl flow: your evening focus sessions average ${Math.round(eAvg)}% focus efficiency.`);
    }

    // 3. Duration impact
    const shortSessions = sessions.filter((s) => s.plannedDuration <= 30);
    const longSessions = sessions.filter((s) => s.plannedDuration >= 60);
    if (shortSessions.length >= 2 && longSessions.length >= 2) {
      const sScore = avg(shortSessions);
      const lScore = avg(longSessions);
      if (sScore > lScore + 10) {
        insights.push(`Your focus score drops by ~${Math.round(sScore - lScore)}% in sessions over 50 minutes. Consider 25m or 50m intervals.`);
      }
    }

    // 4. Distraction summary
    const avgDistractionMinutes = Math.round(
      sessions.reduce((acc, s) => acc + s.distractedDuration, 0) / (sessions.length * 60)
    );
    insights.push(`You lose an average of ${avgDistractionMinutes} minutes to tab-switching and idle distractions per session.`);

    return insights;
  }

  /**
   * Rewarding Analytics: Focus Overview, Day-of-week, Streaks, WoW delta, Top distractions, Records, Personalized insights
   */
  public static async getRewardingAnalytics(userId: string) {
    const allCompletedSessions = await prisma.focusSession.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { startTime: 'desc' },
    });

    const totalFocusedSeconds = allCompletedSessions.reduce((acc, s) => acc + s.focusedDuration, 0);
    const totalDistractedSeconds = allCompletedSessions.reduce((acc, s) => acc + s.distractedDuration, 0);
    const totalIdleSeconds = allCompletedSessions.reduce((acc, s) => acc + s.idleDuration, 0);
    const totalTimeTracked = totalFocusedSeconds + totalDistractedSeconds + totalIdleSeconds;

    const totalSessions = allCompletedSessions.length;
    const totalFocusedMinutes = Math.round(totalFocusedSeconds / 60);
    const avgSessionMinutes = totalSessions > 0 ? Math.round(totalFocusedMinutes / totalSessions) : 0;
    const focusRate = totalTimeTracked > 0 ? Math.min(100, Math.round((totalFocusedSeconds / totalTimeTracked) * 100)) : 92;

    // 1. STREAKS (Current vs Longest)
    const { StreakAchievementService } = await import('./streakAchievementService.js');
    const currentStreak = await StreakAchievementService.calculateStreak(userId);

    const uniqueDates = Array.from(new Set(
      allCompletedSessions
        .filter(s => s.focusedDuration >= 300)
        .map(s => s.startTime.toISOString().split('T')[0])
    )).sort();

    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dStr of uniqueDates) {
      const curDate = new Date(dStr);
      if (prevDate) {
        const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevDate = curDate;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    // 2. DAY-OF-WEEK DISTRIBUTION (Mon - Sun)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayMap: Record<number, { minutes: number; sessions: number }> = {
      0: { minutes: 0, sessions: 0 }, // Sun
      1: { minutes: 0, sessions: 0 }, // Mon
      2: { minutes: 0, sessions: 0 }, // Tue
      3: { minutes: 0, sessions: 0 }, // Wed
      4: { minutes: 0, sessions: 0 }, // Thu
      5: { minutes: 0, sessions: 0 }, // Fri
      6: { minutes: 0, sessions: 0 }, // Sat
    };

    for (const s of allCompletedSessions) {
      const dayIdx = new Date(s.startTime).getDay();
      dayMap[dayIdx].minutes += Math.round(s.focusedDuration / 60);
      dayMap[dayIdx].sessions += 1;
    }

    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayOfWeekDistribution = dayOrder.map((idx, i) => ({
      short: dayNames[i],
      full: fullDayNames[i],
      focusedMinutes: dayMap[idx].minutes,
      sessionsCount: dayMap[idx].sessions,
    }));

    // 3. WEEK-OVER-WEEK IMPROVEMENT
    const now = new Date();
    const currentDay = now.getDay();
    const daysSinceMonday = (currentDay + 6) % 7;
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - daysSinceMonday);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const thisWeekSessions = allCompletedSessions.filter(s => new Date(s.startTime) >= startOfThisWeek);
    const lastWeekSessions = allCompletedSessions.filter(s => {
      const t = new Date(s.startTime);
      return t >= startOfLastWeek && t < startOfThisWeek;
    });

    const thisWeekMinutes = Math.round(thisWeekSessions.reduce((a, s) => a + s.focusedDuration, 0) / 60);
    const lastWeekMinutes = Math.round(lastWeekSessions.reduce((a, s) => a + s.focusedDuration, 0) / 60);

    let percentDelta = 0;
    if (lastWeekMinutes > 0) {
      percentDelta = Math.round(((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100);
    } else if (thisWeekMinutes > 0) {
      percentDelta = 0;
    }

    // 4. TOP DISTRACTION SOURCES
    const blockAttempts = await prisma.blockAttempt.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const distractionCounts: Record<string, number> = {};
    for (const b of blockAttempts) {
      const clean = (b.resourceIdentifier || 'Unknown').replace(/^www\./, '').split('/')[0].toLowerCase();
      distractionCounts[clean] = (distractionCounts[clean] || 0) + 1;
    }

    const totalAttempts = blockAttempts.length;
    const topDistractions = Object.entries(distractionCounts)
      .map(([identifier, count]) => ({
        identifier,
        displayName: identifier.split('.')[0].charAt(0).toUpperCase() + identifier.split('.')[0].slice(1),
        count,
        percentage: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topDistractions.length === 0) {
      topDistractions.push(
        { identifier: 'instagram.com', displayName: 'Instagram', count: 0, percentage: 0 },
        { identifier: 'reddit.com', displayName: 'Reddit', count: 0, percentage: 0 },
        { identifier: 'youtube.com', displayName: 'YouTube', count: 0, percentage: 0 }
      );
    }

    // 5. PERSONAL RECORDS
    let longestSessionSeconds = 0;
    const dailyMap: Record<string, number> = {};

    for (const s of allCompletedSessions) {
      if (s.focusedDuration > longestSessionSeconds) {
        longestSessionSeconds = s.focusedDuration;
      }
      const d = s.startTime.toISOString().split('T')[0];
      dailyMap[d] = (dailyMap[d] || 0) + s.focusedDuration;
    }

    let bestDayDate = '';
    let bestDayMinutes = 0;
    for (const [date, dur] of Object.entries(dailyMap)) {
      const m = Math.round(dur / 60);
      if (m > bestDayMinutes) {
        bestDayMinutes = m;
        bestDayDate = date;
      }
    }

    const personalRecords = {
      longestSessionMinutes: Math.round(longestSessionSeconds / 60),
      bestFocusDay: {
        date: bestDayDate || 'Pending',
        minutes: bestDayMinutes,
      },
      bestWeekMinutes: Math.max(thisWeekMinutes, lastWeekMinutes),
    };

    // 6. PERSONALIZED INSIGHT CARD
    const hourScores: Record<string, { sum: number; count: number; name: string }> = {
      morning: { sum: 0, count: 0, name: 'Morning (8:00 AM - 12:00 PM)' },
      afternoon: { sum: 0, count: 0, name: 'Afternoon (1:00 PM - 5:00 PM)' },
      evening: { sum: 0, count: 0, name: 'Evening (6:00 PM - 10:00 PM)' },
      night: { sum: 0, count: 0, name: 'Late Night (11:00 PM - 3:00 AM)' },
    };

    for (const s of allCompletedSessions) {
      const h = new Date(s.startTime).getHours();
      let slot = 'evening';
      if (h >= 6 && h < 12) slot = 'morning';
      else if (h >= 12 && h < 17) slot = 'afternoon';
      else if (h >= 17 && h < 22) slot = 'evening';
      else slot = 'night';

      hourScores[slot].sum += s.focusScore;
      hourScores[slot].count += 1;
    }

    let peakSlot = 'morning';
    let highestAvg = 0;
    for (const [slot, data] of Object.entries(hourScores)) {
      if (data.count > 0) {
        const a = Math.round(data.sum / data.count);
        if (a > highestAvg) {
          highestAvg = a;
          peakSlot = slot;
        }
      }
    }

    const personalizedInsight = allCompletedSessions.length > 0 ? {
      title: 'Peak Focus Flow',
      window: hourScores[peakSlot].name,
      avgScore: highestAvg,
      recommendation: `Your deepest sessions occur during the ${peakSlot} window with an average focus score of ${highestAvg}%. Schedule your hardest DSA problems or project sprints during this prime cognitive window.`,
    } : {
      title: 'First Session Pending',
      window: 'Calibration in progress',
      avgScore: 0,
      recommendation: 'Complete your first focus block in any room to begin tracking genuine deep work telemetry.',
    };

    return {
      overview: {
        totalFocusedMinutes,
        totalSessions,
        avgSessionMinutes,
        focusRate,
      },
      dayOfWeekDistribution,
      streaks: {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
      },
      weekOverWeek: {
        thisWeekMinutes,
        lastWeekMinutes,
        percentDelta: percentDelta !== 0 ? (percentDelta > 0 ? `+${percentDelta}%` : `${percentDelta}%`) : '0%',
        isImprovement: percentDelta >= 0,
      },
      topDistractions,
      personalRecords,
      personalizedInsight,
    };
  }
}
