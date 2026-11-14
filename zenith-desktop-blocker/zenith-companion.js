#!/usr/bin/env node

/**
 * ⚡ ZENITH Native Desktop Blocker & Focus Companion Daemon v11.0
 * 
 * Features:
 * 1. Multi-User Isolated Authentication:
 *    - Authenticates via CLI flag (--token / --pair), ENV (ZENITH_AUTH_TOKEN), or ~/.zenith/desktop-token.json
 *    - Strictly queries user-scoped live status from Express backend
 * 2. Three-Tier Native Application Policy Engine:
 *    - Tier 1 (Always Blocked): Discord, Spotify, Steam, Telegram, WhatsApp, Slack, Games, etc.
 *    - Tier 2 (Always Allowed): Google Chrome, Brave, Arc, Safari, Terminal, iTerm2, VS Code, Cursor, Windsurf, Xcode, Finder, Zenith.
 *    - Tier 3 (User Custom Rules): Dynamically synchronized from PostgreSQL (Allowed & Blocked Apps).
 *    - Precedence: Tier 2 (Allow) > Tier 1 (Block) > Tier 3 Allow > Tier 3 Block > STRICT Default-Deny.
 * 3. Safe, Non-Destructive Interception:
 *    - Uses macOS System Events AppleScript to hide distracting processes and refocus Zenith.
 *    - Zero process termination or data loss.
 * 4. Anti-Thrashing & Low CPU Usage:
 *    - 400ms polling rate with 3-second telemetry debounce.
 * 5. Failsafe:
 *    - Graceful SIGINT/SIGTERM shutdown with zero lingering processes or locks.
 */

const { execFileSync } = require('node:child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const defaultBackendUrl = 'http://127.0.0.1:5001';
const CONFIG_DIR = path.join(os.homedir(), '.zenith');
const CONFIG_FILE = path.join(CONFIG_DIR, 'desktop-token.json');

// Tier 1: Core High-Distraction Desktop Applications
const TIER_1_ALWAYS_BLOCKED_APPS = [
  'Discord',
  'Spotify',
  'Steam',
  'Telegram',
  'WhatsApp',
  'Slack',
  'Epic Games',
  'Battle.net',
  'LeagueClient',
  'RiotClientServices',
  'Twitch',
  'TikTok'
];

// Tier 2: Essential Learning & Development Applications (Never Blocked)
const TIER_2_ALWAYS_ALLOWED_APPS = [
  'Google Chrome',
  'Brave Browser',
  'Arc',
  'Safari',
  'Terminal',
  'iTerm2',
  'Code', // VS Code
  'Cursor',
  'Windsurf',
  'Xcode',
  'Android Studio',
  'IntelliJ IDEA',
  'WebStorm',
  'PyCharm',
  'Sublime Text',
  'Finder',
  'Zenith',
  'Antigravity'
];

let savedPairing = {};
try {
  savedPairing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) || {};
} catch (error) {
  if (error.code !== 'ENOENT') console.error('Could not read saved Zenith pairing. Pair again from Distraction Shield.');
}

const args = process.argv.slice(2);
let token = process.env.ZENITH_AUTH_TOKEN || process.env.ZENITH_TOKEN || savedPairing.token || '';
let backendInput = process.env.ZENITH_BACKEND_URL || savedPairing.backendUrl || defaultBackendUrl;
let shouldSave = false;
for (let i = 0; i < args.length; i++) {
  const option = args[i];
  if (option === '--help' || option === '-h') {
    console.log(`Usage: node zenith-companion.js [--backend URL] [--pair TOKEN | --token TOKEN]

--pair saves the token and Zenith origin for later runs. --token uses a token for this run only.`);
    process.exit(0);
  }
  if (!['--pair', '-p', '--token', '-t', '--backend'].includes(option) || !args[i + 1] || args[i + 1].startsWith('-')) {
    console.error('Invalid option. Run with --help for usage.');
    process.exit(1);
  }
  if (option === '--backend') backendInput = args[++i];
  else {
    token = args[++i];
    shouldSave = option === '--pair' || option === '-p';
  }
}

let BACKEND_URL;
try {
  const backend = new URL(backendInput);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(backend.hostname);
  if ((backend.protocol !== 'https:' && !(backend.protocol === 'http:' && loopback)) || backend.username ||
      backend.password || backend.pathname !== '/' || backend.search || backend.hash) throw new Error('Invalid backend origin');
  BACKEND_URL = backend.origin;
} catch {
  console.error('Use a Zenith HTTPS origin, or an HTTP loopback origin for local development.');
  process.exit(1);
}

