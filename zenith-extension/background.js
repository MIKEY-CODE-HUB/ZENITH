// ZENITH Universal Focus Guardian & Allowlist Navigation Interceptor
// Production Architecture — Allowlist-First (Default-Deny) Engine

let activeZenithTabId = null;
let activeZenithWindowId = null;
let isSessionActive = false;
let zenithRoomUrl = null;
let sessionMode = 'STRICT';

// EXPLICITLY ALLOWED STUDY & ENGINEERING PLATFORMS
// During an active session, ONLY Zenith and these allowed destinations are accessible.
// Every other website is BLOCKED by default.
const ALWAYS_ALLOWED_DOMAINS = [
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

let customAllowedWebsites = [];
let customBlockedWebsites = [];

const BACKEND_URL = 'http://127.0.0.1:5001';
const FRONTEND_URL = 'https://zenith-dusky-theta.vercel.app';

// ── ROBUST DOMAIN PARSING & MATCHING ──────────────────────────────────────────
function extractHostname(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().trim().replace(/^www\./, '');
  } catch (e) {
    try {
      const parsed = new URL('https://' + url);
      return parsed.hostname.toLowerCase().trim().replace(/^www\./, '');
    } catch (e2) {
      return '';
    }
  }
}

// Precise domain matching: exact match OR valid subdomain match
function matchesDomainPattern(hostname, targetDomain) {
  if (!hostname || !targetDomain) return false;
  const h = hostname.toLowerCase().trim().replace(/^www\./, '');
  const d = targetDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0];
  
  if (h === d) return true;
  if (h.endsWith('.' + d)) return true;
  if (d === 'localhost' && (h === '127.0.0.1' || h === 'localhost')) return true;
  return false;
}

// ── ZENITH APPLICATION URL IDENTIFICATION ────────────────────────────────────
function isZenithUrl(url) {
  if (!url) return false;
  
  if (url.includes('/blocker/blocked') || url.includes('blocked.html')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().trim().replace(/^www\./, '');

    // Localhost development (any port)
    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }

    // Zenith production & preview domains
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
      (host.endsWith('.vercel.app') && (host.includes('zenith') || host.includes('trapbreaker'))) ||
      host.includes('zenith')
    ) {
      return true;
    }

    // Match origin of active Zenith room
    if (zenithRoomUrl) {
      try {
        const roomOrigin = new URL(zenithRoomUrl).origin;
        if (parsed.origin === roomOrigin) return true;
      } catch (e) {}
    }

    return false;
  } catch (e) {
    return false;
  }
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

// ── ALLOWLIST-FIRST EVALUATION (DEFAULT-DENY) ─────────────────────────────────
function isUrlDistraction(url) {
  if (!isSessionActive) return false;
  if (!url) return false;

  // Browser internal schemes (blank tab, extension pages, chrome internal)
  if (
    url === 'about:blank' ||
    url === 'about:newtab' ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('chrome-search://') ||
    url.startsWith('edge://') ||
    url.startsWith('brave://') ||
    url.startsWith('devtools://') ||
    url.startsWith('view-source:')
  ) {
    return false;
  }

  // Zenith itself is always allowed
  if (isZenithUrl(url)) return false;

  const hostname = extractHostname(url);
  if (!hostname) return false;

  // 1. Check always allowed study and engineering platforms
  for (const allowed of ALWAYS_ALLOWED_DOMAINS) {
    if (matchesDomainPattern(hostname, allowed)) {
      return false;
    }
  }

  // 2. Check custom user-configured allowed websites
  for (const allowed of customAllowedWebsites) {
    if (matchesDomainPattern(hostname, allowed)) {
      return false;
    }
  }

  // 3. DEFAULT-DENY: Everything else is blocked during an active focus session!
  return true;
}

