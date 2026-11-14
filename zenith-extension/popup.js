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
  await chrome.tabs.create({ url: 'https://zenith-dusky-theta.vercel.app/rooms' });
});
