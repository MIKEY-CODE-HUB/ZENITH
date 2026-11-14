const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const background = readFileSync(join(__dirname, '../background.js'), 'utf8');
const roomUrl = 'https://zenith-dusky-theta.vercel.app/focus/session-room';
const sender = { url: roomUrl, tab: { id: 1, windowId: 1 }, frameId: 0 };
const activation = {
  type: 'ZENITH_BLOCKER_ACTIVATE', roomUrl, focusSessionId: 'session-id', blockerToken: 'scoped-token',
};

function createExtension() {
  const listeners = new Map();
  const event = (name) => ({ addListener: (listener) => listeners.set(name, listener) });
  const messages = [];
  const alarms = new Map();
  const status = {
    mode: 'STRICT', active: true, sessionId: 'session-id',
    allowedWebsites: ['allowed.test', 'instagram.com'], blockedWebsites: ['blocked.test', 'github.com'],
  };
  const openTabs = new Map([[1, { url: roomUrl, id: 1, windowId: 1, active: false }], [2, { id: 2, windowId: 1, active: true }]]);
  let shield;
  let rules = [];
  let updateCount = 0;
  let updateFails = false;
  let unavailable = false;
  let now = 100_000;
  const chrome = {
    storage: {
      session: {
        get: async () => ({ shield }),
        set: async (data) => { shield = data.shield; },
        remove: async () => { shield = undefined; },
      },
      local: { remove: async () => {} },
    },
    declarativeNetRequest: {
      getSessionRules: async () => rules,
      updateSessionRules: async ({ addRules }) => {
        if (updateFails && addRules.length) throw Error('invalid rule');
        rules = addRules;
        updateCount++;
      },
    },
    alarms: {
      create: async (name, alarm) => { alarms.set(name, alarm); },
      clear: async (name) => alarms.delete(name),
      onAlarm: event('alarm'),
    },
    runtime: { onMessage: event('message') },
    tabs: {
      onActivated: event('activation'), onRemoved: event('removed'),
      get: async (id) => openTabs.get(id),
      update: async (id, data) => Object.assign(openTabs.get(id), data),
      sendMessage: async (id, message) => messages.push({ id, ...message }),
    },
    windows: { onFocusChanged: event('window'), update: async () => {} },
    webNavigation: {
      getFrame: async ({ tabId }) => openTabs.get(tabId),
      onCommitted: event('committed'), onHistoryStateUpdated: event('history'), onErrorOccurred: event('navigation-error'),
    },
  };
  const context = {
    chrome, URL, Date: { now: () => now }, AbortSignal,
    console: { info() {}, error() {} },
    fetch: async (url, options) => {
      assert.equal(url.href, new URL('/api/blocker/live-status', roomUrl).href);
      assert.equal(options.headers.Authorization, 'Bearer scoped-token');
      assert.equal(options.redirect, 'error');
      if (unavailable) throw Error('offline');
      return { ok: true, json: async () => status };
    },
  };
  runInNewContext(background, context);
  return {
    status, alarms, messages, openTabs,
    get rules() { return rules; }, get updateCount() { return updateCount; },
    failRuleUpdates: () => { updateFails = true; },
    goOffline: () => { unavailable = true; },
    advance: (ms) => { now += ms; },
    send: (message = activation, source = sender) => new Promise((resolve) => {
      const listener = listeners.get('message');
      if (!listener({ expiresAt: now + 60_000, ...message }, source, resolve)) resolve(null);
    }),
    async emit(name, detail) {
      listeners.get(name)(detail);
      await runInNewContext('pendingChange', context);
      await new Promise(setImmediate);
    },
  };
}

// Evaluate the subset of DNR conditions emitted by the worker, in precedence order.
function action(rules, type, url, initiator) {
  const matches = (value, domains) => {
    const host = new URL(value).hostname;
    return domains.some(domain => host === domain || host.endsWith(`.${domain}`));
  };
  const rule = Array.from(rules).sort((a, b) => b.priority - a.priority).find(({ condition }) => (
    (!condition.resourceTypes || condition.resourceTypes.includes(type)) &&
    !condition.excludedResourceTypes?.includes(type) &&
    (!condition.requestDomains || matches(url, condition.requestDomains)) &&
    (!condition.initiatorDomains || (initiator && matches(initiator, condition.initiatorDomains))) &&
    !(condition.excludedInitiatorDomains && initiator && matches(initiator, condition.excludedInitiatorDomains))
  ));
  return rule?.action.type ?? 'allow';
}

const github = 'https://github.com';
const instagram = 'https://www.instagram.com';

test('strict rules block restricted destinations and embeds while preserving work dependencies', async () => {
  const ext = createExtension();
  assert.equal((await ext.send()).active, true);
  const { rules } = ext;
  assert.equal(action(rules, 'main_frame', instagram), 'block');
  assert.equal(action(rules, 'sub_frame', 'https://www.youtube-nocookie.com/embed/demo', github), 'block');
  assert.equal(action(rules, 'media', 'https://cdn.googlevideo.com/stream', github), 'block');
  assert.equal(action(rules, 'xmlhttprequest', 'https://api.blocked.test/data', github), 'block');
  assert.equal(action(rules, 'websocket', 'wss://gateway.discord.gg', github), 'block');
  assert.equal(action(rules, 'script', 'https://unrelated.test/script', instagram), 'block');
  assert.equal(action(rules, 'ping', 'https://unrelated.test/event', 'https://blocked.test'), 'block');
  assert.equal(action(rules, 'main_frame', github), 'allow');
  assert.equal(action(rules, 'script', 'https://unrelated.test/script', github), 'allow');
  assert.equal(action(rules, 'main_frame', 'https://sub.allowed.test'), 'allow');
  assert.equal(action(rules, 'main_frame', 'https://allowed.test.evil.test'), 'block');
  assert.equal(action(rules, 'websocket', 'wss://zenith-production.up.railway.app/socket.io', roomUrl), 'allow');
  assert.equal(action(rules, 'main_frame', roomUrl), 'allow');
});

