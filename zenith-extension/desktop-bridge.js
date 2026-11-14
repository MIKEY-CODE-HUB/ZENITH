const desktopHost = 'app.zenith.focus';
const alwaysBlockedApps = [
  'YouTube', 'Instagram', 'Roblox', 'Discord', 'Spotify', 'Steam', 'Telegram', 'WhatsApp', 'Slack',
  'Epic Games', 'Battle.net', 'LeagueClient', 'RiotClientServices', 'Twitch', 'TikTok',
];
const alwaysBlockedAppKeys = new Set(alwaysBlockedApps.map(name => name.toLowerCase()));
let desktopPort;
let desktopBinding;
let desktopPlatform;

function stopDesktopProtection() {
  const port = desktopPort;
  desktopPort = undefined;
  desktopBinding = undefined;
  if (port) port.disconnect();
}

function getDesktopPort(platform) {
  if (desktopPort) return desktopPort;
  const port = chrome.runtime.connectNative(desktopHost);
  desktopPort = port;
  desktopPlatform = platform;
  port.onDisconnect.addListener(() => {
    // Chrome reports a missing host asynchronously. Keep web protection running.
    const failure = chrome.runtime.lastError;
    if (desktopPort !== port) return;
    const session = desktopBinding;
    desktopPort = undefined;
    desktopBinding = undefined;
    if (session) {
      void notifyRoom(session, { type: 'ZENITH_DESKTOP_STATUS', state: failure ? 'setup_needed' : 'disconnected', platform: desktopPlatform });
    }
  });
  port.onMessage.addListener((message) => {
    const session = desktopBinding;
    if (desktopPort !== port || !session || Date.now() >= session.expiresAt || message?.sessionId !== session.id) return;
    if (message.type === 'blocked' && typeof message.app === 'string' && message.app.length <= 100) {
      void focusRoom(session).catch(reportError);
      void notifyRoom(session, { type: 'ZENITH_DESKTOP_DISTRACTION', app: message.app });
    } else if (message.type === 'permission_required' || message.type === 'active') {
      void notifyRoom(session, { type: 'ZENITH_DESKTOP_STATUS', state: message.type, platform: desktopPlatform });
    }
  });
  return port;
}

async function syncDesktopProtection(session, status) {
  const { os: platform } = await chrome.runtime.getPlatformInfo();
  if ((platform !== 'mac' && platform !== 'win') ||
      (await getSession())?.id !== session.id || Date.now() >= session.expiresAt) return;
  const validNames = names => Array.isArray(names) ? names.filter(name => typeof name === 'string').slice(0, 300) : [];
  const allowedApps = validNames(status.allowedApps)
    .filter(name => !alwaysBlockedAppKeys.has(name.trim().toLowerCase().replace(/\.app$/, '')));
  const blockedApps = [...new Set([...alwaysBlockedApps, ...validNames(status.blockedApps)])];
  try {
    const port = getDesktopPort(platform);
    desktopBinding = session;
    port.postMessage({
      type: 'protect', sessionId: session.id, mode: 'BLOCK', expiresAt: session.expiresAt,
      allowedApps, blockedApps, coreBlockedApps: alwaysBlockedApps,
    });
  } catch {
    stopDesktopProtection();
    await notifyRoom(session, { type: 'ZENITH_DESKTOP_STATUS', state: 'setup_needed', platform });
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

async function checkShieldSetup() {
  const [platform, session, rules] = await Promise.all([
    chrome.runtime.getPlatformInfo(), getSession(), chrome.declarativeNetRequest.getSessionRules(),
  ]);
  const desktop = platform.os === 'mac' || platform.os === 'win' ? await probeDesktopHelper() : 'unsupported';
  return {
    version: chrome.runtime.getManifest().version,
    webActive: !!session && Date.now() < session.expiresAt && rules.some(rule => rule.action.type === 'block'),
    desktop, platform: platform.os,
  };
}

function probeDesktopHelper() {
  return new Promise(resolve => {
    let port;
    let finished = false;
    const finish = state => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      port?.disconnect();
      resolve(state);
    };
    const timeout = setTimeout(() => finish('setup_needed'), 3500);
    try {
      port = chrome.runtime.connectNative(desktopHost);
      port.onDisconnect.addListener(() => {
        void chrome.runtime.lastError;
        finish('setup_needed');
      });
      port.onMessage.addListener(message => {
        if (message?.type === 'setup_status') {
          finish(message.canReadForeground ? 'ready' : 'permission_required');
        }
      });
      port.postMessage({ type: 'check_setup' });
    } catch {
      finish('setup_needed');
    }
  });
}
