'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

type DesktopSetup = 'ready' | 'permission_required' | 'setup_needed' | 'unsupported' | 'not_mac';
type SetupResult = { version: string; desktop: DesktopSetup; webActive: boolean; platform?: string };

function desktopMessage(result: SetupResult) {
  const platform = result.platform === 'win' ? 'Windows' : 'Mac';
  switch (result.desktop) {
    case 'ready': return `${platform} helper is installed. Test a blocked app during a focus session.`;
    case 'permission_required': return platform === 'Mac'
      ? 'Approve System Events in macOS Privacy & Security, then check again.'
      : 'Windows could not read the foreground window. Return to Chrome and check again.';
    case 'setup_needed': return `${platform} helper could not connect. Run the installer and check again.`;
    case 'unsupported':
    case 'not_mac': return 'Desktop app protection is available on Windows and macOS.';
  }
}

export function ShieldSetup() {
  const [feedback, setFeedback] = useState('');
  const [checking, setChecking] = useState(false);
  const request = useRef<{ id: string; timeout: number } | null>(null);

  useEffect(() => {
    const onStatus = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin || !request.current) return;
      if (event.data?.type !== 'ZENITH_SETUP_STATUS' || event.data.requestId !== request.current.id) return;
      const result = event.data.result as SetupResult | undefined;
      if (!result || typeof result.version !== 'string' || !['ready', 'permission_required', 'setup_needed', 'unsupported', 'not_mac'].includes(result.desktop)) return;
      window.clearTimeout(request.current.timeout);
      request.current = null;
      setChecking(false);
      setFeedback(`Chrome extension ${result.version} connected. Website protection is ${result.webActive ? 'active' : 'on standby'}. ${desktopMessage(result)}`);
    };
    window.addEventListener('message', onStatus);
    return () => {
      if (request.current) window.clearTimeout(request.current.timeout);
      window.removeEventListener('message', onStatus);
    };
  }, []);

  function checkSetup() {
    const id = crypto.randomUUID();
    setChecking(true);
    setFeedback('Checking Shield setup…');
    const timeout = window.setTimeout(() => {
      request.current = null;
      setChecking(false);
      setFeedback('No reply from Shield. Update the Chrome extension to 10.6.0, then reload this Zenith tab.');
    }, 5000);
    request.current = { id, timeout };
    window.postMessage({ type: 'ZENITH_CHECK_SETUP', requestId: id }, window.location.origin);
  }

  return (
    <section id="install-shield" className="scroll-mt-24 space-y-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Install or check Shield</h2>
      <div className="flex flex-wrap items-center gap-4">
        <a href="/zenith-mac-shield.zip" download className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-200">
          <Download aria-hidden="true" size={16} /> Download for Mac
        </a>
        <a href="/zenith-windows-shield.zip" download className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
          <Download aria-hidden="true" size={16} /> Download for Windows
        </a>
        <a href="#android-shield" className="text-sm text-emerald-200 underline underline-offset-4">Android setup</a>
        <a href="/zenith-extension.zip" download className="text-sm text-emerald-200 underline underline-offset-4">Download Chrome extension only</a>
        <button type="button" onClick={checkSetup} disabled={checking} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50">Check setup</button>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">
        <li><strong>Chrome.</strong> Extract the ZIP. In <code>chrome://extensions</code>, enable Developer mode and use <strong>Load unpacked</strong> to select the extracted folder itself. It contains <code>manifest.json</code>. When upgrading, remove the old Zenith Shield entry first, then reload the Zenith tab.</li>
        <li><strong>Mac desktop apps.</strong> In Finder, open <strong>Mac App Setup</strong> and double-click <strong>Install Zenith Mac Shield.command</strong>. It uses Node.js. Use <strong>Check setup</strong> and approve any macOS permission prompt.</li>
        <li><strong>Windows desktop apps.</strong> Extract the Windows ZIP, open <strong>ZenithShield.exe</strong> and confirm setup. Use <strong>Check setup</strong> after loading the Chrome extension.</li>
      </ol>
      <div id="android-shield" className="scroll-mt-24 rounded-lg border border-white/10 p-4">
        <h3 className="font-medium">Android app protection</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">Requires Android 11 or later. Install the preview APK, then open a protected focus room in Android Chrome and select <strong>Protect Android apps</strong>. The companion guides you through Accessibility permission and activates on your confirmation.</p>
        <a href="/zenith-shield-android-preview.apk" download className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-200 underline underline-offset-4">
          <Download aria-hidden="true" size={16} /> Download Android preview APK
        </a>
      </div>
      {feedback && <p role="status" className="rounded-lg bg-zinc-950/70 px-3 py-2 text-sm leading-relaxed text-zinc-100">{feedback}</p>}
    </section>
  );
}
