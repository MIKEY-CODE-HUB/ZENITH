// ═══════════════════════════════════════════════════════════════════════════════
// ZENITH Universal Focus Guardian & Navigation Enforcement Engine v15.0
// Manifest V3 Resilient Service Worker — Three-Tier Authoritative Policy
// ═══════════════════════════════════════════════════════════════════════════════

const BACKEND_URL = 'http://127.0.0.1:5001';
const FRONTEND_URL = 'https://zenith-dusky-theta.vercel.app';

// ── TIER 1: CORE DISTRACTION PLATFORMS (ALWAYS BLOCKED) ──────────────────────
const TIER_1_ALWAYS_BLOCKED = [
  'instagram.com',
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

// Anti-loop state & cooldown timers (in ms)
const SNAP_BACK_COOLDOWN_MS = 1500;
let lastSnapBackTime = 0;
let consecutiveSnapBacks = 0;
const MAX_CONSECUTIVE_SNAP_BACKS = 3;

// ── CANONICAL DOMAIN NORMALIZATION ──────────────────────────────────────────
function normalizeDomain(input) {
  if (!input) return '';
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '');
  domain = domain.replace(/^www\./, '');
  domain = domain.replace(/^m\./, '');
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split('#')[0];
  domain = domain.split(':')[0];
  return domain.trim();
}

function matchesDomainPattern(hostname, targetDomain) {
  if (!hostname || !targetDomain) return false;
  const h = normalizeDomain(hostname);
  const d = normalizeDomain(targetDomain);

  if (!h || !d) return false;
  if (h === d) return true;
  if (h.endsWith('.' + d)) return true;
  if (d === 'localhost' && (h === '127.0.0.1' || h === 'localhost')) return true;

  return false;
}

// ── SYSTEM & ZENITH ORIGIN IDENTIFICATION ───────────────────────────────────
function isSystemOrBrowserUrl(url) {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed === 'about:blank' ||
    trimmed === 'about:newtab' ||
    trimmed.startsWith('chrome://') ||
    trimmed.startsWith('chrome-extension://') ||
    trimmed.startsWith('chrome-search://') ||
    trimmed.startsWith('edge://') ||
    trimmed.startsWith('brave://') ||
    trimmed.startsWith('devtools://') ||
    trimmed.startsWith('view-source:')
  );
}

function isZenithUrl(url, activeRoomUrl) {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();

  if (trimmed.includes('/blocker/blocked') || trimmed.includes('blocked.html')) {
    return true;
  }

  const host = normalizeDomain(url);
  if (!host) return false;

  if (host === 'localhost' || host === '127.0.0.1') {
    return true;
  }

  if (
    host === 'zenith.com' ||
    host.endsWith('.zenith.com') ||
    host === 'zenith.app' ||
    host.endsWith('.zenith.app') ||
    host === 'zenith-focus.com' ||
    host.endsWith('.zenith-focus.com') ||
    host === 'zenith.io' ||
    host.endsWith('.zenith.io') ||
    host === 'zenith.dev' ||
    host.endsWith('.zenith.dev') ||
    host === 'zenith-dusky-theta.vercel.app' ||
    (host.endsWith('.vercel.app') && (host.includes('zenith') || host.includes('trapbreaker')))
  ) {
    return true;
  }

  if (activeRoomUrl) {
    const activeHost = normalizeDomain(activeRoomUrl);
    if (activeHost && host === activeHost) return true;
  }

  return false;
}

function isZenithRoomUrl(url) {
  if (!url) return false;
  if (!isZenithUrl(url)) return false;

  const isSetupOrSummary = url.includes('/setup') || url.includes('/summary') || url.includes('/blocked');
  if (isSetupOrSummary) return false;

  return (
    url.includes('/focus/') ||
    url.includes('/room/') ||
    url.includes('/rooms/')
  );
}

// ── RESILIENT STATE HYDRATION (MANIFEST V3 SERVICE WORKER WAKE-UP SAFE) ─────
async function getPersistedState() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'isFocusSessionActive',
      'zenithFocusUrl',
      'activeZenithTabId',
      'activeZenithWindowId',
      'blockerToken',
      'userId',
      'focusSessionId',
      'sessionMode',
      'allowedWebsites',
      'blockedWebsites',
      'lastActiveTime',
    ], (data) => {
      // 12-hour session expiration safety guard
      if (data && data.isFocusSessionActive && data.lastActiveTime) {
        if (Date.now() - data.lastActiveTime > 12 * 60 * 60 * 1000) {
          chrome.storage.local.set({ isFocusSessionActive: false, zenithFocusUrl: null });
          resolve({ isFocusSessionActive: false });
          return;
        }
      }
      resolve(data || {});
    });
  });
}

