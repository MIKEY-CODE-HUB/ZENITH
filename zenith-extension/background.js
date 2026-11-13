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
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const expiryAlarm = 'zenith-shield-expiry';
let pendingChange = Promise.resolve();

function serialize(action) {
  const result = pendingChange.then(action);
  pendingChange = result.catch((error) => console.error('shield.update_failed', error.name));
  return result;
}

function parseUrl(value) {
  try { return new URL(value); } catch { return null; }
}

function domains(list) {
  return [...new Set(list)].filter((domain) =>
    typeof domain === 'string' && /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(domain));
}

function matches(host, list) {
  return list.some((domain) => host === domain || host.endsWith('.' + domain));
}

async function getSession() {
  return (await chrome.storage.session.get('shield')).shield;
}

async function applyRules(session) {
  const current = await chrome.declarativeNetRequest.getSessionRules();
  const rules = [];
  const add = (priority, action, requestDomains) => {
    if (requestDomains && !requestDomains.length) return;
    rules.push({
      id: priority, priority, action: { type: action },
      condition: { resourceTypes: ['main_frame'], ...(requestDomains ? { requestDomains } : {}) },
    });
  };
  if (session) {
    add(50, 'allow', [new URL(session.url).hostname]);
    add(40, 'block', TIER_1_ALWAYS_BLOCKED);
    add(30, 'allow', TIER_2_ALWAYS_ALLOWED);
    add(20, 'allow', session.allowed);
    add(10, 'block', session.blocked);
    add(1, 'block');
  }
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: current.map((rule) => rule.id), addRules: rules,
  });
}

async function deactivate() {
  const session = await getSession();
  await applyRules(null);
  await chrome.storage.session.remove('shield');
  await chrome.storage.local.remove(['zenithFocusUrl', 'isFocusSessionActive']);
  await chrome.alarms.clear(expiryAlarm);
  if (session) await chrome.tabs.sendMessage(session.tabId, { type: 'ZENITH_SHIELD_STATUS', active: false }).catch(() => {});
}

async function enforceForeground(tabId, url) {
  const session = await getSession();
  if (!session || session.tabId === tabId) return;
  const target = parseUrl(url);
  if (!target || !['http:', 'https:'].includes(target.protocol) || target.origin === new URL(session.url).origin) return;
  const host = target.hostname;
  if (!matches(host, TIER_1_ALWAYS_BLOCKED) && matches(host, [...TIER_2_ALWAYS_ALLOWED, ...session.allowed])) return;

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab?.active) return;
  await chrome.tabs.update(session.tabId, { active: true });
  await chrome.windows.update(session.windowId, { focused: true });
  await chrome.tabs.sendMessage(session.tabId, { type: 'ZENITH_DISTRACTION_ATTEMPT', domain: host }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const senderUrl = parseUrl(sender.url);
  if (!senderUrl || !trustedOrigins.has(senderUrl.origin) || !sender.tab?.id) return false;

  serialize(async () => {
    const current = await getSession();
    if (message.type === 'ZENITH_ROOM_ENDED' && current?.id === message.focusSessionId && new URL(current.url).origin === senderUrl.origin) {
      await deactivate();
      return { active: false };
    }
    if (message.type === 'ZENITH_SNAP_BACK' && current) {
      await chrome.tabs.update(current.tabId, { active: true });
      return { active: true };
    }
    if (message.type !== 'ZENITH_BLOCKER_ACTIVATE') return { active: false };

    const room = parseUrl(message.roomUrl);
    if (!room || room.origin !== senderUrl.origin || !/^\/focus\/[^/]+\/?$/.test(room.pathname) ||
        room.href !== senderUrl.href || typeof message.blockerToken !== 'string' ||
        typeof message.focusSessionId !== 'string' || !Number.isFinite(message.expiresAt) ||
        message.expiresAt <= Date.now()) return { active: false };
    const status = await fetch(new URL('/api/blocker/live-status', room), {
      headers: { Authorization: 'Bearer ' + message.blockerToken },
      signal: AbortSignal.timeout(5000),
    });
    if (!status.ok) return { active: false };
    const verified = await status.json();
    if (!verified.active || verified.sessionId !== message.focusSessionId || verified.mode !== 'STRICT') return { active: false };

    const session = {
      id: verified.sessionId, url: room.href, tabId: sender.tab.id, windowId: sender.tab.windowId,
      allowed: domains(verified.allowedWebsites || []), blocked: domains(verified.blockedWebsites || []),
    };
    await applyRules(session);
    try {
      await chrome.alarms.create(expiryAlarm, { when: Math.min(message.expiresAt, Date.now() + 2 * 60 * 60_000) });
      await chrome.storage.session.set({ shield: session });
      await chrome.storage.local.set({ zenithFocusUrl: session.url });
    } catch (error) {
      await deactivate();
      throw error;
    }
    return { active: true };
  }).then(respond, () => respond({ active: false }));
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === expiryAlarm) void serialize(deactivate);
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (!change.url) return;
  void serialize(async () => {
    const session = await getSession();
    if (session?.tabId === tabId && change.url !== session.url) await deactivate();
  });
});
chrome.tabs.onRemoved.addListener((tabId) => {
  void serialize(async () => {
    if ((await getSession())?.tabId === tabId) await deactivate();
  });
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId).then((tab) => enforceForeground(tabId, tab.pendingUrl || tab.url)).catch(() => {});
});
chrome.webNavigation.onBeforeNavigate.addListener(({ tabId, frameId, url }) => {
  if (frameId === 0) void enforceForeground(tabId, url).catch(() => {});
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId < 0) return;
  chrome.tabs.query({ active: true, windowId }).then(([tab]) => {
    if (tab) return enforceForeground(tab.id, tab.pendingUrl || tab.url);
  }).catch(() => {});
});
