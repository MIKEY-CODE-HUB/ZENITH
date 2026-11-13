import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { app, server } from '../src/server.js';
import { prisma } from '../src/config/prisma.js';

describe('🚀 Staging Endpoints Readiness & Verification Suite', () => {
  let testServer: http.Server;
  let testPort: number;

  before(async () => {
    testServer = http.createServer(app);
    await new Promise<void>((resolve) => {
      testServer.listen(0, () => {
        const addr = testServer.address();
        if (typeof addr === 'object' && addr !== null) {
          testPort = addr.port;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    });
  });

  it('GET /api/ready should execute SELECT 1 on PostgreSQL and return HTTP 200 { status: "ready" }', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/ready`);
    assert.strictEqual(res.status, 200, `Expected 200 but received ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.status, 'ready');
  });

  it('GET /api/rooms should query PostgreSQL and return HTTP 200 with room catalog', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/rooms`);
    assert.strictEqual(res.status, 200, `Expected 200 but received ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.rooms), 'Rooms should be an array');
  });

  it('Next.js API proxy contract: forwards /api/ready and preserves HTTP 200', async () => {
    const backendUrl = `http://127.0.0.1:${testPort}/api`;
    const targetReady = `${backendUrl}/ready`;
    const upstreamRes = await fetch(targetReady);
    assert.strictEqual(upstreamRes.status, 200);
    const body = await upstreamRes.json();
    assert.strictEqual(body.status, 'ready');
  });

  it('Next.js API proxy contract: forwards /api/rooms and preserves HTTP 200', async () => {
    const backendUrl = `http://127.0.0.1:${testPort}/api`;
    const targetRooms = `${backendUrl}/rooms`;
    const upstreamRes = await fetch(targetRooms);
    assert.strictEqual(upstreamRes.status, 200);
    const body = await upstreamRes.json();
    assert.strictEqual(body.success, true);
  });
});
