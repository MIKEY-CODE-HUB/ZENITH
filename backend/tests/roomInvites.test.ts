import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { app } from '../src/server.js';
import { prisma } from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

test('private room invites authorize entry, can be rotated and revoked, and expire', async () => {
  const owner = await prisma.user.create({ data: { name: 'Host', username: randomUUID() } });
  const guest = await prisma.user.create({ data: { name: 'Guest', username: randomUUID() } });
  const outsider = await prisma.user.create({ data: { name: 'Outsider', username: randomUUID() } });
  const room = await prisma.room.create({ data: {
    name: 'Invite-only study room', creatorId: owner.id, roomCode: randomUUID(), isPrivate: true,
  } });
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => server.once('listening', resolve).once('error', reject));
    const address = server.address();
    assert(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api/rooms/${room.id}`;
    const request = (user: typeof owner, path = '', method = 'GET', body?: object) =>
      fetch(base + path, {
        method,
        headers: {
          authorization: `Bearer ${generateToken({ userId: user.id, username: user.username })}`,
          'content-type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    assert.equal((await request(guest)).status, 404);
    assert.equal((await request(guest, '/join', 'POST')).status, 404);
    assert.equal((await request(guest, '/invite', 'POST')).status, 404);
    const issued = await request(owner, '/invite', 'POST');
    assert.equal(issued.status, 200);
    assert.equal(issued.headers.get('cache-control'), 'no-store');
    const { token } = await issued.json();
    assert.notEqual((await prisma.roomInvite.findUniqueOrThrow({ where: { roomId: room.id } })).tokenHash, token);
    assert.equal((await request(guest, '/join', 'POST', { inviteToken: token })).status, 200);
    assert.equal((await request(guest)).status, 200);

    process.env.TURN_URLS = 'turn:relay.example.test:3478';
    process.env.TURN_SHARED_SECRET = 'local-test-secret';
    try {
      assert.equal((await request(outsider, '/ice-servers')).status, 403);
      const config = await request(guest, '/ice-servers');
      assert.equal(config.status, 200);
      assert.equal(config.headers.get('cache-control'), 'no-store');
      const { iceServers: [relay] } = await config.json();
      assert.equal(relay.credential, createHmac('sha1', process.env.TURN_SHARED_SECRET).update(relay.username).digest('base64'));
      assert.equal(relay.username.split(':')[1], guest.id);
      assert.equal(relay.urls[0], 'turn:relay.example.test:3478');
    } finally {
      delete process.env.TURN_URLS;
      delete process.env.TURN_SHARED_SECRET;
    }

    const rotated = await request(owner, '/invite', 'POST');
    assert.equal(rotated.status, 200);
    const replacement = (await rotated.json()).token;
    assert.equal((await request(outsider, '/join', 'POST', { inviteToken: token })).status, 404);
    assert.equal((await request(outsider, '/invite', 'DELETE')).status, 404);
    assert.equal((await request(owner, '/invite', 'DELETE')).status, 200);
    assert.equal((await request(outsider, '/join', 'POST', { inviteToken: replacement })).status, 404);
    assert.equal((await request(guest, '/join', 'POST')).status, 200);

    const expiring = await request(owner, '/invite', 'POST');
    assert.equal(expiring.status, 200);
    const expiringToken = (await expiring.json()).token;
    await prisma.roomInvite.update({ where: { roomId: room.id }, data: { expiresAt: new Date(0) } });
    assert.equal((await request(outsider, '/join', 'POST', { inviteToken: expiringToken })).status, 404);

    await prisma.room.update({ where: { id: room.id }, data: { category: 'INTERACTION' } });
    const interactionInvite = await request(owner, '/invite', 'POST');
    const interactionToken = (await interactionInvite.json()).token;
    assert.equal((await request(outsider, '/join', 'POST', { inviteToken: interactionToken })).status, 402);
    assert.equal((await request(outsider, '/join', 'POST', { inviteToken: interactionToken, confirmInteraction: true })).status, 402);
    await prisma.pointTransaction.create({ data: { userId: outsider.id, amount: 20, type: 'SESSION_COMPLETED', source: 'SESSION' } });
    const join = () => request(outsider, '/join', 'POST', { inviteToken: interactionToken, confirmInteraction: true });
    assert.deepEqual((await Promise.all([join(), join()])).map(response => response.status), [200, 200]);
    const debits = await prisma.pointTransaction.findMany({ where: { userId: outsider.id, source: 'INTERACTION_ENTRY' } });
    assert.deepEqual(debits.map(debit => debit.amount), [-6]);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await prisma.room.delete({ where: { id: room.id } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, guest.id, outsider.id] } } });
  }
});

test('hosting returns a private room and a revocable code that admits members', async () => {
  const owner = await prisma.user.create({ data: { name: 'Code Host', username: randomUUID() } });
  const guest = await prisma.user.create({ data: { name: 'Code Guest', username: randomUUID() } });
  const server = app.listen(0, '127.0.0.1');
  let roomId: string | undefined;
  try {
    await new Promise<void>((resolve, reject) => server.once('listening', resolve).once('error', reject));
    const address = server.address();
    assert(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api/rooms`;
    const request = (path: string, user: typeof owner | undefined, method = 'GET', body?: object) =>
      fetch(base + path, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(user ? { authorization: `Bearer ${generateToken({ userId: user.id, username: user.username })}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    assert.equal((await request('/host', undefined, 'POST', { name: 'Study with a code' })).status, 401);
    const hosted = await request('/host', owner, 'POST', { name: 'Study with a code', isPrivate: true });
    assert.equal(hosted.status, 201);
    assert.equal(hosted.headers.get('cache-control'), 'no-store');
    const { room, invitation } = await hosted.json();
    roomId = room.id as string;
    assert.equal(room.isPrivate, true);
    assert.match(invitation.code, /^(?:[0-9A-F]{4}-){3}[0-9A-F]{4}$/);
    const stored = await prisma.roomInvite.findUniqueOrThrow({ where: { roomId } });
    assert.notEqual(stored.codeHash, invitation.code);
    assert.equal((await request(`/${roomId}`, guest)).status, 404);
    assert.equal((await request('/join-by-code', undefined, 'POST', { inviteCode: invitation.code })).status, 401);
    assert.equal((await request('/join-by-code', guest, 'POST', { inviteCode: 'DEAD-BEEF-0000-0000' })).status, 404);

    const enter = (code: string) => request('/join-by-code', guest, 'POST', { inviteCode: code });
    const first = await enter(invitation.code.toLowerCase().replace(/-/g, ' '));
    assert.equal(first.status, 200);
    assert.equal((await first.json()).participant.role, 'MEMBER');
    assert.equal((await request(`/${roomId}`, guest)).status, 200);
    const host = await request(`/${roomId}/join`, owner, 'POST');
    assert.equal(host.status, 200);
    assert.equal((await host.json()).participant.role, 'HOST');

    const rotated = await request(`/${roomId}/invite`, owner, 'POST');
    assert.equal(rotated.status, 200);
    const replacement = await rotated.json();
    assert.equal((await enter(invitation.code)).status, 404);
    await prisma.roomInvite.update({ where: { roomId }, data: { expiresAt: new Date(0) } });
    assert.equal((await enter(replacement.code)).status, 404);
    assert.equal((await request(`/${roomId}/invite`, owner, 'DELETE')).status, 200);
    assert.equal((await enter(replacement.code)).status, 404);

    await prisma.room.update({ where: { id: roomId }, data: { category: 'INTERACTION' } });
    const paidInvite = await request(`/${roomId}/invite`, owner, 'POST');
    const { code: paidCode } = await paidInvite.json();
    assert.equal((await enter(paidCode)).status, 402);
    await prisma.pointTransaction.create({ data: { userId: guest.id, amount: 20, type: 'SESSION_COMPLETED', source: 'SESSION' } });
    const confirm = () => request('/join-by-code', guest, 'POST', { inviteCode: paidCode, confirmInteraction: true });
    assert.deepEqual((await Promise.all([confirm(), confirm()])).map(response => response.status), [200, 200]);
    const debits = await prisma.pointTransaction.findMany({ where: { userId: guest.id, source: 'INTERACTION_ENTRY' } });
    assert.deepEqual(debits.map(debit => debit.amount), [-6]);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (roomId) await prisma.room.delete({ where: { id: roomId } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, guest.id] } } });
  }
});
