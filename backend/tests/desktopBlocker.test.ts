import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ZenithPolicyEngine } from '../src/services/policyEngine.js';
import { BlockerService } from '../src/services/blockerService.js';
import { ALWAYS_BLOCKED_APPS, ALWAYS_ALLOWED_APPS } from '../src/config/shieldDomains.js';
import { generateToken } from '../src/utils/jwt.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'trapbreaker-super-secret-jwt-key-2026';

describe('🖥️ ZENITH Native Desktop Blocker & Policy Engine Suite', () => {
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let sessionAId: string;

  before(async () => {
    const hashedPassword = await bcrypt.hash('ZenithPass123!', 10);
    const ts = Date.now();

    userA = await prisma.user.create({
      data: {
        email: `desk_userA_${ts}@zenith.test`,
        username: `desk_userA_${ts}`,
        passwordHash: hashedPassword,
        name: 'Desktop User A',
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `desk_userB_${ts}@zenith.test`,
        username: `desk_userB_${ts}`,
        passwordHash: hashedPassword,
        name: 'Desktop User B',
      },
    });

    tokenA = generateToken({ userId: userA.id, username: userA.username, email: userA.email });
    tokenB = generateToken({ userId: userB.id, username: userB.username, email: userB.email });
  });

  after(async () => {
    await prisma.blockAttempt.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.blockerSession.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.focusSession.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.blockedResource.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    await prisma.$disconnect();
  });

  describe('1. Desktop Application Three-Tier Policy Evaluation', () => {
    it('should allow all desktop applications when session is INACTIVE', () => {
      const evalInactive = ZenithPolicyEngine.evaluateApplication('Discord', {
        isSessionActive: false,
        sessionMode: 'STRICT',
      });
      assert.equal(evalInactive.action, 'ALLOW');
      assert.equal(evalInactive.tier, 'SYSTEM');
      assert.match(evalInactive.reason, /Enforcement Standby/);
    });

    it('should intercept Tier 1 predefined high-distraction apps during active session', () => {
      const appsToTest = ['Discord', 'Spotify', 'Steam', 'Telegram', 'WhatsApp', 'Slack', 'Epic Games'];
      for (const app of appsToTest) {
        const res = ZenithPolicyEngine.evaluateApplication(app, {
          isSessionActive: true,
          sessionMode: 'STRICT',
        });
        assert.equal(res.action, 'BLOCK', `App ${app} should be blocked in Tier 1`);
        assert.equal(res.tier, 'TIER_1');
        assert.match(res.reason, /protected distraction application/);
      }
    });

    it('should protect Tier 2 essential tools & IDEs from being blocked', () => {
      const allowedTools = ['Google Chrome', 'Brave Browser', 'Terminal', 'iTerm2', 'Code', 'Cursor', 'Windsurf', 'Xcode', 'Finder'];
      for (const tool of allowedTools) {
        const res = ZenithPolicyEngine.evaluateApplication(tool, {
          isSessionActive: true,
          sessionMode: 'STRICT',
        });
        assert.equal(res.action, 'ALLOW', `Essential tool ${tool} should be allowed in Tier 2`);
        assert.equal(res.tier, 'TIER_2');
      }
    });

    it('should evaluate Tier 3 custom allowed desktop applications', () => {
      const customRules = [
        {
          type: 'APPLICATION' as const,
          identifier: 'Blender',
          displayName: 'Blender 3D',
          isAllowlist: true,
          enabled: true,
        },
      ];

      const res = ZenithPolicyEngine.evaluateApplication('Blender', {
        isSessionActive: true,
        sessionMode: 'STRICT',
        userRules: customRules,
      });

      assert.equal(res.action, 'ALLOW');
      assert.equal(res.tier, 'TIER_3');
      assert.match(res.reason, /user custom rule/);
    });

    it('should evaluate Tier 3 custom blocked desktop applications', () => {
      const customRules = [
        {
          type: 'APPLICATION' as const,
          identifier: 'Civilization VI',
          displayName: 'Civilization Game',
          isAllowlist: false,
          enabled: true,
        },
      ];

      const res = ZenithPolicyEngine.evaluateApplication('Civilization VI', {
        isSessionActive: true,
        sessionMode: 'BLOCK',
        userRules: customRules,
      });

      assert.equal(res.action, 'BLOCK');
      assert.equal(res.tier, 'TIER_3');
      assert.match(res.reason, /user custom rule/);
    });

    it('should enforce default-deny on unknown desktop applications in STRICT mode', () => {
      const res = ZenithPolicyEngine.evaluateApplication('RandomUnknownGame', {
        isSessionActive: true,
        sessionMode: 'STRICT',
      });

      assert.equal(res.action, 'BLOCK');
      assert.equal(res.tier, 'UNKNOWN');
      assert.match(res.reason, /default-deny/);
    });

    it('should allow unknown desktop applications in standard BLOCK mode', () => {
      const res = ZenithPolicyEngine.evaluateApplication('RandomWorkApp', {
        isSessionActive: true,
        sessionMode: 'BLOCK',
      });

      assert.equal(res.action, 'ALLOW');
      assert.equal(res.tier, 'UNKNOWN');
      assert.match(res.reason, /not explicitly blocked/);
    });

    it('should enforce rule precedence: Tier 1 overrides malicious or accidental custom allow rule', () => {
      // User creates custom rule allowing Discord
      const conflictingRules = [
        {
          type: 'APPLICATION' as const,
          identifier: 'Discord',
          isAllowlist: true,
          enabled: true,
        },
      ];

      const res = ZenithPolicyEngine.evaluateApplication('Discord', {
        isSessionActive: true,
        sessionMode: 'STRICT',
        userRules: conflictingRules,
      });

      // Tier 1 MUST override Tier 3 allow!
      assert.equal(res.action, 'BLOCK');
      assert.equal(res.tier, 'TIER_1');
    });

    it('should enforce rule precedence: Tier 2 overrides accidental custom block rule', () => {
      // User accidentally adds VS Code to custom blocklist
      const conflictingRules = [
        {
          type: 'APPLICATION' as const,
          identifier: 'Code',
          isAllowlist: false,
          enabled: true,
        },
      ];

      const res = ZenithPolicyEngine.evaluateApplication('Code', {
        isSessionActive: true,
        sessionMode: 'STRICT',
        userRules: conflictingRules,
      });

      // Tier 2 MUST override Tier 3 block!
      assert.equal(res.action, 'ALLOW');
      assert.equal(res.tier, 'TIER_2');
    });

    it('should reject conflict when user attempts to add Tier 1 app to allowlist', () => {
      const validation = ZenithPolicyEngine.validateCustomRule('Discord', 'APPLICATION', true);
      assert.equal(validation.valid, false);
      assert.equal(validation.conflictTier, 'TIER_1');
      assert.match(validation.error || '', /core distraction application/);
    });

    it('should reject conflict when user attempts to add Tier 2 app to blocklist', () => {
      const validation = ZenithPolicyEngine.validateCustomRule('Terminal', 'APPLICATION', false);
      assert.equal(validation.valid, false);
      assert.equal(validation.conflictTier, 'TIER_2');
      assert.match(validation.error || '', /essential tool/);
    });
  });

  describe('2. Desktop Blocker Multi-User Isolation & Telemetry', () => {
    it('should activate a focus session with desktop blocker config for User A', async () => {
      const focusSession = await prisma.focusSession.create({
        data: {
          userId: userA.id,
          plannedDuration: 50,
          activityType: 'Coding',
          category: 'EDUCATION',
          status: 'ACTIVE',
        },
      });
      sessionAId = focusSession.id;

      const activation = await BlockerService.activateBlocker(userA.id, sessionAId, 'STRICT');
      assert.equal(activation.success, true);
      assert.equal(activation.config.mode, 'STRICT');
      assert.ok(activation.config.blockedApps.includes('Discord'));
      assert.ok(activation.config.allowedApps.includes('Terminal'));
    });

    it('should verify User A has active session and User B has NO active session (Multi-User Isolation)', async () => {
      // Query User A
      const sessionA = await prisma.blockerSession.findFirst({
        where: { userId: userA.id, status: 'ACTIVE' },
      });
      assert.ok(sessionA);
      assert.equal(sessionA.userId, userA.id);

      // Query User B
      const sessionB = await prisma.blockerSession.findFirst({
        where: { userId: userB.id, status: 'ACTIVE' },
      });
      assert.equal(sessionB, null, 'User B must NOT inherit User A active session');
    });

    it('should record desktop distraction attempts strictly attributed to User A', async () => {
      const attempt = await BlockerService.recordAttempt(userA.id, {
        sessionId: sessionAId,
        resourceType: 'APPLICATION',
        resourceIdentifier: 'Discord (Desktop App)',
        action: 'BLOCKED',
      });

      assert.equal(attempt.userId, userA.id);
      assert.equal(attempt.resourceType, 'APPLICATION');
      assert.equal(attempt.resourceIdentifier, 'Discord (Desktop App)');
      assert.equal(attempt.action, 'BLOCKED');

      // Verify attempts count in database
      const attemptsA = await prisma.blockAttempt.findMany({
        where: { userId: userA.id },
      });
      assert.equal(attemptsA.length, 1);

      const attemptsB = await prisma.blockAttempt.findMany({
        where: { userId: userB.id },
      });
      assert.equal(attemptsB.length, 0, 'User B must have 0 distraction attempts recorded');
    });

    it('should cleanly deactivate User A session and restore standby mode', async () => {
      const deactivation = await BlockerService.deactivateBlocker(userA.id, sessionAId);
      assert.equal(deactivation.success, true);

      const activeSession = await prisma.blockerSession.findFirst({
        where: { userId: userA.id, status: 'ACTIVE' },
      });
      assert.equal(activeSession, null, 'Session must be COMPLETED');
    });
  });
});
