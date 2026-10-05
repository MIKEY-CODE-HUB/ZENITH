// ZENITH Universal Content Guardian v11.0

(function () {
  if (window !== window.top) return;

  const currentUrl = window.location.href;
  const isZenithSite = currentUrl.includes('localhost:3000') ||
                       currentUrl.includes('127.0.0.1:3000') ||
                       currentUrl.includes('vercel.app') ||
                       currentUrl.includes('zenith');

  // 1. IN ZENITH WEB APPLICATION
  if (isZenithSite) {
    function checkZenithState() {
      const href = window.location.href;
      const isRoom = href.includes('/focus/') && !href.includes('/setup') && !href.includes('/summary');
      if (isRoom) {
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
      if (event.data.type === 'ZENITH_ROOM_ACTIVE') {
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
          reason: `Attempt to visit ${msg.domain || 'distracting site'} blocked. Focus protected.`,
        }, '*');
      }
    });

    return;
  }

  // 2. ON EXTERNAL WEBSITES DURING ACTIVE FOCUS (Fallback content script check)
  if (!isZenithSite && !currentUrl.startsWith('chrome://') && !currentUrl.startsWith('chrome-extension://')) {
    chrome.storage.local.get(['isFocusSessionActive', 'zenithFocusUrl'], (data) => {
      if (data && data.isFocusSessionActive && data.zenithFocusUrl) {
        try {
          document.querySelectorAll('video, audio').forEach((m) => m.pause());
          if (document.body) document.body.style.overflow = 'hidden';
        } catch (e) {}

        chrome.runtime.sendMessage({
          type: 'EXTERNAL_TAB_SWITCH',
          url: currentUrl,
        }).catch(() => {});

        try {
          const u = new URL(currentUrl);
          const domain = u.hostname.replace(/^www\./, '');
          const blockedPageUrl = `http://localhost:3000/blocker/blocked?domain=${encodeURIComponent(domain)}&url=${encodeURIComponent(currentUrl)}&room=${encodeURIComponent(data.zenithFocusUrl)}`;
          window.location.replace(blockedPageUrl);
        } catch (e) {
          const extUrl = chrome.runtime.getURL(
            `blocked.html?url=${encodeURIComponent(currentUrl)}&room=${encodeURIComponent(data.zenithFocusUrl)}`
          );
          window.location.replace(extUrl);
        }
      }
    });
  }
})();