if (!token) {
  console.error('Pair from the Distraction Shield page in Zenith and run the copied command.');
  process.exit(1);
}

if (process.platform !== 'darwin') {
  console.error('The Zenith desktop companion requires macOS.');
  process.exit(1);
}

if (shouldSave) {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token, backendUrl: BACKEND_URL }, null, 2), { mode: 0o600 });
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch {
    console.error('Could not save the Zenith pairing. Check access to ~/.zenith.');
    process.exit(1);
  }
}

console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  ⚡ ZENITH Native Desktop Blocker & Focus Companion Daemon v11.0');
console.log('\x1b[36m%s\x1b[0m', '  🚀 Three-Tier Native App Guardian (Multi-User Isolated)        ');
console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
console.log(`📡 Backend URL: ${BACKEND_URL}`);
console.log(`💻 Operating System: ${process.platform} (${os.release()})`);
console.log('Press Ctrl+C anytime to stop.\n');

let isSessionActive = false;
let currentSessionData = {
  sessionId: null,
  userId: null,
  user: null,
  mode: 'STRICT',
  blockedApps: TIER_1_ALWAYS_BLOCKED_APPS,
  allowedApps: TIER_2_ALWAYS_ALLOWED_APPS,
  blockedWebsites: [],
  allowedWebsites: [],
};

let lastReportedResource = '';
let lastReportedTime = 0;
let lastSnapTime = 0;

let lastMacError = 0;
function reportMacError() {
  const now = Date.now();
  if (now - lastMacError < 30_000) return;
  lastMacError = now;
  console.error('Zenith could not control macOS apps. Allow Terminal to control System Events under Privacy & Security → Automation, and enable Terminal under Accessibility if prompted.');
}

function getFrontmostApp() {
  try {
    return execFileSync('/usr/bin/osascript', ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 800,
    }).trim();
  } catch {
    reportMacError();
    return null;
  }
}

function hideBlockedApp(appName) {
  const script = `on run argv
    set appName to item 1 of argv
    tell application "System Events"
      set visible of process appName to false
      try
        if exists process "Google Chrome" then set frontmost of process "Google Chrome" to true
      end try
    end tell
  end run`;
  try {
    execFileSync('/usr/bin/osascript', ['-e', script, appName], { stdio: 'pipe', timeout: 1200 });
    return true;
  } catch {
    reportMacError();
    return false;
  }
}

/**
 * Evaluates foreground application against the authoritative Three-Tier policy hierarchy.
 */
function evaluateDesktopApp(frontApp) {
  if (!frontApp) return { action: 'ALLOW', tier: 'SYSTEM' };

  // If focus session is inactive, all apps are allowed
  if (!isSessionActive) {
    return { action: 'ALLOW', tier: 'SYSTEM', reason: 'Session Inactive (Standby)' };
  }

  const cleanApp = frontApp.toLowerCase().trim();

  // Tier 2: Predefined Always Allowed (Absolute Precedence over custom blocks)
  const isTier2Allowed = TIER_2_ALWAYS_ALLOWED_APPS.some((app) => {
    const target = app.toLowerCase();
    return cleanApp === target || cleanApp.includes(target) || target.includes(cleanApp);
  });
  if (isTier2Allowed) {
    return { action: 'ALLOW', tier: 'TIER_2', reason: 'Tier 2 Essential Tool' };
  }

  // Tier 1: Predefined Always Blocked (Absolute Precedence over custom allows)
  const isTier1Blocked = TIER_1_ALWAYS_BLOCKED_APPS.some((app) => {
    const target = app.toLowerCase();
    return cleanApp === target || cleanApp.includes(target) || target.includes(cleanApp);
  });
  if (isTier1Blocked) {
    return { action: 'BLOCK', tier: 'TIER_1', reason: 'Tier 1 Distraction Platform' };
  }

  // Tier 3: User Custom Allowed Apps
  const customAllowed = (currentSessionData.allowedApps || []).some((app) => {
    const target = app.toLowerCase();
    return cleanApp === target || cleanApp.includes(target) || target.includes(cleanApp);
  });
  if (customAllowed) {
    return { action: 'ALLOW', tier: 'TIER_3', reason: 'Tier 3 Custom Allowed Application' };
  }

  // Tier 3: User Custom Blocked Apps
  const customBlocked = (currentSessionData.blockedApps || []).some((app) => {
    const target = app.toLowerCase();
    return cleanApp === target || cleanApp.includes(target) || target.includes(cleanApp);
  });
  if (customBlocked) {
    return { action: 'BLOCK', tier: 'TIER_3', reason: 'Tier 3 Custom Blocked Application' };
  }

  // Unknown Application — Mode Dependent
  if (currentSessionData.mode === 'STRICT') {
    return { action: 'BLOCK', tier: 'UNKNOWN', reason: 'Strict Focus Mode (Default-Deny)' };
  }

  return { action: 'ALLOW', tier: 'UNKNOWN', reason: 'Standard Mode (Default-Allow)' };
}

