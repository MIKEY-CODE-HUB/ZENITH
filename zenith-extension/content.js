// ═══════════════════════════════════════════════════════════════════════════════
// ZENITH Universal Content Guardian v15.0
// Manifest V3 Content Script — Origin-Validated Handshake
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
  if (window !== window.top) return;

  const currentUrl = window.location.href;

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

  function isZenithUrl(url) {
    if (!url) return false;
    if (url.includes('/blocker/blocked') || url.includes('blocked.html')) {
      return true;
    }
    const host = normalizeDomain(url);
    if (!host) return false;

    if (host === 'localhost' || host === '127.0.0.1') return true;
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
    return false;
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
      let token = null;
      try {
        isShieldActive = localStorage.getItem('zenith_shield_active') === 'true';
        token = sessionStorage.getItem('blocker_token') || localStorage.getItem('token');
      } catch (e) {}

      if (isRoom || isShieldActive) {
        chrome.storage.local.set({
          isFocusSessionActive: true,
          zenithFocusUrl: href,
          blockerToken: token || null,
          lastActiveTime: Date.now(),
        });
        chrome.runtime.sendMessage({
          type: 'ZENITH_ROOM_ACTIVE',
          roomUrl: href,
          blockerToken: token,
        }).catch(() => {});
      } else if (href.includes('/summary')) {
        chrome.storage.local.set({ isFocusSessionActive: false, zenithFocusUrl: null, blockerToken: null });
        chrome.runtime.sendMessage({ type: 'ZENITH_ROOM_ENDED' }).catch(() => {});
      }
    }

    checkZenithState();
    setInterval(checkZenithState, 1000);

    // Origin-validated postMessage listener
    window.addEventListener('message', (event) => {
      if (!event.data) return;
      // Strict origin validation
      if (event.origin && !isZenithUrl(event.origin)) return;

      if (event.data.type === 'ZENITH_ROOM_ACTIVE' || event.data.type === 'ZENITH_BLOCKER_ACTIVATE') {
        const url = event.data.roomUrl || window.location.href;
        const token = event.data.blockerToken;
        chrome.storage.local.set({
          isFocusSessionActive: true,
          zenithFocusUrl: url,
          blockerToken: token || null,
          lastActiveTime: Date.now(),
        });
        chrome.runtime.sendMessage({
          type: 'ZENITH_ROOM_ACTIVE',
          roomUrl: url,
          blockerToken: token,
          focusSessionId: event.data.focusSessionId,
          mode: event.data.mode || 'STRICT',
          config: event.data.config,
        }).catch(() => {});
      } else if (event.data.type === 'ZENITH_ROOM_ENDED') {
        chrome.storage.local.set({ isFocusSessionActive: false, zenithFocusUrl: null, blockerToken: null });
        chrome.runtime.sendMessage({ type: 'ZENITH_ROOM_ENDED' }).catch(() => {});
      } else if (event.data.type === 'ZENITH_SNAP_BACK') {
        chrome.runtime.sendMessage({ type: 'ZENITH_SNAP_BACK' }).catch(() => {});
      }
    });

    // Forward distraction alerts from background to React UI
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
        const host = normalizeDomain(currentUrl);
        if (!host) return;

        // Quick check against standard allowed platforms
        const TIER_2_ALWAYS_ALLOWED = [
          'google.com', 'google.co.in', 'google.co.uk',
          'github.com', 'github.dev', 'leetcode.com', 'codeforces.com',
          'codechef.com', 'hackerrank.com', 'chess.com', 'lichess.org',
          'developer.mozilla.org', 'stackoverflow.com', 'w3schools.com',
          'geeksforgeeks.org', 'docs.google.com', 'drive.google.com',
          'vscode.dev', 'localhost', '127.0.0.1'
        ];

        for (const allowed of TIER_2_ALWAYS_ALLOWED) {
          if (matchesDomainPattern(host, allowed)) return;
        }

        if (data.allowedWebsites) {
          for (const custom of data.allowedWebsites) {
            if (matchesDomainPattern(host, custom)) return;
          }
        }

        // Freeze distracting media immediately
        try {
          document.querySelectorAll('video, audio').forEach((m) => m.pause());
          if (document.body) {
            document.body.style.display = 'none';
          }
        } catch (e) {}

        const returnUrl = data.zenithFocusUrl || 'https://zenith-dusky-theta.vercel.app/dashboard';
        let targetOrigin = 'https://zenith-dusky-theta.vercel.app';
        try {
          targetOrigin = new URL(returnUrl).origin;
        } catch (e) {}

        const blockedPageUrl = (targetOrigin.includes('localhost') || targetOrigin.includes('127.0.0.1') || targetOrigin.includes('vercel.app'))
          ? `${targetOrigin}/blocker/blocked?domain=${encodeURIComponent(host)}&url=${encodeURIComponent(currentUrl)}&room=${encodeURIComponent(returnUrl)}`
          : chrome.runtime.getURL(`blocked.html?domain=${encodeURIComponent(host)}&url=${encodeURIComponent(currentUrl)}&room=${encodeURIComponent(returnUrl)}`);

        window.location.replace(blockedPageUrl);
      }
    });
  }
})();
