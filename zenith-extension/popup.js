const statusLabel = document.getElementById('shield-status');
const modeLabel = document.getElementById('shield-mode');
const openButton = document.getElementById('open-zenith');

async function activeShield() {
  const { shield } = await chrome.storage.session.get('shield');
  if (!shield || shield.expiresAt <= Date.now()) return null;
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  return rules.some((rule) => rule.action.type === 'block') ? shield : null;
}

async function refreshStatus() {
  try {
    const shield = await activeShield();
    statusLabel.textContent = shield ? 'Active' : 'Standby';
    openButton.textContent = shield ? 'Return to focus room' : 'Reconnect current focus room';
    modeLabel.textContent = shield ? (shield.mode === 'STRICT' ? 'Strict' : 'Block listed sites') : '—';
  } catch {
    statusLabel.textContent = 'Unavailable';
    modeLabel.textContent = '—';
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.shield) void refreshStatus();
});
void refreshStatus();

openButton.addEventListener('click', async () => {
  const shield = await activeShield().catch(() => null);
  if (shield) {
    try {
      const tab = await chrome.tabs.update(shield.tabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return;
    } catch {
      // The focus tab may have closed while the popup was open.
    }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.includes('/focus/')) {
    openButton.disabled = true;
    setTimeout(() => { openButton.disabled = false; void refreshStatus(); }, 9000);
  }
  if (tab?.id) {
    const recovered = await chrome.runtime.sendMessage({ type: 'ZENITH_RECONNECT_ROOM', tabId: tab.id }).catch(() => null);
    if (recovered?.ok) {
      statusLabel.textContent = 'Reconnecting…';
      return;
    }
  }
  await chrome.tabs.create({ url: 'https://zenith-dusky-theta.vercel.app/rooms' });
});

const connectMac = document.getElementById('connect-mac');
const desktopStatus = document.getElementById('desktop-status');
void chrome.runtime.getPlatformInfo().then(({ os }) => { connectMac.hidden = os !== 'mac'; }).catch(() => {});
connectMac.addEventListener('click', async () => {
  connectMac.disabled = true;
  desktopStatus.hidden = false;
  try {
    if (!(await chrome.permissions.request({ permissions: ['nativeMessaging'] }))) {
      desktopStatus.textContent = 'Allow the Mac companion connection to enable app blocking.';
      return;
    }
    const response = await chrome.runtime.sendMessage({ type: 'ZENITH_CONNECT_MAC' });
    desktopStatus.textContent = response?.ok
      ? 'Mac companion connected. Start a protected focus session to block apps.'
      : 'Mac companion unavailable. Run the Mac setup from Zenith first, then try again.';
  } catch {
    desktopStatus.textContent = 'Could not connect the Mac companion. Try again.';
  } finally {
    connectMac.disabled = false;
  }
});