test('Block mode allows unknown websites and Monitor installs no blocking rules', async () => {
  const ext = createExtension();
  ext.status.mode = 'MONITOR';
  assert.equal((await ext.send()).active, false);
  assert.equal(ext.rules.length, 0);
  ext.status.mode = 'BLOCK';
  assert.equal((await ext.send()).active, true);
  assert.equal(action(ext.rules, 'main_frame', 'https://unlisted.test'), 'allow');
  assert.equal(action(ext.rules, 'main_frame', instagram), 'block');
});

test('activation rejects foreign frames, a different room or an unverified session', async () => {
  const ext = createExtension();
  assert.equal(await ext.send(activation, { ...sender, frameId: 4 }), null);
  assert.equal(await ext.send(activation, { ...sender, url: 'https://unlisted.test' }), null);
  assert.equal((await ext.send({ ...activation, roomUrl: `${roomUrl}-other` })).active, false);
  assert.equal((await ext.send({ ...activation, focusSessionId: 'other-session' })).active, false);
  assert.equal(ext.rules.length, 0);
  assert.equal(ext.alarms.size, 0);
});

test('checks the current room after a client-side transition from the dashboard', async () => {
  const ext = createExtension();
  const source = { ...sender, url: new URL('/dashboard', roomUrl).href };
  assert.equal((await ext.send(activation, source)).active, true);
  ext.openTabs.get(sender.tab.id).url = source.url;
  assert.equal((await ext.send(activation, sender)).active, false);
});

test('policy changes reach the same session and server-side end removes all rules', async () => {
  const ext = createExtension();
  assert.equal((await ext.send()).active, true);
  await ext.emit('alarm', { name: 'zenith-shield-status' });
  assert.equal(ext.updateCount, 1);
  ext.status.allowedWebsites.push('newly-allowed.test');
  await ext.emit('alarm', { name: 'zenith-shield-status' });
  assert.equal(action(ext.rules, 'main_frame', 'https://newly-allowed.test'), 'allow');
  ext.status.active = false;
  await ext.emit('alarm', { name: 'zenith-shield-status' });
  assert.equal(ext.rules.length, 0);
  assert.equal(ext.alarms.size, 0);
  assert.equal(ext.messages.at(-1).active, false);
  assert.equal(ext.messages.at(-1).focusSessionId, activation.focusSessionId);
});

test('keeps last verified rules during an outage and releases them on expiry', async () => {
  const ext = createExtension();
  await ext.send();
  ext.goOffline();
  await ext.emit('alarm', { name: 'zenith-shield-status' });
  assert.ok(ext.rules.length);
  ext.advance(60_000);
  await ext.emit('alarm', { name: 'zenith-shield-expiry' });
  assert.equal(ext.rules.length, 0);
  assert.equal(ext.alarms.size, 0);
});

test('honors the server expiry, including sessions longer than two hours', async () => {
  const ext = createExtension();
  ext.status.expiresAt = 100_000 + 180 * 60_000;
  assert.equal((await ext.send({ ...activation, expiresAt: ext.status.expiresAt + 1000 })).active, true);
  assert.equal(ext.alarms.get('zenith-shield-expiry').when, ext.status.expiresAt);
});

test('failed rule install rolls back and finishing a verified session unblocks requests', async () => {
  const failed = createExtension();
  failed.failRuleUpdates();
  assert.equal((await failed.send()).active, false);
  assert.equal(failed.rules.length, 0);
  assert.equal(failed.alarms.size, 0);

  const ext = createExtension();
  await ext.send();
  await ext.send({ type: 'ZENITH_ROOM_ENDED', focusSessionId: 'wrong-session' });
  assert.ok(ext.rules.length);
  await ext.send({ type: 'ZENITH_ROOM_ENDED', focusSessionId: activation.focusSessionId });
  assert.equal(action(ext.rules, 'main_frame', instagram), 'allow');
});

test('snaps back after a top-level block, ignores failed embeds, and clears on room exit', async () => {
  const ext = createExtension();
  await ext.send();
  const blocked = { tabId: 2, url: instagram, error: 'net::ERR_BLOCKED_BY_CLIENT' };
  await ext.emit('navigation-error', { ...blocked, frameId: 2 });
  assert.equal(ext.messages.length, 0);
  await ext.emit('navigation-error', { ...blocked, frameId: 0 });
  assert.equal(ext.openTabs.get(1).active, true);
  assert.equal(ext.messages.at(-1).domain, 'www.instagram.com');
  await ext.emit('navigation-error', { ...blocked, frameId: 0 });
  assert.equal(ext.messages.length, 1);
  await ext.emit('history', { tabId: 1, frameId: 0, url: `${roomUrl}?view=other` });
  assert.ok(ext.rules.length);
  await ext.emit('history', { tabId: 1, frameId: 0, url: new URL('/dashboard', roomUrl).href });
  assert.equal(ext.rules.length, 0);
});
