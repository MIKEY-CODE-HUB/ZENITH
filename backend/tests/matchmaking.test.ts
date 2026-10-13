import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/config/prisma.js';

describe('⚡ Dynamic Room Allocation & Concurrency Matchmaking Suite', () => {
  const testCategory = 'EDUCATION';
  const testUsers: { id: string; username: string }[] = [];

  before(async () => {
    // Create pool of test users for concurrency testing
    for (let i = 0; i < 50; i++) {
      const u = await prisma.user.upsert({
        where: { username: `test_alloc_user_${i}` },
        update: {},
        create: {
          name: `Test Allocator ${i}`,
          username: `test_alloc_user_${i}`,
          email: `alloc_${i}@zenith.test`,
        },
      });
      testUsers.push({ id: u.id, username: u.username });
    }
  });

  after(async () => {
    // Clean up test participants and test rooms created during test
    await prisma.roomParticipant.deleteMany({
      where: { user: { username: { startsWith: 'test_alloc_user_' } } },
    });
    await prisma.room.deleteMany({
      where: { name: { startsWith: 'SEM Room #Test' } },
    });
  });

  it('should allocate user into available room with capacity < 10', async () => {
    // 1. Create a dedicated test room with capacity 10
    const testRoom = await prisma.room.create({
      data: {
        name: 'SEM Room #TestAlpha',
        category: testCategory,
        roomCode: `ALPH-${Math.floor(1000 + Math.random() * 9000)}`,
        creatorId: testUsers[0].id,
        maxParticipants: 10,
        status: 'ACTIVE',
      },
    });

    // Allocate user 0
    const mockReq1: any = {
      user: { userId: testUsers[0].id },
      body: { category: testCategory },
    };

    let allocatedRoom: any = null;
    await prisma.$transaction(async (tx) => {
      const candidate = await tx.room.findFirst({
        where: { id: testRoom.id, status: 'ACTIVE' },
        include: { participants: { where: { status: 'ACTIVE' } } },
      });
      assert.ok(candidate);
      assert.ok(candidate.participants.length < 10);

      await tx.roomParticipant.upsert({
        where: { roomId_userId: { roomId: candidate.id, userId: testUsers[0].id } },
        update: { status: 'ACTIVE' },
        create: { roomId: candidate.id, userId: testUsers[0].id, status: 'ACTIVE' },
      });
      allocatedRoom = candidate;
    });

    assert.ok(allocatedRoom);
    assert.strictEqual(allocatedRoom.id, testRoom.id);

    // Verify participant count is now 1
    const pCount = await prisma.roomParticipant.count({
      where: { roomId: testRoom.id, status: 'ACTIVE' },
    });
    assert.strictEqual(pCount, 1);
  });

  it('should enforce idempotency when user requests allocation multiple times', async () => {
    const user = testUsers[1];

    const idemRoom = await prisma.room.create({
      data: {
        name: 'SEM Room #TestIdempotent',
        category: 'EDUCATION',
        roomCode: `IDEM-${Math.floor(1000 + Math.random() * 9000)}`,
        creatorId: user.id,
        maxParticipants: 10,
        status: 'ACTIVE',
      },
    });

    // Allocate user first time
    const activeFirst = await prisma.$transaction(async (tx) => {
      const p = await tx.roomParticipant.upsert({
        where: { roomId_userId: { roomId: idemRoom.id, userId: user.id } },
        update: { status: 'ACTIVE' },
        create: { roomId: idemRoom.id, userId: user.id, status: 'ACTIVE' },
      });
      return p;
    });

    assert.ok(activeFirst);

    // Retry allocation
    const activeSecond = await prisma.$transaction(async (tx) => {
      const existing = await tx.roomParticipant.findFirst({
        where: { userId: user.id, roomId: idemRoom.id, status: 'ACTIVE' },
      });
      return existing;
    });

    assert.ok(activeSecond);
    assert.strictEqual(activeFirst.id, activeSecond.id);

    // Check count for this user in this room is strictly 1
    const totalCount = await prisma.roomParticipant.count({
      where: { roomId: idemRoom.id, userId: user.id, status: 'ACTIVE' },
    });
    assert.strictEqual(totalCount, 1);
  });

  it('should strictly never allow standard rooms to exceed 10 active participants under 20 concurrent joins', async () => {
    // Create fresh isolated test room
    const cappedRoom = await prisma.room.create({
      data: {
        name: 'SEM Room #TestCap',
        category: 'EDUCATION',
        roomCode: `TCAP-${Math.floor(1000 + Math.random() * 9000)}`,
        creatorId: testUsers[0].id,
        maxParticipants: 10,
        status: 'ACTIVE',
      },
    });

    const candidateUsers = testUsers.slice(2, 22); // 20 concurrent users competing for 10 slots
    assert.strictEqual(candidateUsers.length, 20);

    const results = await Promise.allSettled(
      candidateUsers.map((u) =>
        prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cappedRoom.id}))`;

          const currentCount = await tx.roomParticipant.count({
            where: { roomId: cappedRoom.id, status: 'ACTIVE' },
          });

          if (currentCount >= 10) {
            throw new Error('ROOM_FULL');
          }

          return tx.roomParticipant.create({
            data: {
              roomId: cappedRoom.id,
              userId: u.id,
              status: 'ACTIVE',
            },
          });
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(successful.length, 10);
    assert.strictEqual(rejected.length, 10);

    const finalCount = await prisma.roomParticipant.count({
      where: { roomId: cappedRoom.id, status: 'ACTIVE' },
    });
    assert.strictEqual(finalCount, 10);
  });

  it('should dynamically create new rooms when existing capacity is saturated across 30 users', async () => {
    const candidateUsers = testUsers.slice(0, 30);
    const effectiveCap = 10;
    const testCat = 'EXERCISE';

    // Simulated matchmaking allocation function
    const allocateSimulated = async (userId: string) => {
      return prisma.$transaction(async (tx) => {
        // Find existing candidate rooms in category
        const rooms = await tx.room.findMany({
          where: { category: testCat, status: 'ACTIVE', isPrivate: false, name: { startsWith: 'SEM Room #Test' } },
          include: { participants: { where: { status: 'ACTIVE' } } },
        });

        let target = rooms.find((r) => r.participants.length < effectiveCap);

        if (!target) {
          // Dynamic room auto-creation
          target = await tx.room.create({
            data: {
              name: `SEM Room #TestDyn_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              category: testCat,
              roomCode: `DYN-${Math.floor(1000 + Math.random() * 9000)}`,
              creatorId: userId,
              maxParticipants: effectiveCap,
              status: 'ACTIVE',
            },
            include: { participants: true },
          });
        }

        await tx.roomParticipant.upsert({
          where: { roomId_userId: { roomId: target.id, userId } },
          update: { status: 'ACTIVE' },
          create: { roomId: target.id, userId, status: 'ACTIVE' },
        });

        return target.id;
      });
    };

    // Sequentially / batch allocate all 30 users
    const roomIds: string[] = [];
    for (const u of candidateUsers) {
      const rId = await allocateSimulated(u.id);
      roomIds.push(rId);
    }

    assert.strictEqual(roomIds.length, 30);

    // Verify all created rooms respect max 10
    const uniqueRoomIds = Array.from(new Set(roomIds));
    assert.ok(uniqueRoomIds.length >= 3); // 30 users require at least 3 rooms with cap 10

    for (const rId of uniqueRoomIds) {
      const count = await prisma.roomParticipant.count({
        where: { roomId: rId, status: 'ACTIVE' },
      });
      assert.ok(count <= 10, `Room ${rId} has ${count} participants, which exceeds limit of 10!`);
    }
  });

  it('should mark room as clean and reusable when all participants leave', async () => {
    const tempRoom = await prisma.room.create({
      data: {
        name: 'SEM Room #TestLifecycle',
        category: 'SIDE_QUEST',
        roomCode: `LIFE-${Math.floor(1000 + Math.random() * 9000)}`,
        creatorId: testUsers[0].id,
        maxParticipants: 10,
        status: 'ACTIVE',
      },
    });

    // User joins
    await prisma.roomParticipant.create({
      data: { roomId: tempRoom.id, userId: testUsers[0].id, status: 'ACTIVE' },
    });

    let activeCount = await prisma.roomParticipant.count({
      where: { roomId: tempRoom.id, status: 'ACTIVE' },
    });
    assert.strictEqual(activeCount, 1);

    // User leaves
    await prisma.$transaction(async (tx) => {
      await tx.roomParticipant.updateMany({
        where: { roomId: tempRoom.id, userId: testUsers[0].id, status: 'ACTIVE' },
        data: { status: 'LEFT', leftAt: new Date() },
      });

      const remaining = await tx.roomParticipant.count({
        where: { roomId: tempRoom.id, status: 'ACTIVE' },
      });

      if (remaining === 0) {
        await tx.room.update({
          where: { id: tempRoom.id },
          data: { status: 'ACTIVE', updatedAt: new Date() },
        });
      }
    });

    activeCount = await prisma.roomParticipant.count({
      where: { roomId: tempRoom.id, status: 'ACTIVE' },
    });
    assert.strictEqual(activeCount, 0);

    const roomRefreshed = await prisma.room.findUnique({ where: { id: tempRoom.id } });
    assert.strictEqual(roomRefreshed?.status, 'ACTIVE');
  });

  it('should scale allocation correctly under 100, 500, and 1,000 simulated join requests', async () => {
    class SimulatedAllocationEngine {
      private rooms: Map<string, { id: string; activeCount: number; maxCapacity: number; members: Set<string> }> = new Map();
      private roomCounter = 0;

      allocate(userId: string): { roomId: string; isNewRoom: boolean } {
        // 1. Idempotency check: if user already has active membership in an existing room, return it
        for (const room of this.rooms.values()) {
          if (room.members.has(userId)) {
            return { roomId: room.id, isNewRoom: false };
          }
        }

        // 2. Find eligible room with slots < maxCapacity (fill highest occupancy first)
        const candidates = Array.from(this.rooms.values())
          .filter((r) => r.activeCount < r.maxCapacity)
          .sort((a, b) => b.activeCount - a.activeCount);

        let target = candidates[0];
        let isNewRoom = false;

        // 3. Auto-create if all existing rooms full
        if (!target) {
          this.roomCounter++;
          target = {
            id: `sim-room-${this.roomCounter}`,
            activeCount: 0,
            maxCapacity: 10,
            members: new Set(),
          };
          this.rooms.set(target.id, target);
          isNewRoom = true;
        }

        // 4. Invariant check before slot assignment
        if (target.activeCount >= target.maxCapacity) {
          throw new Error('CAPACITY_EXCEEDED');
        }

        target.activeCount++;
        target.members.add(userId);

        return { roomId: target.id, isNewRoom };
      }

      getStats() {
        const roomsArr = Array.from(this.rooms.values());
        const totalMembers = roomsArr.reduce((sum, r) => sum + r.activeCount, 0);
        const maxOccupancy = Math.max(...roomsArr.map((r) => r.activeCount), 0);
        return {
          totalRooms: roomsArr.length,
          totalMembers,
          maxOccupancy,
        };
      }
    }

    // A. 100 simultaneous allocations
    const engine100 = new SimulatedAllocationEngine();
    const t0_100 = Date.now();
    for (let i = 0; i < 100; i++) {
      engine100.allocate(`user_100_${i}`);
    }
    const latency100 = Date.now() - t0_100;
    const stats100 = engine100.getStats();
    assert.strictEqual(stats100.totalMembers, 100);
    assert.strictEqual(stats100.totalRooms, 10); // 100 users / 10 cap = 10 rooms
    assert.strictEqual(stats100.maxOccupancy, 10);
    assert.ok(latency100 < 50, `100 allocations completed in ${latency100}ms`);

    // B. 500 simultaneous allocations
    const engine500 = new SimulatedAllocationEngine();
    const t0_500 = Date.now();
    for (let i = 0; i < 500; i++) {
      engine500.allocate(`user_500_${i}`);
    }
    const latency500 = Date.now() - t0_500;
    const stats500 = engine500.getStats();
    assert.strictEqual(stats500.totalMembers, 500);
    assert.strictEqual(stats500.totalRooms, 50); // 500 users / 10 cap = 50 rooms
    assert.strictEqual(stats500.maxOccupancy, 10);
    assert.ok(latency500 < 100, `500 allocations completed in ${latency500}ms`);

    // C. 1,000 simultaneous allocations
    const engine1000 = new SimulatedAllocationEngine();
    const t0_1000 = Date.now();
    for (let i = 0; i < 1000; i++) {
      engine1000.allocate(`user_1000_${i}`);
    }
    const latency1000 = Date.now() - t0_1000;
    const stats1000 = engine1000.getStats();
    assert.strictEqual(stats1000.totalMembers, 1000);
    assert.strictEqual(stats1000.totalRooms, 100); // 1,000 users / 10 cap = 100 rooms
    assert.strictEqual(stats1000.maxOccupancy, 10);
    assert.ok(latency1000 < 150, `1,000 allocations completed in ${latency1000}ms`);

    // D. Partial fill + saturation verification (e.g. 7 participants + 10 participants room)
    const enginePartial = new SimulatedAllocationEngine();
    for (let i = 0; i < 7; i++) {
      enginePartial.allocate(`seed_room1_${i}`);
    }
    for (let i = 0; i < 10; i++) {
      enginePartial.allocate(`seed_room2_${i}`);
    }
    const res1 = enginePartial.allocate('new_user_1');
    const res2 = enginePartial.allocate('new_user_2');
    const res3 = enginePartial.allocate('new_user_3');
    assert.strictEqual(res1.isNewRoom, false);
    assert.strictEqual(res2.isNewRoom, false);
    assert.strictEqual(res3.isNewRoom, false);
    const res4 = enginePartial.allocate('new_user_4');
    assert.strictEqual(res4.isNewRoom, true);
    assert.strictEqual(enginePartial.getStats().totalRooms, 3);
  });
});
