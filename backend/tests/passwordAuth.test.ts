import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { app } from '../src/server.js';
import { prisma } from '../src/config/prisma.js';

describe('Username and password accounts', () => {
  const server = createServer(app);
  const username = `test_${randomUUID().slice(0, 12).replace('-', '_')}`;
  const password = 'Maple window on a rainy morning';
  let base: string;

  before(async () => {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert(address && typeof address !== 'string');
    base = `http://127.0.0.1:${address.port}/api`;
  });

  after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await prisma.user.deleteMany({ where: { username } });
  });

  async function submit(action: 'register' | 'login', body: object) {
    const response = await fetch(`${base}/auth/password/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }

  it('stores only a salted password hash and opens a session after registration and login', async () => {
    const signup = await submit('register', { username: username.toUpperCase(), name: 'Maple Reader', password });
    assert.equal(signup.status, 201);
    assert.equal(signup.body.user.username, username);
    assert.equal(signup.body.user.passwordHash, undefined);
    const saved = await prisma.user.findUniqueOrThrow({ where: { username } });
    assert.match(saved.passwordHash ?? '', /^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    assert.equal(saved.email, null);
    assert.equal(saved.googleId, null);

    const duplicate = await submit('register', { username, name: 'Someone else', password });
    assert.equal(duplicate.status, 409);

    const wrongPassword = await submit('login', { username, password: password + '?' });
    const absentUser = await submit('login', { username: 'unused_' + username.slice(-12), password });
    assert.equal(wrongPassword.status, 401);
    assert.deepEqual(absentUser, wrongPassword);

    const login = await submit('login', { username, password });
    assert.equal(login.status, 200);
    const me = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${login.body.token}` } });
    assert.equal(me.status, 200);
    const { user } = await me.json();
    assert.equal(user.id, saved.id);
    assert.equal(user.passwordHash, undefined);
  });
});
