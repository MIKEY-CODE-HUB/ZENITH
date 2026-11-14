const desktopHost = 'app.zenith.focus';
const desktopPermission = { permissions: ['nativeMessaging'] };
let desktopPort;
let desktopBinding;
let desktopProbe;
let desktopConnecting;

function stopDesktopProtection() {
  const port = desktopPort;
  desktopPort = undefined;
  desktopBinding = undefined;
  if (port) port.disconnect();
}

async function getDesktopPort() {
  if (desktopPort) return desktopPort;
  if (!(await chrome.permissions.contains(desktopPermission))) return null;
  if (desktopPort) return desktopPort;
  const port = chrome.runtime.connectNative(desktopHost);
  desktopPort = port;
  port.onDisconnect.addListener(() => {
    // Consume the Chrome error. Browser protection can continue without the Mac helper.
    const failure = chrome.runtime.lastError;
    if (desktopPort !== port) return;
    desktopPort = undefined;
    desktopBinding = undefined;
    desktopProbe?.({ ok: false, reason: failure ? 'host_unavailable' : 'host_disconnected' });
  });
  port.onMessage.addListener((message) => {
    if (desktopPort !== port) return;
    if (message?.type === 'ready') desktopProbe?.({ ok: true });
    const session = desktopBinding;
    if (!session || message?.sessionId !== session.id) return;
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
  const port = await getDesktopPort();
  if (!port || (await getSession())?.id !== session.id || desktopPort !== port) return;
  desktopBinding = session;
  port.postMessage({
    type: 'protect', sessionId: session.id, mode: session.mode, expiresAt: session.expiresAt,
    allowedApps: (Array.isArray(status.allowedApps) ? status.allowedApps : []).filter(x => typeof x === 'string').slice(0, 300),
    blockedApps: (Array.isArray(status.blockedApps) ? status.blockedApps : []).filter(x => typeof x === 'string').slice(0, 300),
  });
}

function connectDesktopFromPopup() {
  desktopConnecting ??= probeDesktopHost().finally(() => { desktopConnecting = undefined; });
  return desktopConnecting;
}

async function probeDesktopHost() {
  if ((await chrome.runtime.getPlatformInfo()).os !== 'mac') return { ok: false, reason: 'mac_only' };
  const port = await getDesktopPort();
  if (!port) return { ok: false, reason: 'permission_required' };
  const result = await new Promise((resolve) => {
    const timer = setTimeout(() => done({ ok: false, reason: 'host_unavailable' }), 2200);
    function done(response) {
      clearTimeout(timer);
      desktopProbe = undefined;
      resolve(response);
    }
    desktopProbe = done;
    try { port.postMessage({ type: 'ping' }); } catch { done({ ok: false, reason: 'host_unavailable' }); }
  });
  if (result.ok) {
    const session = await getSession();
    if (session) void serialize(reconcile).catch(() => {});
    else stopDesktopProtection();
  } else stopDesktopProtection();
  return result;
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
