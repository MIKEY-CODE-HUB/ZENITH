const trustedOrigins = new Set([
  'https://zenith-dusky-theta.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

if (trustedOrigins.has(location.origin)) {
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (!['ZENITH_BLOCKER_ACTIVATE', 'ZENITH_ROOM_ENDED', 'ZENITH_SNAP_BACK'].includes(message?.type)) return;

    try {
      const result = await chrome.runtime.sendMessage(message);
      if (message.type === 'ZENITH_BLOCKER_ACTIVATE') {
        window.postMessage({ type: 'ZENITH_SHIELD_STATUS', active: result?.active === true }, location.origin);
      }
    } catch {
      if (message.type === 'ZENITH_BLOCKER_ACTIVATE') {
        window.postMessage({ type: 'ZENITH_SHIELD_STATUS', active: false }, location.origin);
      }
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ZENITH_DISTRACTION_ATTEMPT' || message.type === 'ZENITH_SHIELD_STATUS') {
      window.postMessage(message, location.origin);
    }
  });
}
