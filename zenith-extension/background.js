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
// Extracts clean hostname without protocol, port, or leading 'www.'
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

// Precise domain matching: exact match OR subdomain match
// Prevents substring bypasses (e.g. 'fakegithub.com' will NOT match 'github.com')
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
  
  // The block pages are always part of Zenith
  if (url.includes('/blocker/blocked') || url.includes('blocked.html')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().trim().replace(/^www\./, '');
    const port = parsed.port;

    // Localhost development
    if (host === 'localhost' || host === '127.0.0.1') {
      return port === '3000' || port === '5001' || port === '' || !port;
    }

    // Vercel deployment
    if (host === 'zenith-dusky-theta.vercel.app' || (host.endsWith('.vercel.app') && host.includes('zenith'))) {
      return true;
    }

    // Zenith production domains
    if (host === 'zenith.app' || host.endsWith('.zenith.app') || host === 'zenith-focus.com') {
      return true;
    }

    // Match origin of currently active Zenith session
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
  return isZenithUrl(url) && (url.includes('/focus/') || url.includes('/blocker')) && !url.includes('/setup') && !url.includes('/summary') && !url.includes('/blocked');
}

// ── ALLOWLIST-FIRST EVALUATION (DEFAULT-DENY) ─────────────────────────────────
// When a session is active, EVERY destination outside Zenith and the allowlist is BLOCKED.
function isUrlDistraction(url) {
  if (!isSessionActive) return false;
  if (!url) return false;

  // Internal browser schemes (empty tabs, extension pages, chrome internal)
  if (
    url === 'about:blank' ||
    url === 'about:newtab' ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://')
  ) {
    return false;
  }

  // Zenith itself is always allowed
  if (isZenithUrl(url)) return false;

  const hostname = extractHostname(url);
  if (!hostname) return false;

  // 1. Check always allowed study and engineering tools
  for (const allowed of ALWAYS_ALLOWED_DOMAINS) {
    if (matchesDomainPattern(hostname, allowed)) {
      return false;
    }
  }

  // 2. Check custom allowed websites configured by user
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
    ], (data) => {
      if (data && data.isFocusSessionActive === true) {
        isSessionActive = true;
        zenithRoomUrl = data.zenithFocusUrl || zenithRoomUrl;
        activeZenithTabId = data.activeZenithTabId || activeZenithTabId;
        activeZenithWindowId = data.activeZenithWindowId || activeZenithWindowId;
        if (data.allowedWebsites) customAllowedWebsites = data.allowedWebsites;
        if (data.blockedWebsites) customBlockedWebsites = data.blockedWebsites;
        if (data.sessionMode) sessionMode = data.sessionMode;
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
      });
    } else {
      // Check local storage before deactivating to preserve standalone sessions
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

// ── TAB LOCATOR ──────────────────────────────────────────────────────────────
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
    // Priority 1: Focus room tab
    let found = tabs.find(t => isZenithRoomUrl(t.url));
    // Priority 2: Zenith tab excluding /blocked
    if (!found) {
      found = tabs.find(t => isZenithUrl(t.url) && !t.url.includes('/blocked'));
    }
    // Priority 3: Any Zenith tab
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
      });
      return found;
    }
  } catch (e) {}

  return null;
}

// ── INTERCEPTION & REDIRECTION ENGINE ─────────────────────────────────────────
// Immediately halts access to non-allowed destination, shows blocked countdown,
// and snaps the user right back to Zenith focus room.
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

  // 1. Immediately replace the distracting tab with the blocked page
  try {
    chrome.tabs.update(tabId, { url: webBlockUrl }).catch(() => {
      chrome.tabs.update(tabId, { url: extBlockUrl }).catch(() => {});
    });
  } catch (e) {}

  // 2. Refocus the active Zenith tab immediately
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

// ── EVENT LISTENERS (AIRTIGHT COVERAGE ACROSS ALL BROWSER ACTIONS) ─────────────

// 1. Intercept BEFORE navigation begins (0ms, prevents page loading)
if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;

    await syncStateFromStorage();
    if (!isSessionActive) return;

    const url = details.url;
    if (!url) return;
    if (isZenithUrl(url)) return;

    if (isUrlDistraction(url)) {
      await interceptAndRedirect(details.tabId, url);
    }
  });
}

// 2. Intercept tab updates / address bar navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const targetUrl = tab.url || changeInfo.url;
  if (!targetUrl) return;

  await syncStateFromStorage();
  if (!isSessionActive) return;

  if (isZenithRoomUrl(targetUrl)) {
    activeZenithTabId = tabId;
    activeZenithWindowId = tab.windowId;
    isSessionActive = true;
    zenithRoomUrl = targetUrl;
    chrome.storage.local.set({
      isFocusSessionActive: true,
      zenithFocusUrl: targetUrl,
      activeZenithTabId: tabId,
      activeZenithWindowId: tab.windowId,
    });
    return;
  }

  if (isZenithUrl(targetUrl)) return;

  if (isUrlDistraction(targetUrl)) {
    await interceptAndRedirect(tabId, targetUrl);
  }
});

// 3. Intercept committed / back / forward / history navigations
if (chrome.webNavigation && chrome.webNavigation.onCommitted) {
  chrome.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0) return;

    await syncStateFromStorage();
    if (!isSessionActive) return;

    const url = details.url;
    if (!url || isZenithUrl(url)) return;

    if (isUrlDistraction(url)) {
      await interceptAndRedirect(details.tabId, url);
    }
  });
}

// 4. INSTANT SNAP-BACK ON ANY TAB SWITCH (Zero Delay)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await syncStateFromStorage();
  if (!isSessionActive) return;

  try {
    const activeTab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
    if (!activeTab || !activeTab.url) return;

    // Internal blank or newtab pages are permitted while user is typing
    if (activeTab.url === 'about:blank' || activeTab.url.startsWith('chrome://newtab')) {
      return;
    }

    // If destination is Zenith, update active tab
    if (isZenithUrl(activeTab.url)) {
      if (!activeTab.url.includes('/blocked')) {
        activeZenithTabId = activeTab.id;
        activeZenithWindowId = activeTab.windowId;
        zenithRoomUrl = activeTab.url;
      }
      return;
    }

    // If destination is explicitly allowed (e.g. GitHub, LeetCode, Codeforces), ALLOW!
    if (!isUrlDistraction(activeTab.url)) {
      return;
    }

    // NON-ALLOWED DESTINATION: BLOCK AND PULL BACK IMMEDIATELY!
    await interceptAndRedirect(activeInfo.tabId, activeTab.url);
  } catch (e) {}
});

// 5. Handle Zenith tab closure
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeZenithTabId) {
    activeZenithTabId = null;
    chrome.tabs.query({}).then((tabs) => {
      const remainingZenith = tabs.find(t => isZenithRoomUrl(t.url));
      if (!remainingZenith) {
        // No remaining room tab found
      } else {
        activeZenithTabId = remainingZenith.id;
      }
    });
  }
});

// ── MESSAGE PASSING WITH ZENITH WEB APPLICATION ──────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ZENITH_ROOM_ACTIVE') {
    isSessionActive = true;
    zenithRoomUrl = msg.roomUrl;
    const tabId = sender?.tab?.id || activeZenithTabId;
    const windowId = sender?.tab?.windowId || activeZenithWindowId;
    if (tabId) activeZenithTabId = tabId;
    if (windowId) activeZenithWindowId = windowId;

    chrome.storage.local.set({
      isFocusSessionActive: true,
      zenithFocusUrl: msg.roomUrl,
      activeZenithTabId: tabId,
      activeZenithWindowId: windowId,
    });
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