// ── STORAGE SYNCHRONIZATION (MANIFEST V3 LIFECYCLE RESILIENCE) ───────────────
async function syncStateFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'isFocusSessionActive',
      'zenithFocusUrl',
      'activeZenithTabId',
      'activeZenithWindowId',
      'allowedWebsites',
      'blockedWebsites',
      'sessionMode',
      'lastActiveTime',
    ], (data) => {
      if (data && data.isFocusSessionActive === true) {
        // Safe 12-hour session expiry failsafe
        if (data.lastActiveTime && Date.now() - data.lastActiveTime > 12 * 60 * 60 * 1000) {
          isSessionActive = false;
          chrome.storage.local.set({ isFocusSessionActive: false, zenithFocusUrl: null });
        } else {
          isSessionActive = true;
          zenithRoomUrl = data.zenithFocusUrl || zenithRoomUrl;
          activeZenithTabId = data.activeZenithTabId || activeZenithTabId;
          activeZenithWindowId = data.activeZenithWindowId || activeZenithWindowId;
          if (data.allowedWebsites) customAllowedWebsites = data.allowedWebsites;
          if (data.blockedWebsites) customBlockedWebsites = data.blockedWebsites;
          if (data.sessionMode) sessionMode = data.sessionMode;
        }
      } else if (data && data.isFocusSessionActive === false) {
        isSessionActive = false;
      }
      resolve(data);
    });
  });
}

