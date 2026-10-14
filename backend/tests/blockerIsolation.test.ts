import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { BlockerService } from '../src/services/blockerService.js';

describe('🔒 Focus Blocker Multi-User Isolation & Conflict Validation Suite', () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let sessionAId: string;

  before(async () => {
    // Create User A
    const createdA = await prisma.user.create({
      data: {
        name: 'User Alpha',
        username: 'user_alpha_test',
        email: 'user.alpha@test.internal',
        passwordHash: 'hashed_password_placeholder',
      },
    });
    userA = {
      id: createdA.id,
      email: createdA.email!,
      token: generateToken({ userId: createdA.id, email: createdA.email!, username: createdA.username }),
    };

    // Create User B
    const createdB = await prisma.user.create({
      data: {
        name: 'User Beta',
        username: 'user_beta_test',
        email: 'user.beta@test.internal',
        passwordHash: 'hashed_password_placeholder',
      },
    });
    userB = {
      id: createdB.id,
      email: createdB.email!,
      token: generateToken({ userId: createdB.id, email: createdB.email!, username: createdB.username }),
    };

    // Start Focus Session for User A
    const focusSessionA = await prisma.focusSession.create({
      data: {
        userId: userA.id,
        activityType: 'Coding',
        plannedDuration: 50,
        status: 'ACTIVE',
      },
    });
    sessionAId = focusSessionA.id;

    // Activate Blocker for User A
    await BlockerService.activateBlocker(userA.id, sessionAId, 'STRICT');
  });

  after(async () => {
    // Clean up test data
    await prisma.blockAttempt.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.blockerSession.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.focusSession.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.blockedResource.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.userSettings.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  });

  it('should verify User A has active blocker session', async () => {
    const statsA = await BlockerService.getStatistics(userA.id);
    assert.ok(statsA.activeSession, 'User A should have an active blocker session');
    assert.strictEqual(statsA.activeSession.focusSessionId, sessionAId);
  });

  it('should verify User B has NO active blocker session (Multi-User Isolation)', async () => {
    const statsB = await BlockerService.getStatistics(userB.id);
    assert.strictEqual(statsB.activeSession, null, 'User B must NOT see User A active session');
  });

  it('should reject User B attempting to allow Tier 1 domain (Instagram)', async () => {
    await assert.rejects(
      async () => {
        await BlockerService.createResource(userB.id, {
          type: 'WEBSITE',
          identifier: 'instagram.com',
          displayName: 'My Instagram',
          isAllowlist: true,
        });
      },
      /Conflict with Tier 1: Instagram/,
      'Must reject allowing Tier 1 platform'
    );
  });

  it('should reject User B attempting to block Tier 2 domain (GitHub)', async () => {
    await assert.rejects(
      async () => {
        await BlockerService.createResource(userB.id, {
          type: 'WEBSITE',
          identifier: 'github.com',
          displayName: 'GitHub',
          isAllowlist: false,
        });
      },
      /Conflict with Tier 2: GitHub/,
      'Must reject blocking Tier 2 tool'
    );
  });

  it('should allow User B to add custom valid domain to allowlist (Tier 3)', async () => {
    const resource = await BlockerService.createResource(userB.id, {
      type: 'WEBSITE',
      identifier: 'news.ycombinator.com',
      displayName: 'Hacker News',
      isAllowlist: true,
    });

    assert.ok(resource.id);
    assert.strictEqual(resource.identifier, 'news.ycombinator.com');
    assert.strictEqual(resource.isAllowlist, true);
    assert.strictEqual(resource.userId, userB.id);
  });

  it('should ensure User A cannot see or inherit User B custom rules', async () => {
    const resourcesA = await BlockerService.getResources(userA.id);
    const hasHN = resourcesA.some((r) => r.identifier === 'news.ycombinator.com');
    assert.strictEqual(hasHN, false, 'User A must not inherit User B private rule');
  });
});
