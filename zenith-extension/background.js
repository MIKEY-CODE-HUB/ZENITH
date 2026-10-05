// ZENITH Universal Focus Guardian & Navigation Interceptor v11.0
// Production Release

let activeZenithTabId = null;
let activeZenithWindowId = null;
let isSessionActive = false;
let zenithRoomUrl = null;
let sessionMode = 'STRICT';

// TIER 1 — ALWAYS BLOCKED (Core Protection)
const ALWAYS_BLOCKED_DOMAINS = [
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
  'animekai.at',
  '9animetv.to',
  'aniwatchtv.to',
  'hulu.com',
  'disneyplus.com',
];

// TIER 2 — ALWAYS ALLOWED (Protected Essential Tools)
const ALWAYS_ALLOWED_DOMAINS = [
  'github.com',
  'leetcode.com',
  'codeforces.com',
  'codechef.com',
  'hackerrank.com',
  'chess.com',
  'lichess.org',
  'developer.mozilla.org',
  'stackoverflow.com',
  'w3schools.com',
  'geeksforgeeks.org',
  'localhost',
  '127.0.0.1',
  'docs.google.com',
];

let customBlockedWebsites = [];
let customAllowedWebsites = [];

const BACKEND_URL = 'http://127.0.0.1:5001';
const FRONTEND_URL = 'http://localhost:3000';

// Robust domain matching
function matchesDomainPattern(hostname, targetDomain) {
  if (!hostname || !targetDomain) return false;
  const h = hostname.toLowerCase().trim().replace(/^www\./, '');
  const d = targetDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0];
  if (h === d) return true;
  if (h.endsWith('.' + d)) return true;
  if (d === 'localhost' && (h === '127.0.0.1' || h === 'localhost')) return true;
  return false;
}

// Sync state from storage
async function syncStateFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'isFocusSessionActive',
      'zenithFocusUrl',
      'activeZenithTabId',
      'activeZenithWindowId',
      'blockedWebsites',
      'allowedWebsites',
      'sessionMode',
    ], (data) => {
      if (data && data.isFocusSessionActive) {
        isSessionActive = true;
        zenithRoomUrl = data.zenithFocusUrl || zenithRoomUrl;
        activeZenithTabId = data.activeZenithTabId || activeZenithTabId;
        activeZenithWindowId = data.activeZenithWindowId || activeZenithWindowId;
        if (data.blockedWebsites) customBlockedWebsites = data.blockedWebsites;
        if (data.allowedWebsites) customAllowedWebsites = data.allowedWebsites;
        if (data.sessionMode) sessionMode = data.sessionMode;
      } else if (data && data.isFocusSessionActive === false) {
        isSessionActive = false;
      }
      resolve(data);
    });
  });
}