// ── AUTHORITATIVE THREE-TIER POLICY EVALUATOR ─────────────────────────────────
async function evaluateUrl(url) {
  if (!url) return { action: 'ALLOW', tier: 'SYSTEM' };

  if (isSystemOrBrowserUrl(url)) {
    return { action: 'ALLOW', tier: 'SYSTEM' };
  }

  const state = await getPersistedState();

  if (isZenithUrl(url, state.zenithFocusUrl)) {
    return { action: 'ALLOW', tier: 'SYSTEM' };
  }

  if (!state.isFocusSessionActive) {
    return { action: 'ALLOW', tier: 'SYSTEM', reason: 'Session inactive' };
  }

  const host = normalizeDomain(url);
  if (!host) return { action: 'ALLOW', tier: 'SYSTEM' };

  // Step 1: Tier 1 Always Blocked (takes priority over custom allow)
  for (const blocked of TIER_1_ALWAYS_BLOCKED) {
    if (matchesDomainPattern(host, blocked)) {
      return { action: 'BLOCK', tier: 'TIER_1', matchedRule: blocked };
    }
  }

  // Step 2: Tier 2 Always Allowed (takes priority over custom block)
  for (const allowed of TIER_2_ALWAYS_ALLOWED) {
    if (matchesDomainPattern(host, allowed)) {
      return { action: 'ALLOW', tier: 'TIER_2', matchedRule: allowed };
    }
  }

  // Step 3: Tier 3 User Custom Allowlists
  if (state.allowedWebsites && Array.isArray(state.allowedWebsites)) {
    for (const customAllowed of state.allowedWebsites) {
      if (matchesDomainPattern(host, customAllowed)) {
        return { action: 'ALLOW', tier: 'TIER_3', matchedRule: customAllowed };
      }
    }
  }

  // Step 4: Tier 3 User Custom Blocklists
  if (state.blockedWebsites && Array.isArray(state.blockedWebsites)) {
    for (const customBlocked of state.blockedWebsites) {
      if (matchesDomainPattern(host, customBlocked)) {
        return { action: 'BLOCK', tier: 'TIER_3', matchedRule: customBlocked };
      }
    }
  }

  // Step 5: Default Policy for Unknown Destinations
  const mode = state.sessionMode || 'STRICT';
  if (mode === 'STRICT') {
    return { action: 'BLOCK', tier: 'UNKNOWN', reason: 'Default-deny strict policy' };
  }

  return { action: 'ALLOW', tier: 'UNKNOWN' };
}

// ── LOCATE OR RECONNECT ZENITH ROOM TAB ───────────────────────────────────────
async function locateZenithTab() {
  const state = await getPersistedState();

  if (state.activeZenithTabId) {
    try {
      const tab = await chrome.tabs.get(state.activeZenithTabId);
      if (tab && isZenithUrl(tab.url, state.zenithFocusUrl)) {
        return tab;
      }
    } catch (e) {}
  }

  try {
    const tabs = await chrome.tabs.query({});
    let found = tabs.find(t => isZenithRoomUrl(t.url));
    if (!found) {
      found = tabs.find(t => isZenithUrl(t.url, state.zenithFocusUrl) && !t.url.includes('/blocked'));
    }

    if (found) {
      await chrome.storage.local.set({
        isFocusSessionActive: true,
        zenithFocusUrl: found.url,
        activeZenithTabId: found.id,
        activeZenithWindowId: found.windowId,
        lastActiveTime: Date.now(),
      });
      return found;
    }
  } catch (e) {}

  return null;
}

