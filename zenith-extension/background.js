const TIER_1_ALWAYS_BLOCKED = [
  'instagram.com',
  'web.whatsapp.com',
  'reddit.com',
  'youtube.com',
  'netflix.com',
  'tiktok.com',
  'discord.com',
  'x.com',
  'twitter.com',
  'primevideo.com',
  'twitch.tv',
  'crunchyroll.com',
  'animekai.to',
  '9animetv.to',
  'aniwatchtv.to',
  'hulu.com',
  'disneyplus.com',
  // Alternate entry points and dedicated service hosts. Keep shared CDNs available.
  'youtu.be', 'youtube-nocookie.com', 'googlevideo.com', 'ytimg.com',
  'discord.gg', 'discordapp.com', 'discordapp.net',
  'redd.it', 'redditmedia.com', 'redditstatic.com',
  'instagramcdn.com', 'cdninstagram.com', 'whatsapp.net',
  'tiktokcdn.com', 'tiktokv.com', 'twimg.com', 't.co',
  'nflxvideo.net', 'nflximg.net', 'ttvnw.net',
];

// ── TIER 2: ESSENTIAL PRODUCTIVITY & STUDY TOOLS (ALWAYS ALLOWED) ───────────
const TIER_2_ALWAYS_ALLOWED = [
  'google.com',
  'google.co.in',
  'google.co.uk',
  'google.ca',
  'google.de',
  'google.fr',
  'github.com',
  'github.dev',
  'githubusercontent.com',
  'githubassets.com',
  'gist.github.com',
  'leetcode.com',
  'leetcode.cn',
  'codeforces.com',
  'codeforces.org',
  'codechef.com',
  'hackerrank.com',
  'chess.com',
  'lichess.org',
  'developer.mozilla.org',
  'stackoverflow.com',
  'stackexchange.com',
  'sstatic.net',
  'w3schools.com',
  'geeksforgeeks.org',
  'docs.google.com',
  'drive.google.com',
  'vscode.dev',
  'localhost',
  '127.0.0.1',
];

const trustedOrigins = new Set([
  'https://zenith-dusky-theta.vercel.app',
  'https://zenith-git-fix-zenith-room-re-944e0c-mikey-sketch-hubs-projects.vercel.app',
  'https://zenith-git-fix-zenith-launch-6c62e3-mikey-sketch-hubs-projects.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const expiryAlarm = 'zenith-shield-expiry';
const statusAlarm = 'zenith-shield-status';
const maxSessionLength = 241 * 60_000;
let pendingChange = Promise.resolve();
let lastAttempt;

function reportError(error) {
  console.error('shield.update_failed', error.name);
}

function serialize(action) {
  const result = pendingChange.then(action);
  pendingChange = result.catch(reportError);
  return result;
}

function parseUrl(value) {
  try { return new URL(value); } catch { return null; }
}

function domains(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((domain) => typeof domain === 'string')
    .map((domain) => domain.trim().toLowerCase().replace(/\.$/, ''))
    .filter((domain) => /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain) && domain.length <= 253))]
    .sort();
}

function matches(host, list) {
  return list.some((domain) => host === domain || host.endsWith('.' + domain));
}

function sameRoom(value, room) {
  const target = parseUrl(value);
  return target?.origin === room.origin && target.pathname.replace(/\/$/, '') === room.pathname.replace(/\/$/, '');
}

async function getSession() {
  return (await chrome.storage.session.get('shield')).shield;
}

