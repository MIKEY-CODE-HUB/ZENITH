const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const extensionOrigin = 'chrome-extension://iacdabhpidaenkpfpjgifigeknnjjlmi/';
const maxMessageSize = 64 * 1024;
const appleScript = promisify(execFile);
const readForeground = 'tell application "System Events" to get name of first application process whose frontmost is true';
const hideForeground = `on run argv
  set appName to item 1 of argv
  tell application "System Events"
    set foregroundName to name of (first application process whose frontmost is true)
    if foregroundName is not appName then return "moved"
    set visible of process appName to false
    return "hidden"
  end tell
end run`;

function names(list) {
  return new Set(Array.isArray(list) ? list.filter((name) => typeof name === 'string' && name.length <= 100)
    .map((name) => name.trim().toLowerCase().replace(/\.app$/, '')) : []);
}

function attachNativeHost(input, output, runScript = appleScript) {
  let buffer = Buffer.alloc(0);
  let session;
  let timer;
  let checking = false;
  let reportedStatus;
  function send(message) {
    if (output.destroyed || output.writableEnded) return;
    const bytes = Buffer.from(JSON.stringify(message));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(bytes.length);
    output.write(Buffer.concat([header, bytes]));
  }
  function stop() {
    session = undefined;
    clearInterval(timer);
    timer = undefined;
  }
  function report(type, sessionId) {
    if (reportedStatus === type) return;
    reportedStatus = type;
    send({ type, sessionId });
  }
  async function inspect() {
    if (!session || Date.now() >= session.expiresAt) return stop();
    if (checking) return;
    checking = true;
    const current = session;
    try {
      const { stdout } = await runScript('/usr/bin/osascript', ['-e', readForeground], { timeout: 2000 });
      if (session !== current || Date.now() >= current.expiresAt) return;
      const app = stdout.trim();
      if (!app || app.length > 100) return;
      const key = app.toLowerCase();
      const allowed = ['google chrome', 'finder', 'terminal', 'system settings', 'system events'].includes(key) || current.allowed.has(key);
      if (allowed || !current.blocked.has(key)) {
        report('active', current.id);
        return;
      }
      const result = await runScript('/usr/bin/osascript', ['-e', hideForeground, app], { timeout: 2000 });
      if (session !== current || Date.now() >= current.expiresAt) return;
      report('active', current.id);
      if (result.stdout.trim() === 'hidden') send({ type: 'blocked', sessionId: current.id, app });
    } catch {
      if (session === current) report('permission_required', current.id);
    } finally {
      checking = false;
    }
  }
  function receive(message) {
    if (message?.type === 'ping') return send({ type: 'ready' });
    if (message?.type === 'check_setup') {
      void runScript('/usr/bin/osascript', ['-e', readForeground], { timeout: 2500 }).then(
        () => send({ type: 'setup_status', canReadForeground: true }),
        () => send({ type: 'setup_status', canReadForeground: false }),
      );
      return;
    }
    if (message?.type !== 'protect' || typeof message.sessionId !== 'string' ||
        !['BLOCK', 'STRICT'].includes(message.mode) || !Number.isFinite(message.expiresAt) ||
        message.expiresAt <= Date.now() || message.expiresAt > Date.now() + 241 * 60_000) return;
    if (session?.id !== message.sessionId) reportedStatus = undefined;
    session = { id: message.sessionId, expiresAt: message.expiresAt,
      allowed: names(message.allowedApps), blocked: names(message.blockedApps) };
    if (!timer) {
      timer = setInterval(() => void inspect(), 400);
      void inspect();
    }
  }
  input.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE();
      if (length > maxMessageSize) {
        stop();
        input.destroy();
        return;
      }
      if (buffer.length < 4 + length) return;
      try { receive(JSON.parse(buffer.subarray(4, 4 + length))); } catch {}
      buffer = buffer.subarray(4 + length);
    }
  });
  input.once('end', stop);
  input.once('close', stop);
  output.once('error', stop);
}

if (require.main === module) {
  if (process.platform !== 'darwin' || process.argv[2] !== extensionOrigin) process.exit(1);
  attachNativeHost(process.stdin, process.stdout);
}
module.exports = { attachNativeHost, extensionOrigin };