// ── INTERCEPTION & CONTROLLED ROOM REACTIVATION ENGINE ────────────────────────
async function interceptAndRedirect(tabId, distractingUrl) {
  const state = await getPersistedState();
  if (!state.isFocusSessionActive) return;

  const hostname = normalizeDomain(distractingUrl);
  let baseUrl = FRONTEND_URL;
  if (state.zenithFocusUrl) {
    try {
      baseUrl = new URL(state.zenithFocusUrl).origin;
    } catch (e) {}
  }
  const targetRoomUrl = state.zenithFocusUrl || `${baseUrl}/dashboard`;

  const webBlockUrl = `${baseUrl}/blocker/blocked?domain=${encodeURIComponent(hostname)}&url=${encodeURIComponent(distractingUrl)}&room=${encodeURIComponent(targetRoomUrl)}`;
  const extBlockUrl = chrome.runtime.getURL(
    `blocked.html?domain=${encodeURIComponent(hostname)}&url=${encodeURIComponent(distractingUrl)}&room=${encodeURIComponent(targetRoomUrl)}`
  );

  const blockUrl = (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('vercel.app'))
    ? webBlockUrl
    : extBlockUrl;

  // 1. Immediately replace the distracting tab with the blocked countdown screen
  try {
    await chrome.tabs.update(tabId, { url: blockUrl }).catch(() => {
      chrome.tabs.update(tabId, { url: extBlockUrl }).catch(() => {});
    });
  } catch (e) {}

  // 2. Controlled Snap-Back with anti-focus loop cooldown & debouncing
  const now = Date.now();
  if (now - lastSnapBackTime > SNAP_BACK_COOLDOWN_MS) {
    lastSnapBackTime = now;
    consecutiveSnapBacks++;

    if (consecutiveSnapBacks <= MAX_CONSECUTIVE_SNAP_BACKS) {
      try {
        const zenithTab = await locateZenithTab();
        if (zenithTab && zenithTab.id && zenithTab.id !== tabId) {
          if (zenithTab.windowId) {
            chrome.windows.update(zenithTab.windowId, { focused: true }).catch(() => {});
          }
          chrome.tabs.update(zenithTab.id, { active: true }).catch(() => {});

          chrome.tabs.sendMessage(zenithTab.id, {
            type: 'ZENITH_DISTRACTION_ATTEMPT',
            domain: hostname || 'restricted site',
            timestamp: now,
          }).catch(() => {});
        }
      } catch (e) {}
    } else {
      // Cooldown reset after 3 attempts to prevent infinite flickering
      setTimeout(() => { consecutiveSnapBacks = 0; }, 4000);
    }
  }

  // 3. Log attempt to backend database
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.blockerToken) {
      headers['Authorization'] = `Bearer ${state.blockerToken}`;
    }

    fetch(`${BACKEND_URL}/api/blocker/attempt`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId: state.focusSessionId,
        resourceType: 'WEBSITE',
        resourceIdentifier: hostname || distractingUrl,
        action: 'BLOCKED',
      }),
    }).catch(() => {});
  } catch (e) {}
}

// ── SANITIZE ALL OPEN TABS ON ENGAGEMENT ──────────────────────────────────────
async function sanitizeAllOpenTabs() {
  const state = await getPersistedState();
  if (!state.isFocusSessionActive) return;

  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url) continue;
      if (tab.id === state.activeZenithTabId) continue;
      if (isZenithUrl(tab.url, state.zenithFocusUrl)) continue;

      const evalRes = await evaluateUrl(tab.url);
      if (evalRes.action === 'BLOCK') {
        await interceptAndRedirect(tab.id, tab.url);
      }
    }
  } catch (e) {}
}

// ── PERIODIC AUTHENTICATED BACKEND SYNCHRONIZATION ────────────────────────────
async function pollBackendStatus() {
  try {
    const state = await getPersistedState();
    const headers = {};
    if (state.blockerToken) {
      headers['Authorization'] = `Bearer ${state.blockerToken}`;
    } else if (!state.isFocusSessionActive) {
      return;
    }

    const res = await fetch(`${BACKEND_URL}/api/blocker/live-status`, { headers });
    if (!res.ok) return;
    const data = await res.json();

    if (data.active) {
      await chrome.storage.local.set({
        isFocusSessionActive: true,
        sessionMode: data.mode || 'STRICT',
        allowedWebsites: data.allowedWebsites || [],
        blockedWebsites: data.blockedWebsites || [],
        lastActiveTime: Date.now(),
      });
    } else if (state.isFocusSessionActive) {
      // Verify if room tab is still open before marking inactive
      const zTab = await locateZenithTab();
      if (!zTab) {
        await chrome.storage.local.set({
          isFocusSessionActive: false,
          zenithFocusUrl: null,
          blockerToken: null,
        });
      }
    }
  } catch (e) {}
}

setInterval(pollBackendStatus, 4000);

// ── NAVIGATION EVENT LISTENERS ────────────────────────────────────────────────

// 1. Intercept BEFORE navigation begins (0ms, pre-render cancellation)
if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;
    const url = details.url;
    if (!url) return;

    if (isZenithRoomUrl(url)) {
      await chrome.storage.local.set({
        isFocusSessionActive: true,
        zenithFocusUrl: url,
        activeZenithTabId: details.tabId,
        lastActiveTime: Date.now(),
      });
      sanitizeAllOpenTabs();
      return;
    }

    const evalRes = await evaluateUrl(url);
    if (evalRes.action === 'BLOCK') {
      await interceptAndRedirect(details.tabId, url);
    }
  });
}