// Periodic backend poll to guarantee synchronization
async function pollBackendStatus() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/blocker/live-status`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.active) {
      isSessionActive = true;
      sessionMode = data.mode || 'STRICT';
      if (data.blockedWebsites) customBlockedWebsites = data.blockedWebsites;
      if (data.allowedWebsites) customAllowedWebsites = data.allowedWebsites;
      chrome.storage.local.set({
        isFocusSessionActive: true,
        sessionMode: data.mode || 'STRICT',
        blockedWebsites: data.blockedWebsites || [],
        allowedWebsites: data.allowedWebsites || [],
      });
    } else {
      isSessionActive = false;
      chrome.storage.local.set({ isFocusSessionActive: false });
    }
  } catch (e) {}
}

setInterval(pollBackendStatus, 2500);
pollBackendStatus();
syncStateFromStorage();

function isZenithUrl(url) {
  if (!url) return false;
  return url.includes('localhost:3000') ||
         url.includes('127.0.0.1:3000') ||
         url.includes('vercel.app') ||
         url.includes('zenith');
}

function isZenithRoomUrl(url) {
  if (!url) return false;
  return isZenithUrl(url) && url.includes('/focus/') && !url.includes('/setup') && !url.includes('/summary');
}

function extractHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

function isUrlDistraction(url) {
  if (!isSessionActive) return false;
  if (!url) return false;
  if (isZenithUrl(url)) return false;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) return false;

  const hostname = extractHostname(url);
  if (!hostname) return false;

  // 1. TIER 2: Check protected / allowed tools
  for (const allowed of ALWAYS_ALLOWED_DOMAINS) {
    if (matchesDomainPattern(hostname, allowed)) return false;
  }
  for (const allowed of customAllowedWebsites) {
    if (matchesDomainPattern(hostname, allowed)) return false;
  }

  // 2. TIER 1: Check Always Blocked platforms
  for (const blocked of ALWAYS_BLOCKED_DOMAINS) {
    if (matchesDomainPattern(hostname, blocked)) return true;
  }

  // 3. TIER 3: Check Custom Blocklist
  for (const blocked of customBlockedWebsites) {
    if (matchesDomainPattern(hostname, blocked)) return true;
  }

  // In STRICT mode, any external website outside allowed is treated as a distraction
  if (sessionMode === 'STRICT') {
    return true;
  }

  return false;
}

async function getZenithTab() {
  await syncStateFromStorage();

  if (activeZenithTabId !== null) {
    try {
      const tab = await chrome.tabs.get(activeZenithTabId);
      if (tab && isZenithRoomUrl(tab.url)) {
        return tab;
      }
    } catch (e) {
      activeZenithTabId = null;
    }
  }

  try {
    const tabs = await chrome.tabs.query({});
    const found = tabs.find(t => isZenithRoomUrl(t.url));
    if (found) {
      activeZenithTabId = found.id;
      activeZenithWindowId = found.windowId;
      isSessionActive = true;
      zenithRoomUrl = found.url;
      chrome.storage.local.set({
        isFocusSessionActive: true,
        zenithFocusUrl: found.url,
        activeZenithTabId: found.id,
        activeZenithWindowId: found.windowId,
      });
      return found;
    }
  } catch (e) {}

  return null;
}

// Redirect tab to Zenith blocked page and refocus Zenith room
async function interceptAndRedirect(tabId, distractingUrl) {
  if (!isSessionActive) return;

  const hostname = extractHostname(distractingUrl);
  const targetRoomUrl = zenithRoomUrl || `${FRONTEND_URL}/dashboard`;

  const webBlockUrl = `${FRONTEND_URL}/blocker/blocked?domain=${encodeURIComponent(hostname)}&url=${encodeURIComponent(distractingUrl)}&room=${encodeURIComponent(targetRoomUrl)}`;
  const extBlockUrl = chrome.runtime.getURL(
    `blocked.html?domain=${encodeURIComponent(hostname)}&url=${encodeURIComponent(distractingUrl)}&room=${encodeURIComponent(targetRoomUrl)}`
  );

  // Immediately redirect the distracting tab away!
  try {
    chrome.tabs.update(tabId, { url: webBlockUrl }).catch(() => {
      chrome.tabs.update(tabId, { url: extBlockUrl }).catch(() => {});
    });
  } catch (e) {}

  // Log attempt to backend API
  try {
    fetch(`${BACKEND_URL}/api/blocker/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceType: 'WEBSITE',
        resourceIdentifier: hostname || distractingUrl,
        action: 'BLOCKED',
      }),
    }).catch(() => {});
  } catch (e) {}

  // If there is an active focus tab elsewhere, bring it forward
  try {
    const zenithTab = await getZenithTab();
    if (zenithTab && zenithTab.id !== tabId) {
      chrome.tabs.sendMessage(zenithTab.id, {
        type: 'ZENITH_DISTRACTION_ATTEMPT',
        domain: hostname,
        timestamp: Date.now(),
      }).catch(() => {});

      if (zenithTab.windowId) {
        chrome.windows.update(zenithTab.windowId, { focused: true }).catch(() => {});
      }
      chrome.tabs.update(zenithTab.id, { active: true }).catch(() => {});
    }
  } catch (e) {}
}

