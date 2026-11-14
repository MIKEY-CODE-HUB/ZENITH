const desktopHost = 'app.zenith.focus';
let desktopPort;
let desktopBinding;

function stopDesktopProtection() {
  const port = desktopPort;
  desktopPort = undefined;
  desktopBinding = undefined;
  if (port) port.disconnect();
}

function getDesktopPort() {
  if (desktopPort) return desktopPort;
  const port = chrome.runtime.connectNative(desktopHost);
  desktopPort = port;
  port.onDisconnect.addListener(() => {
    // Chrome reports a missing host asynchronously. Keep web protection running.
    const failure = chrome.runtime.lastError;
    if (desktopPort !== port) return;
    const session = desktopBinding;
    desktopPort = undefined;
    desktopBinding = undefined;
    if (session) {
      void notifyRoom(session, { type: 'ZENITH_DESKTOP_STATUS', state: failure ? 'setup_needed' : 'disconnected' });
    }
  });
  port.onMessage.addListener((message) => {
    const session = desktopBinding;
    if (desktopPort !== port || !session || Date.now() >= session.expiresAt || message?.sessionId !== session.id) return;
    if (message.type === 'blocked' && typeof message.app === 'string' && message.app.length <= 100) {
      void focusRoom(session).catch(reportError);
      void notifyRoom(session, { type: 'ZENITH_DESKTOP_DISTRACTION', app: message.app });
    } else if (message.type === 'permission_required' || message.type === 'active') {
      void notifyRoom(session, { type: 'ZENITH_DESKTOP_STATUS', state: message.type });
    }
  });
  return port;
}

async function syncDesktopProtection(session, status) {
  if ((await chrome.runtime.getPlatformInfo()).os !== 'mac' ||
      (await getSession())?.id !== session.id || Date.now() >= session.expiresAt) return;
  try {
    const port = getDesktopPort();
    desktopBinding = session;
    port.postMessage({
      type: 'protect', sessionId: session.id, mode: 'BLOCK', expiresAt: session.expiresAt,
      allowedApps: (Array.isArray(status.allowedApps) ? status.allowedApps : []).filter(x => typeof x === 'string').slice(0, 300),
      blockedApps: (Array.isArray(status.blockedApps) ? status.blockedApps : []).filter(x => typeof x === 'string').slice(0, 300),
    });
  } catch {
    stopDesktopProtection();
    await notifyRoom(session, { type: 'ZENITH_DESKTOP_STATUS', state: 'setup_needed' });
  }
}

async function reconnectRoom(tabId) {
  if (!Number.isInteger(tabId)) return { ok: false };
  const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
  const room = parseUrl(frame?.url);
  if (!room || !trustedOrigins.has(room.origin) || !/^\/focus\/[^/]+\/?$/.test(room.pathname)) return { ok: false };
  await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['content.js'] });
  await chrome.tabs.sendMessage(tabId, { type: 'ZENITH_RETRY_SHIELD' });
  return { ok: true };
}
