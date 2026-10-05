import { prisma } from '../config/prisma.js';

export interface PointSummary {
  weeklyPoints: number;
  lifetimePoints: number;
  currentStreakDays: number;
}

export class PointService {
  /**
   * Returns start of current week in UTC (Monday 00:00:00)
   */
  public static getStartOfWeekUTC(): Date {
    const now = new Date();
    const day = now.getUTCDay(); // 0 is Sunday
    const diff = (day === 0 ? -6 : 1) - day; // Adjust to Monday
    const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff, 0, 0, 0, 0));
    return startOfWeek;
  }

  /**
   * Calculate current weekly and lifetime points
   */
  public static async getUserPointSummary(userId: string): Promise<PointSummary> {
    const startOfWeek = this.getStartOfWeekUTC();

    const [weeklyAggregate, lifetimeAggregate] = await Promise.all([
      prisma.pointTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfWeek },
        },
        _sum: { amount: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    const weeklyPoints = Math.max(0, weeklyAggregate._sum.amount || 0);
    const lifetimePoints = Math.max(0, lifetimeAggregate._sum.amount || 0);

    return {
      weeklyPoints,
      lifetimePoints,
      currentStreakDays: 1,
    };
  }

  /**
   * Authoritatively award points for a completed focus or workout session
   */
  public static async awardSessionPoints(
    userId: string,
    sessionId: string,
    focusedDurationSeconds: number,
    focusScore: number,
    category: string = 'EDUCATION'
  ): Promise<{ totalAwarded: number; breakdown: { base: number; qualityBonus: number; categoryBonus: number } }> {
    // 1. Base focus points: ~1 point per focused minute
    const baseMinutes = Math.floor(focusedDurationSeconds / 60);
    const basePoints = Math.max(5, Math.round(baseMinutes * 1.0));

    // 2. Focus Quality bonus
    let qualityBonus = 0;
    if (focusScore >= 95) qualityBonus = 20;
    else if (focusScore >= 90) qualityBonus = 15;
    else if (focusScore >= 80) qualityBonus = 10;
    else if (focusScore >= 70) qualityBonus = 5;

    // 3. Category bonus (Exercise/Sidequest consistency boost)
    let categoryBonus = 0;
    if (category === 'EXERCISE' && baseMinutes >= 20) categoryBonus = 10;
    if (category === 'SIDE_QUEST' && baseMinutes >= 30) categoryBonus = 8;

    const totalAwarded = basePoints + qualityBonus + categoryBonus;

    // Store in PointLedger atomically
    await prisma.pointTransaction.create({
      data: {
        userId,
        amount: totalAwarded,
        type: category === 'EXERCISE' ? 'EXERCISE_COMPLETED' : category === 'SIDE_QUEST' ? 'SIDE_QUEST_COMPLETED' : 'SESSION_COMPLETED',
        source: 'SESSION',
        sessionId,
        metadata: JSON.stringify({
          basePoints,
          qualityBonus,
          categoryBonus,
          focusScore,
          category,
          focusedMinutes: baseMinutes,
        }),
      },
    });

    return {
      totalAwarded,
      breakdown: {
        base: basePoints,
        qualityBonus,
        categoryBonus,
      },
    };
  }

  /**
   * Quote the 30% weekly points cost for joining an interaction room
   */
  public static async quoteInteractionCost(userId: string): Promise<{ weeklyBalance: number; cost: number; remaining: number; canAfford: boolean }> {
    const { weeklyPoints } = await this.getUserPointSummary(userId);
    // Cost is 30% of current weekly points, with a minimum cost of 15 points (or balance if less)
    const cost = Math.max(15, Math.round(weeklyPoints * 0.3));
    const canAfford = weeklyPoints >= cost && weeklyPoints > 0;
    const remaining = Math.max(0, weeklyPoints - cost);

    return {
      weeklyBalance: weeklyPoints,
      cost,
      remaining,
      canAfford,
    };
  }

  /**
   * Atomic transactional deduction of 30% weekly points for entering an Interaction Room
   * Strictly enforces 6 participant limit!
   */
  public static async authorizeInteractionEntry(
    userId: string,
    roomId: string
  ): Promise<{ authorizationId: string; pointsDeducted: number; remainingWeeklyPoints: number }> {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify Room exists and enforce strict 6 participants cap
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: {
          participants: {
            where: { status: 'ACTIVE' },
          },
        },
      });

      if (!room) {
        throw new Error('ROOM_NOT_FOUND: The requested interaction room does not exist.');
      }

      if (room.category === 'INTERACTION' && room.participants.length >= 6) {
        throw new Error('ROOM_FULL: Interaction rooms have a strict maximum capacity of 6 participants.');
      }

      // Check if user already has an active authorization for this room created in the last 2 hours
      const existingAuth = await tx.interactionAuthorization.findFirst({
        where: {
          userId,
          roomId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      });

      if (existingAuth) {
        const { weeklyPoints } = await this.getUserPointSummary(userId);
        return {
          authorizationId: existingAuth.id,
          pointsDeducted: 0,
          remainingWeeklyPoints: weeklyPoints,
        };
      }

      // 2. Fetch current weekly points
      const startOfWeek = this.getStartOfWeekUTC();
      const weeklyAggregate = await tx.pointTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfWeek },
        },
        _sum: { amount: true },
      });

      const currentWeeklyPoints = Math.max(0, weeklyAggregate._sum.amount || 0);

      // Minimum points check - default to at least 15 points
      const cost = Math.max(15, Math.round(currentWeeklyPoints * 0.3));

      if (currentWeeklyPoints < cost) {
        throw new Error(`INSUFFICIENT_POINTS: Entering this Interaction Room requires 30% of weekly points (${cost} ⭐). Your current balance is ${currentWeeklyPoints} ⭐.`);
      }

      // 3. Atomically deduct points in the ledger
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: -cost,
          type: 'INTERACTION_ROOM',
          source: 'INTERACTION_ENTRY',
          metadata: JSON.stringify({
            roomId,
            roomName: room.name,
            originalWeeklyBalance: currentWeeklyPoints,
            percentage: 30,
          }),
        },
      });

      // 4. Create Interaction Authorization valid for 2 hours
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const authRecord = await tx.interactionAuthorization.create({
        data: {
          userId,
          roomId,
          pointsSpent: cost,
          status: 'ACTIVE',
          expiresAt,
        },
      });

      return {
        authorizationId: authRecord.id,
        pointsDeducted: cost,
        remainingWeeklyPoints: currentWeeklyPoints - cost,
      };
    });
  }
}
