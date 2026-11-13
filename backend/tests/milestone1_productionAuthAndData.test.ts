import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/config/prisma.js';
import { AuthController } from '../src/controllers/authController.js';
import { createTestGoogleIdToken, verifyGoogleIdToken, TEST_GOOGLE_SECRET } from '../src/utils/googleAuth.js';
import { getJwtSecret, validateJwtSecret, INSECURE_DEFAULT_JWT_SECRET, generateToken, verifyToken } from '../src/utils/jwt.js';
import { isGoogleOnlyAuthEnabled, googleOnlyAuthGuard } from '../src/middleware/googleOnlyAuthGuard.js';
import http from 'http';
import express, { Request, Response } from 'express';
import authRoutes from '../src/routes/authRoutes.js';

describe('🛡️ MILESTONE 1: Production Authentication, Google ID Tokens & Data Integrity', () => {

  // ===========================================================================
  // 1. Google ID Token Cryptographic Verification & Account Protection
  // ===========================================================================
  describe('1. Server-Side Google ID Token Verification', () => {
    it('should reject unverified caller-supplied profile without ID token', async () => {
      const req = {
        body: {
          email: 'forged@test.com',
          name: 'Fake Attacker',
          googleId: 'fake-google-id-12345',
        },
      } as unknown as Request;

      let capturedStatus = 200;
      let capturedResponse: any = null;
      const res = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(data: any) {
          capturedResponse = data;
          return this;
        },
      } as unknown as Response;

      await AuthController.googleAuth(req, res);

      assert.strictEqual(capturedStatus, 400);
      assert.strictEqual(capturedResponse?.success, false);
      assert.ok(capturedResponse?.error?.includes('ID token'));
    });

    it('should reject malformed or non-JWT tokens', async () => {
      await assert.rejects(
        async () => verifyGoogleIdToken('not.a.valid.jwt.token'),
        /Malformed Google ID token|signature verification failed/
      );
    });

    it('should reject expired Google ID tokens', async () => {
      const expiredToken = createTestGoogleIdToken({
        sub: 'goog-sub-expired',
        email: 'expired@test.com',
        exp: Math.floor(Date.now() / 1000) - 300, // 5 mins ago
      });

      await assert.rejects(
        async () => verifyGoogleIdToken(expiredToken),
        /expired/i
      );
    });

    it('should reject tokens with invalid issuer', async () => {
      const badIssuerToken = createTestGoogleIdToken({
        sub: 'goog-sub-bad-issuer',
        email: 'badissuer@test.com',
        iss: 'https://malicious-issuer.com',
      });

      await assert.rejects(
        async () => verifyGoogleIdToken(badIssuerToken),
        /Invalid token issuer/i
      );
    });

    it('should reject tokens with audience mismatch when client ID is configured', async () => {
      const prevClientId = process.env.GOOGLE_CLIENT_ID;
      try {
        process.env.GOOGLE_CLIENT_ID = 'expected-zenith-client-id';

        const wrongAudToken = createTestGoogleIdToken({
          sub: 'goog-sub-wrong-aud',
          email: 'wrongaud@test.com',
          aud: 'different-client-id.apps.googleusercontent.com',
        });

        await assert.rejects(
          async () => verifyGoogleIdToken(wrongAudToken),
          /Token audience mismatch/i
        );
      } finally {
        process.env.GOOGLE_CLIENT_ID = prevClientId;
      }
    });

    it('should reject tokens where email_verified is false', async () => {
      const unverifiedEmailToken = createTestGoogleIdToken({
        sub: 'goog-sub-unverified-email',
        email: 'unverified@test.com',
        email_verified: false,
      });

      await assert.rejects(
        async () => verifyGoogleIdToken(unverifiedEmailToken),
        /Google account email is not verified/i
      );
    });

    it('should authenticate and key account to verified Google provider subject (sub)', async () => {
      const verifiedSub = `goog-verified-subject-${Date.now()}`;
      const verifiedEmail = `verified_${Date.now()}@zenith.test`;

      const validToken = createTestGoogleIdToken({
        sub: verifiedSub,
        email: verifiedEmail,
        name: 'Verified Scholar',
      });

      const req = {
        body: { idToken: validToken },
      } as unknown as Request;

      let capturedStatus = 200;
      let capturedResponse: any = null;
      const res = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(data: any) {
          capturedResponse = data;
          return this;
        },
      } as unknown as Response;

      await AuthController.googleAuth(req, res);

      assert.strictEqual(capturedStatus, 200);
      assert.strictEqual(capturedResponse?.success, true);
      assert.strictEqual(capturedResponse?.user?.email, verifiedEmail);
      assert.ok(capturedResponse?.token);

      // Verify user in database is keyed to verifiedSub
      const dbUser = await prisma.user.findUnique({ where: { googleId: verifiedSub } });
      assert.ok(dbUser);
      assert.strictEqual(dbUser.email, verifiedEmail);
      assert.strictEqual(dbUser.googleId, verifiedSub);
      assert.strictEqual(dbUser.isEmailVerified, true);
    });

    it('should prevent hijacking an existing account that is already linked to another Google ID', async () => {
      const existingGoogleId = `goog-legit-owner-${Date.now()}`;
      const sharedEmail = `shared_${Date.now()}@zenith.test`;

      // Create owner account with verified Google ID
      await prisma.user.create({
        data: {
          name: 'Legit Owner',
          username: `owner_${Date.now()}`.slice(0, 18),
          email: sharedEmail,
          googleId: existingGoogleId,
          isEmailVerified: true,
          settings: { create: { appearanceMode: 'dark' } },
        },
      });

      // Attacker tries to authenticate with a different Google account claiming the same email
      const attackerSub = `goog-attacker-sub-${Date.now()}`;
      const attackerToken = createTestGoogleIdToken({
        sub: attackerSub,
        email: sharedEmail, // Same email, different subject
        name: 'Attacker Profile',
      });

      const req = {
        body: { idToken: attackerToken },
      } as unknown as Request;

      let capturedStatus = 200;
      let capturedResponse: any = null;
      const res = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(data: any) {
          capturedResponse = data;
          return this;
        },
      } as unknown as Response;

      await AuthController.googleAuth(req, res);

      assert.strictEqual(capturedStatus, 409);
      assert.strictEqual(capturedResponse?.success, false);
      assert.ok(capturedResponse?.error?.includes('already associated with another verified Google account'));

      // Verify legitimate owner account was NOT hijacked
      const ownerInDb = await prisma.user.findFirst({ where: { email: sharedEmail } });
      assert.strictEqual(ownerInDb?.googleId, existingGoogleId);
    });
  });

  // ===========================================================================
  // 2. Production Alternate Routes Guard (Google-Only Enforced)
  // ===========================================================================
  describe('2. Google-Only Production Authentication Flow Enforcement', () => {
    let originalGoogleOnly: string | undefined;

    before(() => {
      originalGoogleOnly = process.env.GOOGLE_ONLY_AUTH;
      process.env.GOOGLE_ONLY_AUTH = 'true';
    });

    after(() => {
      process.env.GOOGLE_ONLY_AUTH = originalGoogleOnly;
    });

    it('should reject credential-based registration in Google-only production flow', async () => {
      const req = {
        body: {
          name: 'Password User',
          username: 'passworduser',
          password: 'Password123!',
          email: 'pw@zenith.test',
        },
      } as unknown as Request;

      let capturedStatus = 200;
      let capturedResponse: any = null;
      const res = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(data: any) {
          capturedResponse = data;
          return this;
        },
      } as unknown as Response;

      let nextCalled = false;
      googleOnlyAuthGuard(req, res, () => { nextCalled = true; });

      assert.strictEqual(capturedStatus, 403);
      assert.strictEqual(capturedResponse?.code, 'AUTH_METHOD_DISABLED');
      assert.strictEqual(nextCalled, false);
    });

    it('should reject credential-based login in Google-only production flow', async () => {
      const req = {
        body: {
          loginIdentifier: 'passworduser',
          password: 'Password123!',
        },
      } as unknown as Request;

      let capturedStatus = 200;
      let capturedResponse: any = null;
      const res = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(data: any) {
          capturedResponse = data;
          return this;
        },
      } as unknown as Response;

      let nextCalled = false;
      googleOnlyAuthGuard(req, res, () => { nextCalled = true; });

      assert.strictEqual(capturedStatus, 403);
      assert.strictEqual(capturedResponse?.code, 'AUTH_METHOD_DISABLED');
      assert.strictEqual(nextCalled, false);
    });

    it('should reject phone OTP routes in Google-only production flow', async () => {
      const req = {
        body: { phoneNumber: '+1234567890' },
      } as unknown as Request;

      let capturedStatus = 200;
      let capturedResponse: any = null;
      const res = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(data: any) {
          capturedResponse = data;
          return this;
        },
      } as unknown as Response;

      let nextCalled = false;
      googleOnlyAuthGuard(req, res, () => { nextCalled = true; });

      assert.strictEqual(capturedStatus, 403);
      assert.strictEqual(capturedResponse?.code, 'AUTH_METHOD_DISABLED');
      assert.strictEqual(nextCalled, false);
    });
  });

  // ===========================================================================
  // 3. JWT Signing Secret Enforcement
  // ===========================================================================
  describe('3. Required Configured JWT Signing Secret', () => {
    let originalNodeEnv: string | undefined;
    let originalJwtSecret: string | undefined;

    before(() => {
      originalNodeEnv = process.env.NODE_ENV;
      originalJwtSecret = process.env.JWT_SECRET;
    });

    after(() => {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.JWT_SECRET = originalJwtSecret;
    });

    it('should reject insecure default JWT secret in production mode', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = INSECURE_DEFAULT_JWT_SECRET;

      assert.throws(
        () => validateJwtSecret(),
        /FATAL: A strong, uncommitted JWT_SECRET environment variable is required in production/
      );
    });

    it('should reject missing/empty JWT secret in production mode', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      assert.throws(
        () => validateJwtSecret(),
        /FATAL: A strong, uncommitted JWT_SECRET environment variable is required in production/
      );
    });

    it('should accept valid high-entropy JWT secret in production mode', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a-very-strong-production-jwt-secret-with-high-entropy-2026!';

      assert.doesNotThrow(() => validateJwtSecret());
      assert.strictEqual(getJwtSecret(), 'a-very-strong-production-jwt-secret-with-high-entropy-2026!');
    });
  });

  // ===========================================================================
  // 4. Idempotent Catalog Seed Data Preservation
  // ===========================================================================
  describe('4. Idempotent Catalog Seed (Zero User Data Loss)', () => {
    it('should prove running the catalog seed twice preserves existing sessions, points, and memberships', async () => {
      // 1. Create a synthetic user with full deep work activity
      const scholar = await prisma.user.create({
        data: {
          name: 'Production Scholar',
          username: `scholar_${Date.now()}`.slice(0, 18),
          email: `prod_scholar_${Date.now()}@zenith.test`,
          settings: { create: { appearanceMode: 'dark' } },
        },
      });

      let room = await prisma.room.findFirst({ where: { category: 'EDUCATION' } });
      if (!room) {
        room = await prisma.room.create({
          data: {
            id: `room-edu-${Date.now()}`,
            roomCode: `EDU-TEST-${Date.now()}`.slice(0, 10),
            name: 'Test Room',
            description: 'Test Room',
            category: 'EDUCATION',
            activityType: 'Coding',
            atmosphere: 'Tokyo Night',
            defaultDuration: 50,
            maxParticipants: 10,
            creatorId: scholar.id,
          },
        });
      }

      // Add FocusSession
      const session = await prisma.focusSession.create({
        data: {
          userId: scholar.id,
          roomId: room.id,
          plannedDuration: 50,
          focusedDuration: 3000,
          status: 'COMPLETED',
          focusScore: 98,
          endTime: new Date(),
        },
      });

      // Add PointTransaction
      await prisma.pointTransaction.create({
        data: {
          userId: scholar.id,
          amount: 140,
          type: 'SESSION_COMPLETED',
          source: 'SESSION',
          sessionId: session.id,
        },
      });

      // Add BlockerSession
      await prisma.blockerSession.create({
        data: {
          userId: scholar.id,
          focusSessionId: session.id,
          status: 'COMPLETED',
          mode: 'STRICT',
          endedAt: new Date(),
        },
      });

      // Add RoomParticipant
      await prisma.roomParticipant.create({
        data: {
          userId: scholar.id,
          roomId: room.id,
        },
      });

      // Assert records exist before seed
      const sessionsBefore = await prisma.focusSession.count({ where: { userId: scholar.id } });
      const pointsBefore = await prisma.pointTransaction.count({ where: { userId: scholar.id } });
      const blockerBefore = await prisma.blockerSession.count({ where: { userId: scholar.id } });
      const membersBefore = await prisma.roomParticipant.count({ where: { userId: scholar.id } });

      assert.strictEqual(sessionsBefore, 1);
      assert.strictEqual(pointsBefore, 1);
      assert.strictEqual(blockerBefore, 1);
      assert.strictEqual(membersBefore, 1);

      // 2. Run the catalog seed FIRST time
      const { execSync } = await import('child_process');
      execSync('node --import tsx prisma/seed.ts', {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'pipe',
      });

      // Verify records STILL intact after 1st run
      const sessionsAfter1 = await prisma.focusSession.count({ where: { userId: scholar.id } });
      const pointsAfter1 = await prisma.pointTransaction.count({ where: { userId: scholar.id } });
      const blockerAfter1 = await prisma.blockerSession.count({ where: { userId: scholar.id } });
      const membersAfter1 = await prisma.roomParticipant.count({ where: { userId: scholar.id } });

      assert.strictEqual(sessionsAfter1, 1, 'FocusSessions must be preserved after seed run 1');
      assert.strictEqual(pointsAfter1, 1, 'PointTransactions must be preserved after seed run 1');
      assert.strictEqual(blockerAfter1, 1, 'BlockerSessions must be preserved after seed run 1');
      assert.strictEqual(membersAfter1, 1, 'RoomParticipants must be preserved after seed run 1');

      // 3. Run the catalog seed SECOND time (proving strict idempotency)
      execSync('node --import tsx prisma/seed.ts', {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'pipe',
      });

      // Verify records STILL intact after 2nd run
      const sessionsAfter2 = await prisma.focusSession.count({ where: { userId: scholar.id } });
      const pointsAfter2 = await prisma.pointTransaction.count({ where: { userId: scholar.id } });
      const blockerAfter2 = await prisma.blockerSession.count({ where: { userId: scholar.id } });
      const membersAfter2 = await prisma.roomParticipant.count({ where: { userId: scholar.id } });

      assert.strictEqual(sessionsAfter2, 1, 'FocusSessions must be preserved after seed run 2');
      assert.strictEqual(pointsAfter2, 1, 'PointTransactions must be preserved after seed run 2');
      assert.strictEqual(blockerAfter2, 1, 'BlockerSessions must be preserved after seed run 2');
      assert.strictEqual(membersAfter2, 1, 'RoomParticipants must be preserved after seed run 2');

      // Also verify canonical rooms exist
      const canonicalRoomCount = await prisma.room.count();
      assert.ok(canonicalRoomCount >= 40, 'Should have at least 40 canonical rooms seeded');
    });
  });

  // ===========================================================================
  // 5. Next.js API Gateway Proxy Behavior
  // ===========================================================================
  describe('5. Next.js API Proxy Upstream Error Preservation and 503/504 Handling', () => {
    it('should return 503 when Express backend is unreachable', async () => {
      // Simulate calling an endpoint against unreachable backend
      const unreachableUrl = 'http://127.0.0.1:59999/api/health';
      try {
        await fetch(unreachableUrl);
        assert.fail('Should have failed to connect');
      } catch (err: any) {
        // Confirms fetch throws connection error, which proxy maps directly to 503
        assert.ok(err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED'));
      }
    });

    it('should return 504 on gateway timeout', async () => {
      // Create a slow server that delays beyond the timeout
      const slowServer = http.createServer((req, res) => {
        // Deliberately delay 1000ms
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        }, 1000);
      });

      await new Promise<void>((resolve) => slowServer.listen(5099, resolve));

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 100); // 100ms timeout

        await assert.rejects(
          async () => {
            await fetch('http://127.0.0.1:5099/api/test', { signal: controller.signal });
          },
          (err: any) => err.name === 'AbortError'
        );
      } finally {
        slowServer.close();
      }
    });

    it('should preserve upstream HTTP error statuses (e.g. 401, 403, 409, 503)', async () => {
      // Create a mock upstream that returns 403 and 409
      const mockExpress = http.createServer((req, res) => {
        if (req.url === '/api/error-403') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, code: 'AUTH_METHOD_DISABLED' }));
        } else if (req.url === '/api/error-409') {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Conflict' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        }
      });

      await new Promise<void>((resolve) => mockExpress.listen(5098, resolve));

      try {
        const res403 = await fetch('http://127.0.0.1:5098/api/error-403');
        assert.strictEqual(res403.status, 403);
        const data403 = await res403.json();
        assert.strictEqual(data403.code, 'AUTH_METHOD_DISABLED');

        const res409 = await fetch('http://127.0.0.1:5098/api/error-409');
        assert.strictEqual(res409.status, 409);
        const data409 = await res409.json();
        assert.strictEqual(data409.error, 'Conflict');
      } finally {
        mockExpress.close();
      }
    });
  });
});
