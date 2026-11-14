'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

type MacSetup = 'ready' | 'permission_required' | 'setup_needed' | 'not_mac';
type SetupResult = { version: string; desktop: MacSetup; webActive: boolean };

const desktopMessages: Record<MacSetup, string> = {
  ready: 'Mac helper is installed. Test a blocked app during a focus session.',
  permission_required: 'Mac helper is installed. Approve System Events in macOS Privacy & Security, then check again.',
  setup_needed: 'Mac helper could not connect. Run the installer in Finder and check again.',
  not_mac: 'Desktop app protection is available on macOS.',
};

export function ShieldSetup() {
  const [feedback, setFeedback] = useState('');
  const [checking, setChecking] = useState(false);
  const request = useRef<{ id: string; timeout: number } | null>(null);

  useEffect(() => {
    const onStatus = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin || !request.current) return;
      if (event.data?.type !== 'ZENITH_SETUP_STATUS' || event.data.requestId !== request.current.id) return;
      const result = event.data.result as SetupResult | undefined;
      if (!result || typeof result.version !== 'string' || !Object.hasOwn(desktopMessages, result.desktop)) return;
      window.clearTimeout(request.current.timeout);
      request.current = null;
      setChecking(false);
      setFeedback(`Chrome extension ${result.version} connected. Website protection is ${result.webActive ? 'active' : 'on standby'}. ${desktopMessages[result.desktop]}`);
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
      setFeedback('No reply from Shield. Update the Chrome extension to 10.5.0, then reload this Zenith tab.');
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
        <a href="/zenith-extension.zip" download className="text-sm text-emerald-200 underline underline-offset-4">Download Chrome extension only</a>
        <button type="button" onClick={checkSetup} disabled={checking} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50">Check setup</button>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">
        <li><strong>Chrome.</strong> Extract the ZIP. In <code>chrome://extensions</code>, enable Developer mode and use <strong>Load unpacked</strong> to select the extracted folder itself. It contains <code>manifest.json</code>. When upgrading, remove the old Zenith Shield entry first, then reload the Zenith tab.</li>
        <li><strong>Mac desktop apps.</strong> In Finder, open <strong>Mac App Setup</strong> and double-click <strong>Install Zenith Mac Shield.command</strong>. It uses Node.js. Use <strong>Check setup</strong> and approve any macOS permission prompt.</li>
      </ol>
      {feedback && <p role="status" className="rounded-lg bg-zinc-950/70 px-3 py-2 text-sm leading-relaxed text-zinc-100">{feedback}</p>}
    </section>
  );
}
