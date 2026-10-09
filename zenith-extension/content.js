// ZENITH Universal Content Guardian v14.0
// Production Allowlist-First Content Script

(function () {
  if (window !== window.top) return;

  const currentUrl = window.location.href;

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

  function matchesDomainPattern(hostname, targetDomain) {
    if (!hostname || !targetDomain) return false;
    const h = hostname.toLowerCase().trim().replace(/^www\./, '');
    const d = targetDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0];
    
    if (h === d) return true;
    if (h.endsWith('.' + d)) return true;
    if (d === 'localhost' && (h === '127.0.0.1' || h === 'localhost')) return true;
    return false;
  }

  function isZenithUrl(url) {
    if (!url) return false;
    if (url.includes('/blocker/blocked') || url.includes('blocked.html')) {
      return true;
    }
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().trim().replace(/^www\./, '');

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
        (host.endsWith('.vercel.app') && (host.includes('zenith') || host.includes('trapbreaker'))) ||
        host.includes('zenith')
      ) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  const isZenithSite = isZenithUrl(currentUrl);

  // ── 1. IN ZENITH WEB APPLICATION ───────────────────────────────────────────
  if (isZenithSite) {
    function checkZenithState() {
      const href = window.location.href;
      const isRoom = (
        (href.includes('/focus/') || href.includes('/room/') || href.includes('/rooms/')) &&
        !href.includes('/setup') &&
        !href.includes('/summary') &&
        !href.includes('/blocked')
      );
      let isShieldActive = false;
      try {
        isShieldActive = localStorage.getItem('zenith_shield_active') === 'true';
      } catch (e) {}

      if (isRoom || isShieldActive) {
        chrome.storage.local.set({
          isFocusSessionActive: true,
          zenithFocusUrl: href,
          lastActiveTime: Date.now(),
        });
        chrome.runtime.sendMessage({
          type: 'ZENITH_ROOM_ACTIVE',
          roomUrl: href,
        }).catch(() => {});
      } else if (href.includes('/summary')) {
        chrome.storage.local.set({ isFocusSessionActive: false, zenithFocusUrl: null });
        chrome.runtime.sendMessage({ type: 'ZENITH_ROOM_ENDED' }).catch(() => {});
      }
    }

    checkZenithState();
    setInterval(checkZenithState, 800);

    // Listen for postMessage from React components
    window.addEventListener('message', (event) => {
      if (!event.data) return;
      if (event.data.type === 'ZENITH_ROOM_ACTIVE' || event.data.type === 'ZENITH_BLOCKER_ACTIVATE') {
        const url = event.data.roomUrl || window.location.href;
        chrome.storage.local.set({
          isFocusSessionActive: true,
          zenithFocusUrl: url,
          lastActiveTime: Date.now(),
        });
        chrome.runtime.sendMessage({
          type: 'ZENITH_ROOM_ACTIVE',
          roomUrl: url,
        }).catch(() => {});
      } else if (event.data.type === 'ZENITH_ROOM_ENDED') {
        chrome.storage.local.set({ isFocusSessionActive: false, zenithFocusUrl: null });
        chrome.runtime.sendMessage({ type: 'ZENITH_ROOM_ENDED' }).catch(() => {});
      } else if (event.data.type === 'ZENITH_SNAP_BACK') {
        chrome.runtime.sendMessage({ type: 'ZENITH_SNAP_BACK' }).catch(() => {});
      }
    });

    // Forward distraction attempt alerts to React window
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'ZENITH_DISTRACTION_ATTEMPT') {
        window.postMessage({
          type: 'ZENITH_FOCUS_BROKEN',
          reason: `Attempt to visit ${msg.domain || 'unapproved site'} blocked. Focus protected.`,
        }, '*');
      }
    });

    return;
  }

  // ── 2. ON EXTERNAL WEBSITES DURING ACTIVE FOCUS ────────────────────────────
  if (!isZenithSite && !currentUrl.startsWith('chrome://') && !currentUrl.startsWith('chrome-extension://')) {
    chrome.storage.local.get(['isFocusSessionActive', 'zenithFocusUrl', 'allowedWebsites'], (data) => {
      if (data && data.isFocusSessionActive) {
        const host = extractHostname(currentUrl);
        if (!host) return;

        // Check against allowlist
        let isAllowed = false;
        for (const item of ALWAYS_ALLOWED_DOMAINS) {
          if (matchesDomainPattern(host, item)) {
            isAllowed = true;
            break;
          }
        }

        if (!isAllowed && data.allowedWebsites) {
          for (const item of data.allowedWebsites) {
            if (matchesDomainPattern(host, item)) {
              isAllowed = true;
              break;
            }
          }
        }

        // Allowed destination: grant normal navigation
        if (isAllowed) return;

        // DEFAULT-DENY: Block and redirect immediately
        try {
          document.querySelectorAll('video, audio').forEach((m) => m.pause());
          if (document.body) {
            document.body.style.display = 'none';
          }
        } catch (e) {}

        // Notify background to snap user back to Zenith
        chrome.runtime.sendMessage({
          type: 'EXTERNAL_TAB_SWITCH',
          url: currentUrl,
        }).catch(() => {});

        // Redirect to Zenith blocked countdown page
        const returnUrl = data.zenithFocusUrl || 'https://zenith-dusky-theta.vercel.app/dashboard';
        let targetOrigin = 'https://zenith-dusky-theta.vercel.app';
        try {
          targetOrigin = new URL(returnUrl).origin;
        } catch (e) {}

        try {
          const domain = host;
          const blockedPageUrl = (targetOrigin.includes('localhost') || targetOrigin.includes('127.0.0.1') || targetOrigin.includes('vercel.app'))
            ? `${targetOrigin}/blocker/blocked?domain=${encodeURIComponent(domain)}&url=${encodeURIComponent(currentUrl)}&room=${encodeURIComponent(returnUrl)}`
            : chrome.runtime.getURL(`blocked.html?domain=${encodeURIComponent(domain)}&url=${encodeURIComponent(currentUrl)}&room=${encodeURIComponent(returnUrl)}`);
          
          window.location.replace(blockedPageUrl);
        } catch (e) {
          const extUrl = chrome.runtime.getURL(
            `blocked.html?url=${encodeURIComponent(currentUrl)}&room=${encodeURIComponent(returnUrl)}`
          );
          window.location.replace(extUrl);
        }
      }
    });
  }
})();
