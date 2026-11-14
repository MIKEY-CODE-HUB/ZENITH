const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { PassThrough } = require('node:stream');
const { once } = require('node:events');
const { test } = require('node:test');
const { attachNativeHost, extensionOrigin } = require('../native/mac-shield.cjs');
const manifest = require('../../zenith-extension/manifest.json');

function frame(message) {
  const json = Buffer.from(JSON.stringify(message));
  const size = Buffer.alloc(4);
  size.writeUInt32LE(json.length);
  return Buffer.concat([size, json]);
}

test('native installer registration matches the Chrome package ID', () => {
  const fingerprint = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
  const chromeId = [...fingerprint.slice(0, 32)].map(digit => String.fromCharCode(97 + parseInt(digit, 16))).join('');
  assert.equal(extensionOrigin, `chrome-extension://${chromeId}/`);
  assert.ok(manifest.permissions.includes('nativeMessaging'));
});

test('Chrome-framed session hides an app, reports the block and stops on disconnect', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const ops = [];
  let foreground = 'Unlisted App';
  const blocked = new Promise(resolve => {
    output.on('data', data => {
      const message = JSON.parse(data.subarray(4));
      if (message.type === 'blocked') resolve(message);
    });
  });
  attachNativeHost(input, output, async (_path, args) => {
    ops.push(args);
    return { stdout: args.at(-1) === foreground ? 'hidden' : foreground };
  });
  const ping = frame({ type: 'ping' });
  const ready = once(output, 'data');
  input.write(ping.subarray(0, 2));
  input.write(ping.subarray(2));
  assert.equal(JSON.parse((await ready)[0].subarray(4)).type, 'ready');
  const active = once(output, 'data');
  input.write(frame({ type: 'protect', sessionId: 'test-id', mode: 'STRICT', expiresAt: Date.now() + 30_000,
    allowedApps: ['Code'], blockedApps: ['Discord.app'] }));
  assert.equal(JSON.parse((await active)[0].subarray(4)).type, 'active');
  assert.equal(ops.length, 1, 'unlisted apps stay available even if Chrome requests strict mode');
  foreground = 'Discord';
  assert.deepEqual(await blocked, { type: 'blocked', sessionId: 'test-id', app: 'Discord' });
  assert.equal(ops[2].at(-1), 'Discord');
  input.end();
  await once(input, 'end');
  assert.equal(ops.length, 3);
});