/**
 * Telemetry: Records distraction attempt strictly attributed to authenticated user.
 */
function recordDistractionAttempt(resourceName) {
  const now = Date.now();
  if (lastReportedResource === resourceName && now - lastReportedTime < 3000) {
    return;
  }
  lastReportedResource = resourceName;
  lastReportedTime = now;

  const postData = JSON.stringify({
    sessionId: currentSessionData?.sessionId,
    appName: resourceName,
  });

  const urlObj = new URL(`${BACKEND_URL}/api/blocker/desktop-attempt`);
  const client = urlObj.protocol === 'https:' ? https : http;

  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    Authorization: `Bearer ${token}`,
  };
  const req = client.request(
    urlObj,
    {
      method: 'POST',
      headers,
      timeout: 2000,
    },
    (response) => response.resume()
  );
  req.on('timeout', () => req.destroy());
  req.on('error', () => {});
  req.write(postData);
  req.end();
}

let checking = false;
let lastStatus = '';
function checkSessionStatus() {
  if (checking) return;
  checking = true;
  const url = new URL('/api/blocker/live-status', BACKEND_URL);
  const client = url.protocol === 'https:' ? https : http;
  const req = client.get(url, { headers: { Authorization: `Bearer ${token}` }, timeout: 3000 }, (response) => {
    let body = '';
    response.on('data', (chunk) => { body += chunk; });
    response.on('aborted', () => updateStatus(false, 'Zenith disconnected. Check the site URL and your connection.'));
    response.on('end', () => {
      if (response.statusCode !== 200) {
        updateStatus(false, `Zenith returned HTTP ${response.statusCode}. Check the site URL and pair again from the same Zenith site.`);
        return;
      }
      try {
        const policy = JSON.parse(body);
        if (policy.message?.startsWith('Authentication required')) {
          updateStatus(false, 'Pairing expired or belongs to another backend. Generate a new pairing token.');
        } else if (policy.active === true && ['STRICT', 'BLOCK'].includes(policy.mode) && policy.sessionId) {
          currentSessionData = policy;
          updateStatus(true, `Desktop protection active (${policy.mode}).`);
        } else {
          updateStatus(false, 'Desktop protection on standby. Start a protected focus session on this Zenith site.');
        }
      } catch {
        updateStatus(false, 'Could not read Zenith status. Check the site URL.');
      }
    });
  });
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.on('error', () => updateStatus(false, 'Could not reach Zenith. Check the site URL and your connection.'));
  req.on('close', () => { checking = false; });
}

function updateStatus(active, message) {
  isSessionActive = active;
  if (message === lastStatus) return;
  lastStatus = message;
  console.log(message);
}

setInterval(checkSessionStatus, 2000);
checkSessionStatus();

setInterval(() => {
  if (!isSessionActive) return;
  const frontApp = getFrontmostApp();
  if (!frontApp) return;
  const evaluation = evaluateDesktopApp(frontApp);
  if (evaluation.action !== 'BLOCK' || Date.now() - lastSnapTime < 1500) return;
  lastSnapTime = Date.now();
  if (hideBlockedApp(frontApp)) {
    console.log(`Blocked ${frontApp}.`);
    try {
      execFileSync('/usr/bin/osascript', ['-e', 'on run argv\ndisplay notification ("Blocked " & item 1 of argv & " during your focus session.") with title "Zenith Shield"\nend run', frontApp], { stdio: 'ignore', timeout: 800 });
    } catch {}
    recordDistractionAttempt(`Desktop App: ${frontApp}`);
  }
}, 400);

// Graceful Teardown on SIGINT / SIGTERM
process.on('SIGINT', () => {
  console.log('\n\x1b[36m🛑 ZENITH Desktop Blocker safely stopped. Have a productive day!\x1b[0m');
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
