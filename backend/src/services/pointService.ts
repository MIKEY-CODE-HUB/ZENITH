import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { StreakAchievementService } from './streakAchievementService.js';

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

    const streak = await StreakAchievementService.calculateStreak(userId);

    return {
      weeklyPoints,
      lifetimePoints,
      currentStreakDays: streak,
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
    category: string = 'EDUCATION',
    tx: Prisma.TransactionClient = prisma
  ): Promise<{ totalAwarded: number; breakdown: { base: number; qualityBonus: number; categoryBonus: number } }> {
    // 1. Base focus points: ~1 point per focused minute
    if (focusedDurationSeconds <= 0) return { totalAwarded: 0, breakdown: { base: 0, qualityBonus: 0, categoryBonus: 0 } };
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
    await tx.pointTransaction.create({
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
    // Points are whole units, with a one-point minimum for a nonzero entry fee.
    const cost = Math.max(1, Math.round(weeklyPoints * 0.3));
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
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'membership_' + userId}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${roomId}))`;
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: { participants: { where: { status: 'ACTIVE' } } },
      });
      if (!room || room.category !== 'INTERACTION' || room.status !== 'ACTIVE' ||
          (room.isPrivate && room.creatorId !== userId)) {
        throw new Error('ROOM_NOT_FOUND: Interaction room unavailable.');
      }
      const restriction = await tx.roomRestriction.findFirst({
        where: { roomId, userId, expiresAt: { gt: new Date() } },
      });
      if (restriction) throw new Error('ROOM_RESTRICTED: Interaction room unavailable.');
      if (!room.participants.some((participant) => participant.userId === userId) &&
          room.participants.length >= Math.min(6, room.maxParticipants)) {
        throw new Error('ROOM_FULL: Interaction room is full.');
      }
      const authorization = await this.debitInteractionEntry(tx, userId, room);
      await tx.roomParticipant.updateMany({
        where: { userId, roomId: { not: roomId }, status: 'ACTIVE' },
        data: { status: 'LEFT', leftAt: new Date() },
      });
      await tx.roomParticipant.upsert({
        where: { roomId_userId: { roomId, userId } },
        update: { status: 'ACTIVE', leftAt: null, joinedAt: new Date(), presenceExpiresAt: null },
        create: { roomId, userId, role: room.creatorId === userId ? 'HOST' : 'MEMBER' },
      });
      return authorization;
    });
  }

  public static async debitInteractionEntry(
    tx: Prisma.TransactionClient,
    userId: string,
    room: { id: string; name: string }
  ) {
    const roomId = room.id;
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
      const startOfWeek = this.getStartOfWeekUTC();
      const weeklyAggregate = await tx.pointTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfWeek },
        },
        _sum: { amount: true },
      });
      const currentWeekly = Math.max(0, weeklyAggregate._sum.amount || 0);
      return {
        authorizationId: existingAuth.id,
        pointsDeducted: 0,
        remainingWeeklyPoints: currentWeekly,
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

    const cost = Math.max(1, Math.round(currentWeeklyPoints * 0.3));

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
  }
}
