const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../zenith-companion.js'), 'utf8');

test('pairs with hosted Zenith, hides a restricted Mac app, and stops when the session ends', () => {
  const origin = 'https://zenith-preview.test';
  const calls = [];
  const scripts = [];
  const timers = new Map();
  const storage = {};
  const logs = [];
  let active = true;
  let frontApp = 'Discord';
  const transport = {
    get(url, options, callback) {
      calls.push({ url: url.href, auth: options.headers.Authorization });
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', JSON.stringify({ active, mode: 'STRICT', sessionId: 'room-session' }));
      res.emit('end');
      return new EventEmitter();
    },
    request(url, options, callback) {
      calls.push({ url: url.href, auth: options.headers.Authorization });
      callback({ resume() {} });
      return Object.assign(new EventEmitter(), { write() {}, end() {} });
    },
  };
  const modules = {
    'node:child_process': { execFileSync(path, args) {
      assert.equal(path, '/usr/bin/osascript');
      scripts.push(args);
      return frontApp;
    } },
    http: transport, https: transport, path: require('node:path'),
    os: { homedir: () => '/tmp/zenith-test', release: () => 'test' },
    fs: { readFileSync() { throw Object.assign(new Error(), { code: 'ENOENT' }); }, mkdirSync() {}, chmodSync() {},
      writeFileSync(_path, content, options) { Object.assign(storage, JSON.parse(content), { mode: options.mode }); } },
  };
  const proc = {
    argv: ['node', 'zenith-companion.js', '--backend', origin, '--pair', 'test-token'], env: {}, platform: 'darwin',
    on() {}, exit(code) { assert.fail(`Unexpected exit ${code}`); },
  };
  const context = vm.createContext({
    process: proc, require: (name) => modules[name], URL, Buffer,
    setInterval: (fn, ms) => timers.set(ms, fn), console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
  });
  vm.runInContext(source, context);
  assert.deepEqual(storage, { token: 'test-token', backendUrl: origin, mode: 0o600 });
  assert.deepEqual(calls[0], { url: `${origin}/api/blocker/live-status`, auth: 'Bearer test-token' });
  frontApp = 'Google Chrome';
  timers.get(400)();
  assert.equal(scripts.length, 1);
  frontApp = 'Discord';
  timers.get(400)();
  assert.equal(scripts[2].at(-1), 'Discord');
  assert.match(scripts[2][1], /set visible/);
  assert.match(scripts[3][1], /display notification/);
  assert.equal(calls[1].url, `${origin}/api/blocker/desktop-attempt`);
  active = false;
  vm.runInContext('checking = false', context);
  timers.get(2000)();
  timers.get(400)();
  assert.equal(scripts.length, 4);
  assert.ok(logs.flat().some(line => line.includes('standby')));
});