// Listen for messages from web app & content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ZENITH_ROOM_ACTIVE') {
    isSessionActive = true;
    zenithRoomUrl = msg.roomUrl;
    if (sender && sender.tab) {
      activeZenithTabId = sender.tab.id;
      activeZenithWindowId = sender.tab.windowId;
      chrome.storage.local.set({
        isFocusSessionActive: true,
        zenithFocusUrl: msg.roomUrl,
        activeZenithTabId: sender.tab.id,
        activeZenithWindowId: sender.tab.windowId,
      });
    }
    sendResponse({ success: true });
  } else if (msg.type === 'ZENITH_ROOM_ENDED') {
    isSessionActive = false;
    activeZenithTabId = null;
    zenithRoomUrl = null;
    chrome.storage.local.set({
      isFocusSessionActive: false,
      zenithFocusUrl: null,
      activeZenithTabId: null,
    });
    sendResponse({ success: true });
  } else if (msg.type === 'EXTERNAL_TAB_SWITCH' || msg.type === 'ZENITH_SNAP_BACK') {
    getZenithTab().then((tab) => {
      if (tab) {
        chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
        chrome.tabs.update(tab.id, { active: true }).catch(() => {});
      }
    });
    sendResponse({ success: true });
  }
  return true;
});

// 1. Intercept BEFORE navigation begins (instant, 0ms, prevents page from loading)
if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId === 0) {
      if (!isSessionActive) return;
      if (isZenithUrl(details.url)) return;

      if (isUrlDistraction(details.url)) {
        await interceptAndRedirect(details.tabId, details.url);
      }
    }
  });
}

// 2. Intercept tab updates / address bar navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!isSessionActive) return;

  const targetUrl = tab.url || changeInfo.url;
  if (!targetUrl) return;

  if (isZenithRoomUrl(targetUrl)) {
    activeZenithTabId = tabId;
    activeZenithWindowId = tab.windowId;
    isSessionActive = true;
    return;
  }

  if (isUrlDistraction(targetUrl)) {
    await interceptAndRedirect(tabId, targetUrl);
  }
});

// 3. INSTANT SNAP-BACK ON ANY TAB SWITCH (Zero Delay)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!isSessionActive) return;

  try {
    const zenithTab = await getZenithTab();
    if (!zenithTab) return;

    if (activeInfo.tabId !== zenithTab.id) {
      // User switched away from the active Zenith focus room!
      const activeTab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);

      if (activeTab && activeTab.url && isUrlDistraction(activeTab.url)) {
        // Freeze and redirect distracting tab
        await interceptAndRedirect(activeInfo.tabId, activeTab.url);
      }

      // IMMEDIATELY PULL USER RIGHT BACK TO ZENITH FOCUS ROOM!
      if (zenithTab.windowId) {
        await chrome.windows.update(zenithTab.windowId, { focused: true }).catch(() => {});
      }
      await chrome.tabs.update(zenithTab.id, { active: true }).catch(() => {});

      // Forward telemetry notification to the focus room
      chrome.tabs.sendMessage(zenithTab.id, {
        type: 'ZENITH_DISTRACTION_ATTEMPT',
        domain: activeTab?.url ? extractHostname(activeTab.url) : 'external tab',
        reason: 'Tab switch intercepted: pulled back to focus room immediately.',
        timestamp: Date.now(),
      }).catch(() => {});
    }
  } catch (e) {}
});

// 4. INSTANT SNAP-BACK ON NEW TAB CREATION
chrome.tabs.onCreated.addListener(async (newTab) => {
  if (!isSessionActive) return;
  try {
    const zenithTab = await getZenithTab();
    if (zenithTab && newTab.id !== zenithTab.id) {
      if (zenithTab.windowId) {
        chrome.windows.update(zenithTab.windowId, { focused: true }).catch(() => {});
      }
      chrome.tabs.update(zenithTab.id, { active: true }).catch(() => {});
    }
  } catch (e) {}
});

// 4. Handle Zenith tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeZenithTabId) {
    activeZenithTabId = null;
    chrome.tabs.query({}).then((tabs) => {
      const remainingZenith = tabs.find(t => isZenithRoomUrl(t.url));
      if (!remainingZenith) {
        isSessionActive = false;
        chrome.storage.local.set({ isFocusSessionActive: false, activeZenithTabId: null });
      } else {
        activeZenithTabId = remainingZenith.id;
      }
    });
  }
});