function buildRules(session) {
  if (!session) return [];

  const rules = [];
  const add = (priority, type, condition) => {
    if (Object.values(condition).some((value) => Array.isArray(value) && !value.length)) return;
    rules.push({ id: priority, priority, action: { type }, condition });
  };

  // Destination policy also applies to embedded frames, fetch/XHR, media and handshakes.
  // Exempt only main-frame navigation from the generic dependency policy below.
  const navigation = { resourceTypes: ['main_frame'] };
  const dependency = { excludedResourceTypes: ['main_frame'] };
  for (const [condition, offset] of [[navigation, 0], [dependency, 100]]) {
    add(60 + offset, 'allow', { ...condition, requestDomains: [new URL(session.url).hostname] });
    add(50 + offset, 'block', { ...condition, requestDomains: TIER_1_ALWAYS_BLOCKED });
    add(40 + offset, 'allow', { ...condition, requestDomains: TIER_2_ALWAYS_ALLOWED });
    add(30 + offset, 'allow', { ...condition, requestDomains: session.allowed });
    add(20 + offset, 'block', { ...condition, requestDomains: session.blocked });
  }

  // Already open distraction pages cannot start new requests to unrelated hosts.
  // Exceptions mirror the destination priority for personal rules.
  add(155, 'block', { ...dependency, initiatorDomains: TIER_1_ALWAYS_BLOCKED });
  add(154, 'block', {
    ...dependency,
    initiatorDomains: session.blocked,
    excludedInitiatorDomains: [...TIER_2_ALWAYS_ALLOWED, ...session.allowed, new URL(session.url).hostname],
  });
  // Strict mode denies unknown websites on navigation. Their dependencies are
  // permitted from work pages so editors, CDN assets and Zenith's socket keep working.
  if (session.mode === 'STRICT') add(10, 'block', navigation);
  return rules;
}

async function applyRules(session) {
  const current = await chrome.declarativeNetRequest.getSessionRules();
  const rules = buildRules(session);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: current.map((rule) => rule.id), addRules: rules,
  });
}

async function notifyRoom(session, message) {
  await chrome.tabs.sendMessage(session.tabId, {
    ...message, focusSessionId: session.id,
  }).catch(() => {});
}

async function deactivate() {
  const session = await getSession();
  await applyRules(null);
  await chrome.storage.session.remove('shield');
  await chrome.storage.local.remove(['zenithFocusUrl', 'isFocusSessionActive']);
  await chrome.alarms.clear(expiryAlarm);
  await chrome.alarms.clear(statusAlarm);
  lastAttempt = undefined;
  if (session) {
    console.info('shield.deactivated');
    await notifyRoom(session, { type: 'ZENITH_SHIELD_STATUS', active: false });
  }
}