// 2. Intercept SPA history navigation (Next.js router.push / pushState)
if (chrome.webNavigation && chrome.webNavigation.onHistoryStateUpdated) {
  chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
    if (details.frameId !== 0) return;
    const url = details.url;
    if (!url) return;

    if (isZenithRoomUrl(url)) {
      await chrome.storage.local.set({
        isFocusSessionActive: true,
        zenithFocusUrl: url,
        activeZenithTabId: details.tabId,
        lastActiveTime: Date.now(),
      });
      sanitizeAllOpenTabs();
      return;
    }

    if (url.includes('/summary')) {
      await chrome.storage.local.set({
        isFocusSessionActive: false,
        zenithFocusUrl: null,
        blockerToken: null,
      });
      return;
    }

    const evalRes = await evaluateUrl(url);
    if (evalRes.action === 'BLOCK') {
      await interceptAndRedirect(details.tabId, url);
    }
  });
}

// 3. Intercept tab updates / address bar navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const targetUrl = changeInfo.url || tab.url || tab.pendingUrl;
  if (!targetUrl) return;

  if (isZenithRoomUrl(targetUrl)) {
    await chrome.storage.local.set({
      isFocusSessionActive: true,
      zenithFocusUrl: targetUrl,
      activeZenithTabId: tabId,
      activeZenithWindowId: tab.windowId,
      lastActiveTime: Date.now(),
    });
    sanitizeAllOpenTabs();
    return;
  }

  if (targetUrl.includes('/summary')) {
    await chrome.storage.local.set({
      isFocusSessionActive: false,
      zenithFocusUrl: null,
      blockerToken: null,
    });
    return;
  }

  const evalRes = await evaluateUrl(targetUrl);
  if (evalRes.action === 'BLOCK') {
    await interceptAndRedirect(tabId, targetUrl);
  }
});

// 4. Tab switch monitoring (Scenario D & E: approved study destinations are completely allowed)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
  if (!tab) return;
  const targetUrl = tab.url || tab.pendingUrl;
  if (!targetUrl) return;

  if (isZenithRoomUrl(targetUrl)) {
    await chrome.storage.local.set({
      activeZenithTabId: tab.id,
      activeZenithWindowId: tab.windowId,
      lastActiveTime: Date.now(),
    });
    return;
  }

  const evalRes = await evaluateUrl(targetUrl);
  if (evalRes.action === 'BLOCK') {
    await interceptAndRedirect(activeInfo.tabId, targetUrl);
  }
});

// 5. Handle Zenith tab closure
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getPersistedState();
  if (tabId === state.activeZenithTabId) {
    const tabs = await chrome.tabs.query({}).catch(() => []);
    const remainingZenith = tabs.find(t => isZenithRoomUrl(t.url));
    if (!remainingZenith) {
      await chrome.storage.local.set({
        isFocusSessionActive: false,
        zenithFocusUrl: null,
        activeZenithTabId: null,
        blockerToken: null,
      });
    } else {
      await chrome.storage.local.set({
        activeZenithTabId: remainingZenith.id,
        activeZenithWindowId: remainingZenith.windowId,
      });
    }
  }
});

// ── SECURE MESSAGE PASSING FROM ZENITH APPLICATION ───────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ZENITH_ROOM_ACTIVE' || msg.type === 'ZENITH_BLOCKER_ACTIVATE') {
    const url = msg.roomUrl || msg.config?.roomUrl || sender?.tab?.url;
    const token = msg.blockerToken || msg.token;
    const sessionId = msg.focusSessionId;
    const mode = msg.mode || msg.config?.mode || 'STRICT';
    const allowed = msg.config?.allowedWebsites || [];
    const blocked = msg.config?.blockedWebsites || [];

    chrome.storage.local.set({
      isFocusSessionActive: true,
      zenithFocusUrl: url,
      blockerToken: token || null,
      focusSessionId: sessionId || null,
      sessionMode: mode,
      allowedWebsites: allowed,
      blockedWebsites: blocked,
      activeZenithTabId: sender?.tab?.id || null,
      activeZenithWindowId: sender?.tab?.windowId || null,
      lastActiveTime: Date.now(),
    }, () => {
      sanitizeAllOpenTabs();
      sendResponse({ success: true, mode });
    });
    return true;
  } else if (msg.type === 'ZENITH_ROOM_ENDED') {
    chrome.storage.local.set({
      isFocusSessionActive: false,
      zenithFocusUrl: null,
      blockerToken: null,
      focusSessionId: null,
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  } else if (msg.type === 'ZENITH_SNAP_BACK') {
    locateZenithTab().then((tab) => {
      if (tab) {
        if (tab.windowId) {
          chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
        }
        chrome.tabs.update(tab.id, { active: true }).catch(() => {});
      }
    });
    sendResponse({ success: true });
    return true;
  }
  return true;
});
