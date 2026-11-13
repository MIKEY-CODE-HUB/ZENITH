import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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
