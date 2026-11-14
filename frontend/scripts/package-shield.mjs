import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const publicDir = join(frontend, 'public');
const extension = join(frontend, '..', 'zenith-extension');
const native = join(frontend, '..', 'zenith-desktop-blocker', 'native');
const chromeZip = 'zenith-extension.zip';
const macZip = 'zenith-mac-shield.zip';

if (!existsSync(extension) && !existsSync(native)) {
  // Frontend-only deploys use the checked-in copies.
  if ([chromeZip, macZip].every(name => existsSync(join(publicDir, name)))) process.exit(0);
  throw new Error('Missing Shield sources and prebuilt downloads.');
}

const workDir = mkdtempSync(join(publicDir, '.shield-'));
try {
  const bundleDir = join(workDir, 'mac');
  const macDirName = 'Mac App Setup';
  const macDir = join(bundleDir, macDirName);
  mkdirSync(bundleDir);
  mkdirSync(macDir);
  const chromeFiles = [
    'manifest.json', 'background.js', 'desktop-bridge.js', 'content.js',
    'content.css', 'blocked.html', 'popup.html', 'popup.js', 'README.md',
  ];
  for (const name of chromeFiles) copyFileSync(join(extension, name), join(bundleDir, name));
  const installer = 'Install Zenith Mac Shield.command';
  for (const name of [installer, 'mac-shield.cjs']) copyFileSync(join(native, name), join(macDir, name));
  chmodSync(join(macDir, installer), 0o755);
  copyFileSync(join(native, 'README.md'), join(bundleDir, 'START HERE.md'));
  const timestamp = new Date('2024-01-01T00:00:00Z');
  for (const item of [macDir, join(bundleDir, 'START HERE.md'), ...chromeFiles.map(name => join(bundleDir, name)),
    join(macDir, installer), join(macDir, 'mac-shield.cjs')]) {
    utimesSync(item, timestamp, timestamp);
  }
  const env = { ...process.env, TZ: 'UTC' };
  execFileSync('zip', ['-q', '-X', join(workDir, chromeZip), ...chromeFiles], { cwd: bundleDir, env });
  execFileSync('zip', ['-q', '-X', '-r', join(workDir, macZip), ...chromeFiles, 'START HERE.md', macDirName], { cwd: bundleDir, env });
  for (const name of [chromeZip, macZip]) renameSync(join(workDir, name), join(publicDir, name));
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
