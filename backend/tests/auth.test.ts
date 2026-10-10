import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validatePasswordStrength } from '../src/controllers/authController.js';
import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../src/utils/jwt.js';

describe('🔐 ZENITH Production Authentication & Identity Engine', () => {
  describe('Password Complexity Policy', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const res = validatePasswordStrength('Ab1!');
      assert.strictEqual(res.valid, false);
      assert.ok(res.message?.includes('8 characters'));
    });

    it('should reject passwords without uppercase letter', () => {
      const res = validatePasswordStrength('lowercase1!xyz');
      assert.strictEqual(res.valid, false);
      assert.ok(res.message?.includes('uppercase'));
    });

    it('should reject passwords without number', () => {
      const res = validatePasswordStrength('NoNumbersHere!@');
      assert.strictEqual(res.valid, false);
      assert.ok(res.message?.includes('number'));
    });

    it('should reject passwords without special character', () => {
      const res = validatePasswordStrength('NoSpecialChar123');
      assert.strictEqual(res.valid, false);
      assert.ok(res.message?.includes('special character'));
    });

    it('should approve valid passwords meeting all criteria', () => {
      const res = validatePasswordStrength('ZenithSecure2026!');
      assert.strictEqual(res.valid, true);
    });
  });

  describe('JWT Verification & Claims Integrity', () => {
    it('should generate and verify tamper-proof JWT tokens', () => {
      const token = generateToken({
        userId: 'test-user-id-123',
        email: 'scholar@zenith.app',
        username: 'scholar123',
      });

      assert.ok(typeof token === 'string' && token.length > 20);

      const payload = verifyToken(token);
      assert.ok(payload);
      assert.strictEqual(payload?.userId, 'test-user-id-123');
      assert.strictEqual(payload?.username, 'scholar123');
      assert.strictEqual(payload?.email, 'scholar@zenith.app');
    });

    it('should reject invalid or tampered tokens', () => {
      const payload = verifyToken('tampered.jwt.token');
      assert.strictEqual(payload, null);
    });
  });

  describe('Database User Registration & Independent Identities', () => {
    const testUserAEmail = `test_a_${Date.now()}@zenith-test.com`;
    const testUserBEmail = `test_b_${Date.now()}@zenith-test.com`;
    const testUserAUsername = `usera_${Date.now()}`.slice(0, 18);
    const testUserBUsername = `userb_${Date.now()}`.slice(0, 18);

    it('should register two independent users with distinct verified identities', async () => {
      const hashA = await bcrypt.hash('StrongPass2026!', 10);
      const userA = await prisma.user.create({
        data: {
          name: 'First Scholar',
          username: testUserAUsername,
          email: testUserAEmail,
          passwordHash: hashA,
          settings: { create: { appearanceMode: 'dark' } },
        },
        include: { settings: true },
      });

      const hashB = await bcrypt.hash('AnotherStrongPass2026#', 10);
      const userB = await prisma.user.create({
        data: {
          name: 'Second Scholar',
          username: testUserBUsername,
          email: testUserBEmail,
          passwordHash: hashB,
          settings: { create: { appearanceMode: 'light' } },
        },
        include: { settings: true },
      });

      assert.notStrictEqual(userA.id, userB.id);
      assert.strictEqual(userA.name, 'First Scholar');
      assert.strictEqual(userB.name, 'Second Scholar');
      assert.strictEqual(userA.settings?.appearanceMode, 'dark');
      assert.strictEqual(userB.settings?.appearanceMode, 'light');

      // Verify passwords authenticate correctly
      const validA = await bcrypt.compare('StrongPass2026!', userA.passwordHash!);
      const invalidA = await bcrypt.compare('WrongPassword', userA.passwordHash!);
      assert.strictEqual(validA, true);
      assert.strictEqual(invalidA, false);

      // Verify cross-user password check fails
      const crossCheck = await bcrypt.compare('StrongPass2026!', userB.passwordHash!);
      assert.strictEqual(crossCheck, false);

      // Clean up test records
      await prisma.user.deleteMany({
        where: { id: { in: [userA.id, userB.id] } },
      });
    });
  });
});
