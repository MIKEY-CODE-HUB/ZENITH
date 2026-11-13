import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { prisma } from '../src/config/prisma.js';
import { app } from '../src/server.js';
import { generateToken } from '../src/utils/jwt.js';

test('resumes and discards owned sessions and exports only the signed-in account', async () => {
  const owner = await prisma.user.create({ data: { name: 'Owner', username: randomUUID(), resetToken: 'test-hidden' } });
  const stranger = await prisma.user.create({ data: { name: 'Stranger', username: randomUUID() } });
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    assert(address && typeof address !== 'string');
    const request = (user: typeof owner, path: string, body?: object) => fetch(`http://127.0.0.1:${address.port}/api${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        authorization: `Bearer ${generateToken({ userId: user.id, username: user.username })}`,
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const started = await request(owner, '/sessions/start', { specificActivity: 'Solve DSA exercises' });
    assert.equal(started.status, 201);
    const { session } = await started.json();
    const active = await request(owner, '/sessions/active');
    assert.equal((await active.json()).session.id, session.id);
    assert.equal((await (await request(stranger, '/sessions/active')).json()).session, null);
    assert.equal((await request(stranger, `/sessions/${session.id}/abandon`, {})).status, 404);
    const discard = () => request(owner, `/sessions/${session.id}/abandon`, { reason: '  Changed plans  ' });
    const responses = await Promise.all([discard(), discard()]);
    assert.deepEqual(responses.map(res => res.status), [200, 200]);
    assert.equal((await responses[0].json()).session.notes, 'Changed plans');
    assert.equal((await (await request(owner, '/sessions/active')).json()).session, null);
    assert.equal(await prisma.pointTransaction.count({ where: { sessionId: session.id } }), 0);
    assert.equal((await prisma.blockerSession.findUniqueOrThrow({ where: { focusSessionId: session.id } })).status, 'COMPLETED');

    const exported = await request(owner, '/users/export');
    assert.equal(exported.status, 200);
    assert.equal(exported.headers.get('cache-control'), 'no-store');
    const { data } = await exported.json();
    assert.equal(data.id, owner.id);
    assert.equal(data.focusSessions[0].specificActivity, 'Solve DSA exercises');
    assert.equal(data.focusSessions[0].status, 'ABANDONED');
    assert.equal('resetToken' in data, false);
    assert.equal('passwordHash' in data, false);

    const next = await request(owner, '/sessions/start', { plannedDuration: 1, protectionEnabled: false });
    const { session: nextSession } = await next.json();
    await prisma.focusSession.update({ where: { id: nextSession.id }, data: { startTime: new Date(Date.now() - 30_000) } });
    const finished = await request(owner, `/sessions/${nextSession.id}/end`, { focusedDuration: 20 });
    assert.equal(finished.status, 200);
    const saved = await request(owner, `/sessions/${nextSession.id}`);
    const summary = await saved.json();
    assert.equal(summary.scoreBreakdown.version, 1);
    assert.equal(summary.scoreBreakdown.finalScore, summary.session.focusScore);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, stranger.id] } } });
  }
});
