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

const { execSync } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BACKEND_URL = process.env.ZENITH_BACKEND_URL || 'http://127.0.0.1:5001';
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

// Parse Command Line Arguments
const args = process.argv.slice(2);
let token = process.env.ZENITH_AUTH_TOKEN || process.env.ZENITH_TOKEN || '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pair' || args[i] === '-p') {
    const pairToken = args[i + 1];
    if (pairToken) {
      try {
        if (!fs.existsSync(CONFIG_DIR)) {
          fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token: pairToken, pairedAt: new Date().toISOString() }, null, 2));
        console.log('\x1b[32m%s\x1b[0m', '✅ Desktop companion successfully paired and credentials saved to ~/.zenith/desktop-token.json');
        token = pairToken;
        i++;
      } catch (err) {
        console.error('Failed to save pairing token:', err.message);
      }
    }
  } else if (args[i] === '--token' || args[i] === '-t') {
    token = args[i + 1] || '';
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
ZENITH Desktop Blocker & Focus Companion Daemon v11.0

Usage:
  node zenith-companion.js [options]

Options:
  --pair, -p <TOKEN>     Pair companion with your Zenith account and save credentials
  --token, -t <TOKEN>    Use an explicit JWT token for this session
  --help, -h             Show this help menu

Environment Variables:
  ZENITH_AUTH_TOKEN      Set your pairing token
  ZENITH_BACKEND_URL     Backend URL (default: http://127.0.0.1:5001)
    `);
    process.exit(0);
  }
}

// If no token from CLI or ENV, check ~/.zenith/desktop-token.json
if (!token && fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (saved && saved.token) {
      token = saved.token;
    }
  } catch (e) {}
}

console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  ⚡ ZENITH Native Desktop Blocker & Focus Companion Daemon v11.0');
console.log('\x1b[36m%s\x1b[0m', '  🚀 Three-Tier Native App Guardian (Multi-User Isolated)        ');
console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
console.log(`📡 Backend URL: ${BACKEND_URL}`);
console.log(`💻 Operating System: ${process.platform} (${os.release()})`);
if (token) {
  console.log(`🔐 Authentication: Paired (Token length: ${token.length})`);
} else {
  console.log('\x1b[33m⚠️  Authentication: Unpaired (Running in auto-pairing standby mode)\x1b[0m');
  console.log('💡 Tip: Pair in 1-click from the Zenith web app or run:');
  console.log('   node zenith-companion.js --pair <YOUR_TOKEN>\n');
}
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

/**
 * High-performance, non-blocking frontmost application inspection (macOS)
 */
function getFrontmostApp() {
  if (process.platform !== 'darwin') return null;
  try {
    const cmd = `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`;
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 800 }).trim();
  } catch (e) {
    return null;
  }
}

/**
 * Safely hides a distracting application process and brings Zenith browser to the front.
 */
function hideAppAndRefocusBrowser(appName) {
  if (process.platform !== 'darwin') return;
  try {
    // 1. Hide the distracting application
    execSync(`osascript -e 'tell application "System Events" to set visible of process "${appName}" to false'`, {
      stdio: 'ignore',
      timeout: 1000,
    });
  } catch (e) {}

  try {
    // 2. Refocus primary browser window with Zenith focus room
    const script = `
      try
        tell application "Google Chrome" to activate
      on error
        try
          tell application "Brave Browser" to activate
        on error
          try
            tell application "Arc" to activate
          on error
            try
              tell application "Safari" to activate
            end try
          end try
        end try
      end try
    `;
    execSync(`osascript -e '${script}'`, { stdio: 'ignore', timeout: 1000 });
  } catch (e) {}
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
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req = client.request(
    urlObj,
    {
      method: 'POST',
      headers,
      timeout: 2000,
    },
    () => {}
  );
  req.on('error', () => {});
  req.write(postData);
  req.end();
}

/**
 * Synchronizes user-scoped session state and policy lists from the backend.
 */
function checkSessionStatus() {
  const urlObj = new URL(`${BACKEND_URL}/api/blocker/live-status`);
  const client = urlObj.protocol === 'https:' ? https : http;

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const req = client.get(urlObj, { headers, timeout: 2000 }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const wasActive = isSessionActive;
        isSessionActive = !!json.active;

        if (json.active) {
          currentSessionData = {
            sessionId: json.sessionId,
            userId: json.userId,
            user: json.user,
            mode: json.mode || 'STRICT',
            blockedApps: json.blockedApps || TIER_1_ALWAYS_BLOCKED_APPS,
            allowedApps: json.allowedApps || TIER_2_ALWAYS_ALLOWED_APPS,
            blockedWebsites: json.blockedWebsites || [],
            allowedWebsites: json.allowedWebsites || [],
            activityType: json.activityType,
          };
        }

        if (!wasActive && isSessionActive) {
          console.log(`\x1b[32m\n🔥 [FOCUS SESSION ENGAGED]\x1b[0m Activity: \x1b[1m${currentSessionData.activityType || 'Deep Focus'}\x1b[0m | Mode: \x1b[1m${currentSessionData.mode}\x1b[0m | User: \x1b[1m${currentSessionData.user?.name || currentSessionData.user?.username || 'Authenticated'}\x1b[0m`);
          console.log(`🛡️  Enforcing ${currentSessionData.blockedApps.length} blocked applications and ${currentSessionData.allowedApps.length} permitted tools.\n`);
        } else if (wasActive && !isSessionActive) {
          console.log(`\x1b[33m\n💤 [FOCUS SESSION ENDED]\x1b[0m Standby mode engaged. All native applications unlocked.\n`);
        }
      } catch (err) {}
    });
  });

  req.on('error', () => {
    if (isSessionActive) {
      console.log('\x1b[33m⚠️  Backend disconnected. Reverting to standby failsafe.\x1b[0m');
      isSessionActive = false;
    }
  });
}

// 1. Session Status Polling Loop (Every 1.2s)
setInterval(checkSessionStatus, 1200);
checkSessionStatus();

// 2. High-Frequency Native Enforcement Loop (400ms low-overhead cycle)
setInterval(() => {
  const frontApp = getFrontmostApp();
  if (!frontApp) return;

  const evaluation = evaluateDesktopApp(frontApp);

  if (evaluation.action === 'BLOCK') {
    const now = Date.now();
    if (now - lastSnapTime > 1500) {
      lastSnapTime = now;
      console.log(`\x1b[31m🚨 DISTRACTION INTERCEPTED!\x1b[0m [${frontApp}] opened during active focus session (${evaluation.reason}). Hiding application and refocusing ZENITH...`);
      recordDistractionAttempt(`Desktop App: ${frontApp}`);
    }
    hideAppAndRefocusBrowser(frontApp);
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
