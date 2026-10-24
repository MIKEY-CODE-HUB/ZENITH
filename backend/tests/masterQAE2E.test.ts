import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/config/prisma.js';
import { AnalyticsService } from '../src/services/analyticsService.js';
import { AnalyticsController } from '../src/controllers/analyticsController.js';
import { PointService } from '../src/services/pointService.js';
import { RoomController } from '../src/controllers/roomController.js';
import { AchievementController } from '../src/controllers/achievementController.js';
import { validatePasswordStrength } from '../src/controllers/authController.js';
import { setupRoomHandlers, ParticipantPresence } from '../src/sockets/roomSocketHandlers.js';

describe('🎯 ZENITH Master Quality Assurance & End-to-End Regression Suite', () => {
  let testUserA: any;
  let testUserB: any;
  let testInteractionRoom: any;
  let testFocusRoom: any;

  before(async () => {
    // Create dedicated clean test accounts
    testUserA = await prisma.user.upsert({
      where: { username: 'test_qa_master_a' },
      update: {},
      create: {
        name: 'QA Master User A',
        username: 'test_qa_master_a',
        email: 'qa_user_a@zenith.test',
      },
    });

    testUserB = await prisma.user.upsert({
      where: { username: 'test_qa_master_b' },
      update: {},
      create: {
        name: 'QA Master User B',
        username: 'test_qa_master_b',
        email: 'qa_user_b@zenith.test',
      },
    });

    // Create test focus room (Education)
    testFocusRoom = await prisma.room.create({
      data: {
        name: 'QA Education Lab',
        category: 'EDUCATION',
        roomCode: `QA-EDU-${Math.floor(1000 + Math.random() * 9000)}`,
        creatorId: testUserA.id,
        maxParticipants: 10,
        defaultMic: false,
        status: 'ACTIVE',
      },
    });

    // Create test interaction room
    testInteractionRoom = await prisma.room.create({
      data: {
        name: 'QA Arena Interaction',
        category: 'INTERACTION',
        roomCode: `QA-INT-${Math.floor(1000 + Math.random() * 9000)}`,
        creatorId: testUserA.id,
        maxParticipants: 6,
        defaultMic: true,
        status: 'ACTIVE',
      },
    });
  });

  after(async () => {
    // Cleanup test data
    await prisma.pointTransaction.deleteMany({
      where: { userId: { in: [testUserA.id, testUserB.id] } },
    });
    await prisma.interactionAuthorization.deleteMany({
      where: { userId: { in: [testUserA.id, testUserB.id] } },
    });
    await prisma.roomParticipant.deleteMany({
      where: { roomId: { in: [testFocusRoom.id, testInteractionRoom.id] } },
    });
    await prisma.room.deleteMany({
      where: { id: { in: [testFocusRoom.id, testInteractionRoom.id] } },
    });
    await prisma.focusSession.deleteMany({
      where: { userId: { in: [testUserA.id, testUserB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserA.id, testUserB.id] } },
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 1. ANALYTICS INTEGRITY & ZERO-STATE REGRESSION
  // ═════════════════════════════════════════════════════════════════════════
  describe('📊 Analytics Telemetry & Clean Slate Integrity', () => {
    it('should return exactly 0% focus rate and 0 completed sessions for a clean user (NO fake 92% or 100%)', async () => {
      const analytics = await AnalyticsService.getRewardingAnalytics(testUserA.id);

      assert.strictEqual(analytics.overview.totalSessions, 0, 'Total sessions must be 0');
      assert.strictEqual(analytics.overview.totalFocusedMinutes, 0, 'Total focused minutes must be 0');
      assert.strictEqual(analytics.overview.focusRate, 0, 'Focus rate must be 0% when no sessions exist, not 92% or 100%');
      assert.strictEqual(analytics.personalizedInsight.title, 'First Session Pending');
      assert.strictEqual(analytics.personalizedInsight.avgScore, 0, 'Average efficiency must be 0, not 94%');
      assert.strictEqual(analytics.personalizedInsight.window, 'Calibration in progress');
    });

    it('should prevent cross-user data leakage when unauthenticated user requests analytics', async () => {
      let returnedData: any = null;
      const req: any = { user: undefined };
      const res: any = {
        json: (payload: any) => {
          returnedData = payload;
        },
      };

      await AnalyticsController.getRewardingAnalytics(req, res);

      assert.ok(returnedData, 'Response must be returned');
      assert.strictEqual(returnedData.success, true);
      assert.strictEqual(returnedData.data.overview.totalSessions, 0, 'Unauthenticated visitor must receive 0 sessions, not another users data');
      assert.strictEqual(returnedData.data.overview.totalFocusedMinutes, 0);
      assert.strictEqual(returnedData.data.overview.focusRate, 0);
      assert.strictEqual(returnedData.data.personalizedInsight.window, 'Awaiting Data');
    });

    it('should return todayFocusScore: 0 in getDashboardStats when user has 0 sessions today', async () => {
      let returnedStats: any = null;
      const req: any = { user: { userId: testUserA.id } };
      const res: any = {
        json: (payload: any) => {
          returnedStats = payload.stats;
        },
      };

      await AnalyticsController.getDashboardStats(req, res);

      assert.ok(returnedStats);
      assert.strictEqual(returnedStats.todaySessionsCount, 0);
      assert.strictEqual(returnedStats.todayFocusScore, 0, 'Today focus score must be 0 when 0 sessions today, not 100');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 2. ROOM CAPACITY RULES & HARD ENFORCEMENT
  // ═════════════════════════════════════════════════════════════════════════
  describe('👥 Room Capacity Rules (10 Focus, 6 Interaction)', () => {
    it('should cap room creation to 10 for Education and 6 for Interaction', async () => {
      let createdEduRoom: any = null;
      let createdIntRoom: any = null;

      const reqEdu: any = {
        user: { userId: testUserA.id },
        body: {
          name: 'Overcapacity Test Edu',
          category: 'EDUCATION',
          maxParticipants: 50, // Attempting to set 50
        },
      };
      const resEdu: any = {
        status: () => resEdu,
        json: (payload: any) => { createdEduRoom = payload.room; },
      };
      await RoomController.createRoom(reqEdu, resEdu);

      const reqInt: any = {
        user: { userId: testUserA.id },
        body: {
          name: 'Overcapacity Test Int',
          category: 'INTERACTION',
          maxParticipants: 25, // Attempting to set 25
        },
      };
      const resInt: any = {
        status: () => resInt,
        json: (payload: any) => { createdIntRoom = payload.room; },
      };
      await RoomController.createRoom(reqInt, resInt);

      assert.ok(createdEduRoom);
      assert.strictEqual(createdEduRoom.maxParticipants, 10, 'Education room capacity must be hard-capped at 10');

      assert.ok(createdIntRoom);
      assert.strictEqual(createdIntRoom.maxParticipants, 6, 'Interaction room capacity must be hard-capped at 6');

      // Cleanup
      await prisma.roomParticipant.deleteMany({ where: { roomId: { in: [createdEduRoom.id, createdIntRoom.id] } } });
      await prisma.room.deleteMany({ where: { id: { in: [createdEduRoom.id, createdIntRoom.id] } } });
    });

    it('should enforce 10-cap on RoomController.getRooms for all standard focus rooms', async () => {
      let roomsList: any[] = [];
      const req: any = { query: {} };
      const res: any = {
        json: (payload: any) => { roomsList = payload.rooms; },
      };

      await RoomController.getRooms(req, res);

      assert.ok(roomsList.length > 0);
      for (const r of roomsList) {
        if (r.category === 'INTERACTION') {
          assert.ok(r.maxParticipants <= 6, `Interaction room ${r.name} capacity must not exceed 6 (got ${r.maxParticipants})`);
        } else {
          assert.ok(r.maxParticipants <= 10, `Focus room ${r.name} capacity must not exceed 10 (got ${r.maxParticipants})`);
        }
      }
    });

    it('should reject socket join when Interaction room reaches 6 participants', () => {
      let emittedError: any = null;
      const handlers: Record<string, Function> = {};
      const fakeSocket: any = {
        id: 'socket-host',
        on: (event: string, handler: Function) => {
          handlers[event] = handler;
        },
        join: () => {},
        emit: (event: string, data: any) => {
          if (event === 'room_error') emittedError = data;
        },
        to: () => ({ emit: () => {} }),
      };

      const fakeIo: any = {
        to: () => ({ emit: () => {} }),
      };

      setupRoomHandlers(fakeIo, fakeSocket);

      const roomId = `room-int-test-${Date.now()}`;
      // Join 6 participants
      for (let i = 0; i < 6; i++) {
        fakeSocket.id = `socket-p-${i}`;
        handlers['join_room']({
          roomId,
          userId: `sim-user-${i}`,
          name: `User ${i}`,
          username: `user_${i}`,
          category: 'INTERACTION',
        });
      }

      // Now 7th participant attempts to join
      fakeSocket.id = 'socket-p-7';
      emittedError = null;
      handlers['join_room']({
        roomId,
        userId: 'sim-user-7',
        name: 'User 7',
        username: 'user_7',
        category: 'INTERACTION',
      });

      assert.ok(emittedError, 'Room error must be emitted for 7th participant in Interaction room');
      assert.strictEqual(emittedError.code, 'ROOM_FULL');
      assert.ok(emittedError.message.includes('6 participants'));
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 3. POINT ECONOMY & 30% INTERACTION DEDUCTION CONCURRENCY
  // ═════════════════════════════════════════════════════════════════════════
  describe('⭐ 30% Weekly XP Interaction Authorization & Concurrency', () => {
    it('should correctly quote 30% of current weekly points with 15pt floor', async () => {
      // Award 100 points
      await prisma.pointTransaction.create({
        data: {
          userId: testUserA.id,
          amount: 100,
          type: 'SESSION_COMPLETED',
          source: 'SESSION',
        },
      });

      const quote = await PointService.quoteInteractionCost(testUserA.id);
      assert.strictEqual(quote.weeklyBalance, 100);
      assert.strictEqual(quote.cost, 30, '30% of 100 should be exactly 30 points');
      assert.strictEqual(quote.remaining, 70);
      assert.strictEqual(quote.canAfford, true);
    });

    it('should atomically deduct 30% points and issue active 2-hour authorization record', async () => {
      const auth = await PointService.authorizeInteractionEntry(testUserA.id, testInteractionRoom.id);

      assert.ok(auth.authorizationId);
      assert.strictEqual(auth.pointsDeducted, 30);
      assert.strictEqual(auth.remainingWeeklyPoints, 70);

      // Verify transaction in DB
      const latestTx = await prisma.pointTransaction.findFirst({
        where: { userId: testUserA.id, type: 'INTERACTION_ROOM' },
        orderBy: { createdAt: 'desc' },
      });
      assert.ok(latestTx);
      assert.strictEqual(latestTx.amount, -30);
    });

    it('should re-authorize idempotently within 2 hours without additional deduction', async () => {
      const reauth = await PointService.authorizeInteractionEntry(testUserA.id, testInteractionRoom.id);

      assert.strictEqual(reauth.pointsDeducted, 0, 'Re-entry within active window must not double-charge points');
      assert.strictEqual(reauth.remainingWeeklyPoints, 70);
    });

    it('should reject authorization with INSUFFICIENT_POINTS if balance is below requirement', async () => {
      await assert.rejects(
        async () => {
          await PointService.authorizeInteractionEntry(testUserB.id, testInteractionRoom.id);
        },
        /INSUFFICIENT_POINTS/
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 4. ACHIEVEMENTS RESILIENCE & GUEST ACCESS
  // ═════════════════════════════════════════════════════════════════════════
  describe('🏆 Achievement Catalog & Guest Availability', () => {
    it('should serve all 6 canonical achievements to unauthenticated visitors with unlocked: false', async () => {
      let returnedData: any = null;
      const req: any = { user: undefined };
      const res: any = {
        json: (payload: any) => { returnedData = payload; },
      };

      await AchievementController.getAchievements(req, res);

      assert.ok(returnedData);
      assert.strictEqual(returnedData.success, true);
      assert.ok(returnedData.achievements.length >= 6, 'Must display at least all 6 canonical achievements');
      assert.strictEqual(returnedData.unlockedCount, 0, 'Unauthenticated visitor has 0 unlocked');
      assert.ok(returnedData.totalCount >= 6);

      const codes = returnedData.achievements.map((a: any) => a.code);
      assert.ok(codes.includes('FIRST_SESSION'));
      assert.ok(codes.includes('FOCUS_STARTER'));
      assert.ok(codes.includes('SEVEN_DAY_STREAK'));
      assert.ok(codes.includes('FOCUS_MASTER'));
      assert.ok(codes.includes('DEEP_WORK'));
      assert.ok(codes.includes('BLOCKER_SHIELD'));
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 5. AUTHENTICATION & PASSWORD INTEGRITY
  // ═════════════════════════════════════════════════════════════════════════
  describe('🔐 Authentication Validation & Account Security', () => {
    it('should reject passwords failing character classes or length', () => {
      assert.strictEqual(validatePasswordStrength('short').valid, false);
      assert.strictEqual(validatePasswordStrength('nocapital123!').valid, false);
      assert.strictEqual(validatePasswordStrength('NONUMBER!CAPS').valid, false);
      assert.strictEqual(validatePasswordStrength('NoSpecialChar123').valid, false);
      assert.strictEqual(validatePasswordStrength('StrongP@ssw0rd2026!').valid, true);
    });
  });
});
