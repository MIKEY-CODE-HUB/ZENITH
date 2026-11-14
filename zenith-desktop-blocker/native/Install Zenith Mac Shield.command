#!/bin/bash
set -euo pipefail

finish() {
  if [[ -t 0 ]]; then read -r -p 'Press Return to close. ' || true; fi
}
trap finish EXIT
if [[ "$(uname -s)" != Darwin ]]; then
  printf '%s\n' 'Zenith Mac Shield requires macOS.' >&2
  exit 1
fi
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
node_bin="$(command -v node || true)"
if [[ -z "$node_bin" ]]; then
  printf '%s\n' 'Node.js is required. Install it, or run this installer from the Terminal where Node is available.' >&2
  exit 1
fi
script_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
"$node_bin" - "$script_dir" <<'JS'
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const origin = require(path.join(process.argv[2], 'mac-shield.cjs')).extensionOrigin;
const appDir = path.join(os.homedir(), 'Library', 'Application Support', 'Zenith', 'Mac Shield');
const chromeDir = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts');
const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
fs.mkdirSync(appDir, { recursive: true, mode: 0o700 });
fs.mkdirSync(chromeDir, { recursive: true });
const host = path.join(appDir, 'mac-shield.cjs');
const launcher = path.join(appDir, 'start-shield');
fs.copyFileSync(path.join(process.argv[2], 'mac-shield.cjs'), host);
fs.writeFileSync(launcher, `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(host)} "$@"\n`, { mode: 0o700 });
fs.chmodSync(launcher, 0o700);
fs.writeFileSync(path.join(chromeDir, 'app.zenith.focus.json'), JSON.stringify({
  name: 'app.zenith.focus', description: 'Zenith Mac app blocker', type: 'stdio', path: launcher, allowed_origins: [origin],
}, null, 2), { mode: 0o600 });
console.log('Zenith Mac Shield installed. Open the Zenith extension popup in Google Chrome and click Connect Mac app blocking.');
JS