// Periodic backend synchronization
async function pollBackendStatus() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/blocker/live-status`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.active) {
      isSessionActive = true;
      sessionMode = data.mode || 'STRICT';
      if (data.allowedWebsites) customAllowedWebsites = data.allowedWebsites;
      if (data.blockedWebsites) customBlockedWebsites = data.blockedWebsites;
      chrome.storage.local.set({
        isFocusSessionActive: true,
        sessionMode: data.mode || 'STRICT',
        allowedWebsites: data.allowedWebsites || [],
        blockedWebsites: data.blockedWebsites || [],
        lastActiveTime: Date.now(),
      });
    } else {
      chrome.storage.local.get(['isFocusSessionActive', 'zenithFocusUrl'], (st) => {
        if (st && st.isFocusSessionActive) {
          isSessionActive = true;
          if (st.zenithFocusUrl) zenithRoomUrl = st.zenithFocusUrl;
        } else {
          isSessionActive = false;
        }
      });
    }
  } catch (e) {}
}

setInterval(pollBackendStatus, 3000);
pollBackendStatus();
syncStateFromStorage();

// ── TAB LOCATOR & ROOM DETECTOR ──────────────────────────────────────────────
async function getZenithTab() {
  await syncStateFromStorage();

  if (activeZenithTabId !== null) {
    try {
      const tab = await chrome.tabs.get(activeZenithTabId);
      if (tab && isZenithUrl(tab.url)) {
        return tab;
      }
    } catch (e) {
      activeZenithTabId = null;
    }
  }

  try {
    const tabs = await chrome.tabs.query({});
    let found = tabs.find(t => isZenithRoomUrl(t.url));
    if (!found) {
      found = tabs.find(t => isZenithUrl(t.url) && !t.url.includes('/blocked'));
    }
    if (!found) {
      found = tabs.find(t => isZenithUrl(t.url));
    }

    if (found) {
      activeZenithTabId = found.id;
      activeZenithWindowId = found.windowId;
      isSessionActive = true;
      if (!found.url.includes('/blocked')) {
        zenithRoomUrl = found.url;
      }
      chrome.storage.local.set({
        isFocusSessionActive: true,
        zenithFocusUrl: zenithRoomUrl || found.url,
        activeZenithTabId: found.id,
        activeZenithWindowId: found.windowId,
        lastActiveTime: Date.now(),
      });
      return found;
    }
  } catch (e) {}

  return null;
}

// ── SANITIZE ALL OPEN TABS ON SESSION ENGAGEMENT ──────────────────────────────
async function enforceAllOpenTabs() {
  await syncStateFromStorage();
  if (!isSessionActive) return;

  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url) continue;
      if (tab.id === activeZenithTabId) continue;
      if (isZenithUrl(tab.url)) continue;

      if (isUrlDistraction(tab.url)) {
        interceptAndRedirect(tab.id, tab.url);
      }
    }
  } catch (e) {}
}

// ── INJECT CONTENT SCRIPT INTO EXISTING TABS ──────────────────────────────────
async function injectContentScriptIntoOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) continue;
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      }).catch(() => {});
    }
  } catch (e) {}
}

// On install or startup, inspect open tabs to immediately recognize active session
chrome.runtime.onInstalled?.addListener(async () => {
  const zTab = await getZenithTab();
  if (zTab) {
    isSessionActive = true;
    enforceAllOpenTabs();
  }
  injectContentScriptIntoOpenTabs();
});

chrome.runtime.onStartup?.addListener(async () => {
  const zTab = await getZenithTab();
  if (zTab) {
    isSessionActive = true;
    enforceAllOpenTabs();
  }
  injectContentScriptIntoOpenTabs();
});

// Initial inspection on script evaluation
getZenithTab().then((zTab) => {
  if (zTab) {
    isSessionActive = true;
    enforceAllOpenTabs();
  }
});

// ── INTERCEPTION & REDIRECTION ENGINE ─────────────────────────────────────────
async function interceptAndRedirect(tabId, distractingUrl) {
  if (!isSessionActive) return;

  const hostname = extractHostname(distractingUrl);
  let baseUrl = FRONTEND_URL;
  if (zenithRoomUrl) {
    try {
      baseUrl = new URL(zenithRoomUrl).origin;
    } catch (e) {}
  }
  const targetRoomUrl = zenithRoomUrl || `${baseUrl}/dashboard`;

  const webBlockUrl = `${baseUrl}/blocker/blocked?domain=${encodeURIComponent(hostname)}&url=${encodeURIComponent(distractingUrl)}&room=${encodeURIComponent(targetRoomUrl)}`;
  const extBlockUrl = chrome.runtime.getURL(
    `blocked.html?domain=${encodeURIComponent(hostname)}&url=${encodeURIComponent(distractingUrl)}&room=${encodeURIComponent(targetRoomUrl)}`
  );

  const blockUrl = (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('vercel.app')) ? webBlockUrl : extBlockUrl;

  // 1. Immediately replace the distracting tab with the blocked countdown screen
  try {
    chrome.tabs.update(tabId, { url: blockUrl }).catch(() => {
      chrome.tabs.update(tabId, { url: extBlockUrl }).catch(() => {});
    });
  } catch (e) {}

  // 2. Refocus the active Zenith tab immediately (< 50ms)
  try {
    const zenithTab = await getZenithTab();
    if (zenithTab && zenithTab.id && zenithTab.id !== tabId) {
      if (zenithTab.windowId) {
        chrome.windows.update(zenithTab.windowId, { focused: true }).catch(() => {});
      }
      chrome.tabs.update(zenithTab.id, { active: true }).catch(() => {});
      setTimeout(() => {
        chrome.tabs.update(zenithTab.id, { active: true }).catch(() => {});
      }, 50);

      // Forward distraction attempt alert to Zenith room
      chrome.tabs.sendMessage(zenithTab.id, {
        type: 'ZENITH_DISTRACTION_ATTEMPT',
        domain: hostname || 'unapproved site',
        timestamp: Date.now(),
      }).catch(() => {});
    }
  } catch (e) {}

  // 3. Log attempt to backend database
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
}

// ── COMPREHENSIVE EVENT LISTENERS ─────────────────────────────────────────────

// 1. Intercept BEFORE navigation begins (0ms, prevents page loading)
if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;
    const url = details.url;
    if (!url) return;

    if (isZenithRoomUrl(url)) {
      activeZenithTabId = details.tabId;
      isSessionActive = true;
      zenithRoomUrl = url;
      chrome.storage.local.set({
        isFocusSessionActive: true,
        zenithFocusUrl: url,
        activeZenithTabId: details.tabId,
        lastActiveTime: Date.now(),
      });
      enforceAllOpenTabs();
      return;
    }

    await syncStateFromStorage();
    if (!isSessionActive) {
      const zTab = await getZenithTab();
      if (zTab) isSessionActive = true;
      else return;
    }

    if (url === 'about:blank' || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return;
    }

    if (isZenithUrl(url)) return;

    if (isUrlDistraction(url)) {
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
      activeZenithTabId = details.tabId;
      isSessionActive = true;
      zenithRoomUrl = url;
      await chrome.storage.local.set({
        isFocusSessionActive: true,
        zenithFocusUrl: url,
        activeZenithTabId: details.tabId,
        lastActiveTime: Date.now(),
      });
      enforceAllOpenTabs();
      return;
    }

    if (url.includes('/summary')) {
      isSessionActive = false;
      zenithRoomUrl = null;
      await chrome.storage.local.set({
        isFocusSessionActive: false,
        zenithFocusUrl: null,
      });
      return;
    }

    await syncStateFromStorage();
    if (!isSessionActive) {
      const zTab = await getZenithTab();
      if (zTab) isSessionActive = true;
      else return;
    }

    if (isUrlDistraction(url)) {
      await interceptAndRedirect(details.tabId, url);
    }
  });
}

// 3. Intercept tab updates / address bar navigation / refreshes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const targetUrl = changeInfo.url || tab.url || tab.pendingUrl;
  if (!targetUrl) return;

  if (isZenithRoomUrl(targetUrl)) {
    activeZenithTabId = tabId;
    activeZenithWindowId = tab.windowId;
    isSessionActive = true;
    zenithRoomUrl = targetUrl;
    await chrome.storage.local.set({
      isFocusSessionActive: true,
      zenithFocusUrl: targetUrl,
      activeZenithTabId: tabId,
      activeZenithWindowId: tab.windowId,
      lastActiveTime: Date.now(),
    });
    enforceAllOpenTabs();
    return;
  }

  if (targetUrl.includes('/summary')) {
    isSessionActive = false;
    await chrome.storage.local.set({
      isFocusSessionActive: false,
      zenithFocusUrl: null,
    });
    return;
  }

  await syncStateFromStorage();
  if (!isSessionActive) {
    const zTab = await getZenithTab();
    if (zTab) isSessionActive = true;
    else return;
  }

  if (isUrlDistraction(targetUrl)) {
    await interceptAndRedirect(tabId, targetUrl);
  }
});

// 4. Intercept committed / back / forward navigation
if (chrome.webNavigation && chrome.webNavigation.onCommitted) {
  chrome.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0) return;
    const url = details.url;
    if (!url) return;

    if (isZenithRoomUrl(url)) {
      activeZenithTabId = details.tabId;
      isSessionActive = true;
      zenithRoomUrl = url;
      return;
    }

    await syncStateFromStorage();
    if (!isSessionActive) {
      const zTab = await getZenithTab();
      if (zTab) isSessionActive = true;
      else return;
    }

    if (url === 'about:blank' || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return;
    }

    if (isZenithUrl(url)) return;

    if (isUrlDistraction(url)) {
      await interceptAndRedirect(details.tabId, url);
    }
  });
}

// 5. Intercept newly created tabs with distracting targets (e.g. right-click open link)
chrome.tabs.onCreated.addListener(async (tab) => {
  const url = tab.url || tab.pendingUrl;
  if (!url) return;

  await syncStateFromStorage();
  if (!isSessionActive) {
    const zTab = await getZenithTab();
    if (zTab) isSessionActive = true;
    else return;
  }

  if (isUrlDistraction(url)) {
    await interceptAndRedirect(tab.id, url);
  }
});

// 6. INSTANT SNAP-BACK ON ANY TAB SWITCH (Zero Delay)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
  if (!tab) return;
  const targetUrl = tab.url || tab.pendingUrl;
  if (!targetUrl) return;

  if (isZenithRoomUrl(targetUrl)) {
    activeZenithTabId = tab.id;
    activeZenithWindowId = tab.windowId;
    isSessionActive = true;
    zenithRoomUrl = targetUrl;
    await chrome.storage.local.set({
      isFocusSessionActive: true,
      zenithFocusUrl: targetUrl,
      activeZenithTabId: tab.id,
      activeZenithWindowId: tab.windowId,
      lastActiveTime: Date.now(),
    });
    return;
  }

  await syncStateFromStorage();
  if (!isSessionActive) {
    const zTab = await getZenithTab();
    if (zTab) isSessionActive = true;
    else return;
  }

  if (
    targetUrl === 'about:blank' ||
    targetUrl.startsWith('chrome://newtab') ||
    targetUrl.startsWith('chrome://new-tab-page') ||
    targetUrl.startsWith('edge://newtab') ||
    targetUrl.startsWith('brave://newtab')
  ) {
    return;
  }

  if (isZenithUrl(targetUrl)) return;

  if (!isUrlDistraction(targetUrl)) return;

  // Non-allowed destination: block and pull back immediately
  await interceptAndRedirect(activeInfo.tabId, targetUrl);
});

// 7. MULTIPLE WINDOWS ENFORCEMENT
if (chrome.windows && chrome.windows.onFocusChanged) {
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    await syncStateFromStorage();
    if (!isSessionActive) {
      const zTab = await getZenithTab();
      if (zTab) isSessionActive = true;
      else return;
    }

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, windowId });
      if (!activeTab) return;
      const url = activeTab.url || activeTab.pendingUrl;
      if (!url) return;

      if (isZenithRoomUrl(url)) {
        activeZenithTabId = activeTab.id;
        activeZenithWindowId = windowId;
        return;
      }

      if (
        url === 'about:blank' ||
        url.startsWith('chrome://newtab') ||
        url.startsWith('chrome://new-tab-page') ||
        url.startsWith('edge://newtab') ||
        url.startsWith('brave://newtab')
      ) {
        return;
      }

      if (isZenithUrl(url)) return;

      if (isUrlDistraction(url)) {
        await interceptAndRedirect(activeTab.id, url);
      }
    } catch (e) {}
  });
}

// 8. Handle Zenith tab closure — restore normal browsing if no room tab remains
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeZenithTabId) {
    activeZenithTabId = null;
    chrome.tabs.query({}).then((tabs) => {
      const remainingZenith = tabs.find(t => isZenithRoomUrl(t.url));
      if (!remainingZenith) {
        // No remaining room tab found: restore normal browsing immediately!
        isSessionActive = false;
        zenithRoomUrl = null;
        chrome.storage.local.set({
          isFocusSessionActive: false,
          zenithFocusUrl: null,
          activeZenithTabId: null,
        });
      } else {
        activeZenithTabId = remainingZenith.id;
      }
    });
  }
});

// ── MESSAGE PASSING WITH ZENITH WEB APPLICATION ──────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ZENITH_ROOM_ACTIVE' || msg.type === 'ZENITH_BLOCKER_ACTIVATE') {
    isSessionActive = true;
    zenithRoomUrl = msg.roomUrl || msg.config?.roomUrl || zenithRoomUrl;
    const tabId = sender?.tab?.id || activeZenithTabId;
    const windowId = sender?.tab?.windowId || activeZenithWindowId;
    if (tabId) activeZenithTabId = tabId;
    if (windowId) activeZenithWindowId = windowId;

    chrome.storage.local.set({
      isFocusSessionActive: true,
      zenithFocusUrl: zenithRoomUrl,
      activeZenithTabId: tabId,
      activeZenithWindowId: windowId,
      lastActiveTime: Date.now(),
    });
    enforceAllOpenTabs();
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
        if (tab.windowId) {
          chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
        }
        chrome.tabs.update(tab.id, { active: true }).catch(() => {});
      } else {
        const dest = zenithRoomUrl || `${FRONTEND_URL}/dashboard`;
        chrome.tabs.create({ url: dest, active: true });
      }
    });
    sendResponse({ success: true });
  }
  return true;
});