async function fetchStatus(room, token) {
  const response = await fetch(new URL('/api/blocker/live-status', room), {
    headers: { Authorization: 'Bearer ' + token },
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Shield status request failed');
  const status = await response.json();
  if (typeof status?.active !== 'boolean') throw new Error('Invalid Shield status response');
  return status;
}

function isEnforced(status, sessionId) {
  return status.active && status.sessionId === sessionId && ['BLOCK', 'STRICT'].includes(status.mode);
}

function verifiedPolicy(status) {
  return { mode: status.mode, allowed: domains(status.allowedWebsites), blocked: domains(status.blockedWebsites) };
}

async function reconcile() {
  const session = await getSession();
  if (!session || Date.now() >= session.expiresAt) return deactivate();
  const status = await fetchStatus(session.url, session.token);
  if (!isEnforced(status, session.id)) return deactivate();

  const policy = verifiedPolicy(status);
  if (JSON.stringify(policy) === JSON.stringify({ mode: session.mode, allowed: session.allowed, blocked: session.blocked })) return;
  const updated = { ...session, ...policy };
  try {
    await applyRules(updated);
    await chrome.storage.session.set({ shield: updated });
    console.info('shield.rules_refreshed');
  } catch (error) {
    await deactivate();
    throw error;
  }
}

function isBlockedNavigation(target, session) {
  if (!target || !['http:', 'https:'].includes(target.protocol)) return false;
  const host = target.hostname.replace(/\.$/, '');
  if (host === new URL(session.url).hostname) return false;
  if (matches(host, TIER_1_ALWAYS_BLOCKED)) return true;
  if (matches(host, TIER_2_ALWAYS_ALLOWED) || matches(host, session.allowed)) return false;
  return matches(host, session.blocked) || session.mode === 'STRICT';
}

async function focusRoom(session) {
  const room = await chrome.tabs.update(session.tabId, { active: true });
  await chrome.windows.update(room.windowId, { focused: true });
}

async function enforceForeground(tabId, url, navigationFailed = false) {
  const session = await getSession();
  if (!session || Date.now() >= session.expiresAt) return;
  const target = parseUrl(url);
  if (!isBlockedNavigation(target, session)) return;

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.active) return;
  const domain = target.hostname.replace(/\.$/, '');
  if (tabId === session.tabId) {
    // Chrome can replace the room with its blocked-navigation page in the same tab.
    // Avoid reloading it if Chrome kept the actual room document in place.
    if (!navigationFailed) return;
    if (!sameRoom(tab.url, new URL(session.url))) {
      await notifyRoom(session, { type: 'ZENITH_DISTRACTION_ATTEMPT', domain });
      await chrome.tabs.update(tabId, { url: session.url });
      return;
    }
  } else {
    await focusRoom(session);
  }
  const now = Date.now();
  if (lastAttempt?.id === session.id && lastAttempt.domain === domain && now - lastAttempt.at < 1500) return;
  lastAttempt = { id: session.id, domain, at: now };
  await notifyRoom(session, { type: 'ZENITH_DISTRACTION_ATTEMPT', domain });
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!message || typeof message.type !== 'string') return false;
  const senderUrl = parseUrl(sender.url);
  if (!senderUrl || !trustedOrigins.has(senderUrl.origin) || !Number.isInteger(sender.tab?.id) || sender.frameId !== 0) return false;

  serialize(async () => {
    const current = await getSession();
    const sameOrigin = current && new URL(current.url).origin === senderUrl.origin;
    if (message.type === 'ZENITH_ROOM_ENDED' && sameOrigin && current.id === message.focusSessionId) {
      await deactivate();
      return { active: false };
    }
    if (message.type === 'ZENITH_SNAP_BACK' && sameOrigin && Date.now() < current.expiresAt) {
      await focusRoom(current);
      return { active: true };
    }
    if (message.type !== 'ZENITH_BLOCKER_ACTIVATE') return { active: false };

    const room = parseUrl(message.roomUrl);
    if (!room || room.origin !== senderUrl.origin || !/^\/focus\/[^/]+\/?$/.test(room.pathname) ||
        !sameRoom(senderUrl.href, room) || typeof message.blockerToken !== 'string' ||
        typeof message.focusSessionId !== 'string' || !Number.isFinite(message.expiresAt) ||
        message.expiresAt <= Date.now()) return { active: false };
    const status = await fetchStatus(room, message.blockerToken);
    if (!isEnforced(status, message.focusSessionId)) return { active: false };

    const expiresAt = Math.min(message.expiresAt, Date.now() + maxSessionLength,
      Number.isFinite(status.expiresAt) ? status.expiresAt : Date.now() + 2 * 60 * 60_000);
    if (expiresAt <= Date.now()) return { active: false };
    const session = {
      id: status.sessionId, url: senderUrl.href, tabId: sender.tab.id, token: message.blockerToken,
      expiresAt,
      ...verifiedPolicy(status),
    };
    try {
      await chrome.alarms.create(expiryAlarm, { when: session.expiresAt });
      await chrome.alarms.create(statusAlarm, { periodInMinutes: 1 });
      await applyRules(session);
      await chrome.storage.session.set({ shield: session });
    } catch (error) {
      await deactivate();
      throw error;
    }
    console.info('shield.activated', session.mode);
    return { active: true };
  }).then(respond, () => respond({ active: false }));
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === expiryAlarm) void serialize(reconcileExpiry);
  if (alarm.name === statusAlarm) void serialize(reconcile);
});

async function reconcileExpiry() {
  const session = await getSession();
  if (!session || Date.now() >= session.expiresAt) await deactivate();
}

function onRoomNavigation({ tabId, frameId, url }) {
  if (frameId !== 0 || url.startsWith('chrome-error:')) return;
  void serialize(async () => {
    const session = await getSession();
    if (session?.tabId === tabId && !sameRoom(url, new URL(session.url))) await deactivate();
  });
}

chrome.webNavigation.onCommitted.addListener(onRoomNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(onRoomNavigation);
chrome.tabs.onRemoved.addListener((tabId) => {
  void serialize(async () => {
    if ((await getSession())?.tabId === tabId) await deactivate();
  });
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId).then((tab) => enforceForeground(tabId, tab.pendingUrl || tab.url)).catch(reportError);
});
chrome.webNavigation.onErrorOccurred.addListener(({ tabId, frameId, url, error }) => {
  if (frameId === 0 && error === 'net::ERR_BLOCKED_BY_CLIENT') {
    void enforceForeground(tabId, url, true).catch(reportError);
  }
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId < 0) return;
  chrome.tabs.query({ active: true, windowId }).then(([tab]) => {
    if (tab) return enforceForeground(tab.id, tab.pendingUrl || tab.url);
  }).catch(reportError);
});
