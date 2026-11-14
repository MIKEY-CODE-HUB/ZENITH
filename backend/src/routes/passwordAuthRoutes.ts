import { Router } from 'express';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import { generateToken } from '../utils/jwt.js';

const router = Router();
const usernamePattern = /^[a-z0-9_]{3,24}$/;
const hashPrefix = 'scrypt-v1';
const keyLength = 64;
const attemptWindow = 15 * 60 * 1000;
const attemptBuckets = new Map<string, { count: number; expiresAt: number }>();
let nextSweep = 0;
let activeHashes = 0;
const fallbackSalt = randomBytes(16);

function takeAttempt(key: string, limit: number) {
  const now = Date.now();
  if (now >= nextSweep) {
    for (const [entry, bucket] of attemptBuckets) {
      if (bucket.expiresAt <= now) attemptBuckets.delete(entry);
    }
    nextSweep = now + 60_000;
  }

  const existing = attemptBuckets.get(key);
  if (existing && existing.expiresAt > now) {
    if (existing.count >= limit) return false;
    existing.count++;
    return true;
  }

  if (attemptBuckets.size >= 10_000) return false;
  attemptBuckets.set(key, { count: 1, expiresAt: now + attemptWindow });
  return true;
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { N: 2 ** 16, r: 8, p: 2, maxmem: 80 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

const userFields = {
  id: true, name: true, username: true, email: true, phoneNumber: true,
  avatarUrl: true, preferredActivity: true, typicalDuration: true, settings: true,
} as const;

router.post('/:action(register|login)', async (req, res) => {
  const signup = req.params.action === 'register';
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const password = req.body?.password;
  res.setHeader('Cache-Control', 'no-store');

  if (!usernamePattern.test(username) || typeof password !== 'string' ||
      password.length < 12 || Buffer.byteLength(password, 'utf8') > 256 ||
      (signup && (!name || name.length > 80))) {
    res.status(400).json({ success: false, error: signup
      ? 'Enter your name, a username with 3–24 letters, numbers or underscores, and a password of at least 12 characters (up to 256 bytes).'
      : 'Enter your username and password.' });
    return;
  }

  if (activeHashes >= 2) {
    res.setHeader('Retry-After', '2');
    res.status(429).json({ success: false, error: 'Sign-in is busy. Wait a moment and try again.' });
    return;
  }
  if (!takeAttempt(`${req.params.action}:${username}`, signup ? 5 : 12)) {
    res.setHeader('Retry-After', String(attemptWindow / 1000));
    res.status(429).json({ success: false, error: 'Too many attempts for this username. Try again in 15 minutes.' });
    return;
  }

  activeHashes++;
  try {
    if (signup) {
      const salt = randomBytes(16);
      const key = await deriveKey(password, salt);
      const user = await prisma.user.create({
        data: {
          name, username,
          passwordHash: [hashPrefix, salt.toString('hex'), key.toString('hex')].join('$'),
          isEmailVerified: false,
          settings: { create: {} },
        },
        select: userFields,
      });
      attemptBuckets.delete(`register:${username}`);
      res.status(201).json({ success: true, user, token: generateToken({ userId: user.id, username }) });
      return;
    }

    const account = await prisma.user.findUnique({
      where: { username },
      select: { ...userFields, googleId: true, passwordHash: true },
    });
    const [version, encodedSalt, encodedKey] = account?.passwordHash?.split('$') ?? [];
    const validHash = account && !account.email && !account.phoneNumber && !account.googleId &&
      version === hashPrefix && /^[a-f0-9]{32}$/.test(encodedSalt) && /^[a-f0-9]{128}$/.test(encodedKey);
    const key = await deriveKey(password, validHash ? Buffer.from(encodedSalt, 'hex') : fallbackSalt);
    if (!validHash || !timingSafeEqual(key, Buffer.from(encodedKey, 'hex'))) {
      res.status(401).json({ success: false, error: 'Username or password is incorrect.' });
      return;
    }

    const { googleId, passwordHash, ...user } = account;
    attemptBuckets.delete(`login:${username}`);
    res.json({ success: true, user, token: generateToken({ userId: user.id, username }) });
  } catch (error) {
    if (signup && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ success: false, error: 'That username is taken. Try another one.' });
      return;
    }
    logger.error('auth.password.error', { action: req.params.action });
    res.status(500).json({ success: false, error: 'Could not open your account. Try again shortly.' });
  } finally {
    activeHashes--;
  }
});

export default router;
