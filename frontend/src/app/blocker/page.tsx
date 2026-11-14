'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Download, Shield, Trash2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { api } from '@/lib/api';
import { ZenithPolicyEngine } from '@/lib/policyEngine';
import { ALWAYS_ALLOWED_APPS, ALWAYS_ALLOWED_DOMAINS, ALWAYS_BLOCKED_APPS, ALWAYS_BLOCKED_DOMAINS } from '@/lib/shieldDomains';
import type { BlockedResource } from '@/lib/types';

const field = 'rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-emerald-400';
const panel = 'rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6';

export default function BlockerDashboardPage() {
  const [resources, setResources] = useState<BlockedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<BlockedResource['type']>('WEBSITE');
  const [identifier, setIdentifier] = useState('');
  const [allow, setAllow] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let cancelled = false;
    void api.getBlockerResources().then(result => {
      if (cancelled) return;
      if (!result.success) throw new Error('Could not load Shield rules.');
      setResources(result.resources);
    }).catch(() => {
      if (!cancelled) setError('Could not load Shield rules. Sign in or reload this page to try again.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function saveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFeedback('');
    const clean = type === 'WEBSITE'
      ? ZenithPolicyEngine.normalizeDomain(identifier)
      : identifier.trim().replace(/\.app$/i, '');
    const validation = ZenithPolicyEngine.validateCustomRule(clean, type, allow);
    if (!validation.valid || clean.length > (type === 'WEBSITE' ? 253 : 100)) {
      setError(validation.error || 'The website or app name is too long.');
      return;
    }
    setSaving(true);
    try {
      const result = await api.createBlockerResource({ type, identifier: clean, displayName: clean, isAllowlist: allow });
      if (!result.success) throw new Error('Could not save the rule.');
      setResources(current => [...current.filter(rule => rule.id !== result.resource.id), result.resource]);
      setIdentifier('');
      setFeedback(`${clean} added to your ${allow ? 'allowlist' : 'blocklist'}.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save the rule.');
    } finally {
      setSaving(false);
    }
  }

  async function changeRule(rule: BlockedResource, remove = false) {
    setError('');
    setFeedback('');
    setSaving(true);
    try {
      if (remove) {
        const result = await api.deleteBlockerResource(rule.id);
        if (!result.success) throw new Error('Could not remove the rule.');
        setResources(current => current.filter(item => item.id !== rule.id));
        setFeedback(`${rule.displayName} removed.`);
      } else {
        const result = await api.updateBlockerResource(rule.id, { enabled: !rule.enabled });
        if (!result.success) throw new Error('Could not update the rule.');
        setResources(current => current.map(item => item.id === rule.id ? result.resource : item));
        setFeedback(`${rule.displayName} ${result.resource.enabled ? 'enabled' : 'disabled'}.`);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not update the rule.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100">
      <Sidebar />
      <main className="mx-auto w-full min-w-0 max-w-5xl space-y-6 p-5 sm:p-8">
        <header>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Shield aria-hidden="true" className="text-emerald-400" /> Distraction Shield</h1>
          <p className="mt-2 text-sm text-zinc-300">Shield turns on automatically in a focus session with protection enabled. It stops when you finish or the timer expires.</p>
        </header>

        <section id="install-shield" className={`${panel} scroll-mt-24 space-y-4`}>
          <h2 className="text-lg font-semibold">Install once</h2>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/zenith-mac-shield.zip" download className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-200">
              <Download aria-hidden="true" size={16} /> Download for Mac
            </a>
            <a href="/zenith-extension.zip" download className="text-sm text-emerald-200 underline underline-offset-4">Download Chrome extension only</a>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">
            <li>Unzip the download. In <code>chrome://extensions</code>, turn on <strong>Developer mode</strong> and choose <strong>Load unpacked</strong>. Select <strong>1 - Chrome Extension</strong> from the Mac download, or the folder containing <code>manifest.json</code> from the Chrome-only download.</li>
            <li>For Mac app blocking, open <strong>2 - Mac App Setup</strong> and run <strong>Install Zenith Mac Shield.command</strong> once. This uses Node.js and may prompt for macOS permissions during your first protected session.</li>
          </ol>
          <p className="text-sm text-zinc-300">Start a protected focus session to test it. If Chrome shows two copies of Zenith Shield, keep the newer one.</p>
        </section>

        <section className={`${panel} space-y-4`}>
          <div>
            <h2 className="text-lg font-semibold">My rules</h2>
            <p className="mt-1 text-sm text-zinc-300">Add a website or the name of a Mac app as it appears in Finder.</p>
          </div>
          <form onSubmit={saveRule} className="grid gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1 text-sm">Action
              <select className={field} value={allow ? 'allow' : 'block'} onChange={event => setAllow(event.target.value === 'allow')}>
                <option value="block">Block</option><option value="allow">Allow</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">Type
              <select className={field} value={type} onChange={event => setType(event.target.value === 'WEBSITE' ? 'WEBSITE' : 'APPLICATION')}>
                <option value="WEBSITE">Website</option><option value="APPLICATION">Mac app</option>
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm">{type === 'WEBSITE' ? 'Website address' : 'App name'}
              <input className={field} required value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder={type === 'WEBSITE' ? 'example.com' : 'Chess'} />
            </label>
            <button disabled={loading || saving} className="rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50">Add rule</button>
          </form>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          {feedback && <p role="status" className="text-sm text-emerald-200">{feedback}</p>}
          {loading && <p role="status" className="text-sm text-zinc-300">Loading rules…</p>}
          {!loading && !error && resources.length === 0 && <p className="text-sm text-zinc-300">You have no custom rules yet.</p>}
          {resources.length > 0 && (
            <ul className="divide-y divide-white/10">
              {resources.map(rule => (
                <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{rule.displayName}</p>
                    <p className="text-xs text-zinc-300">{rule.isAllowlist ? 'Allow' : 'Block'} · {rule.type === 'WEBSITE' ? 'Website' : 'Mac app'}</p>
                  </div>
                  {rule.userId ? (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" aria-label={`Enable ${rule.displayName}`} checked={rule.enabled} disabled={saving} onChange={() => void changeRule(rule)} /> Enabled
                      </label>
                      <button type="button" disabled={saving} className="rounded p-1 text-zinc-300 hover:text-rose-300 disabled:opacity-50" aria-label={`Remove ${rule.displayName}`} onClick={() => void changeRule(rule, true)}>
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  ) : <span className="text-xs text-zinc-300">Default rule</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <details className={panel}>
          <summary className="cursor-pointer font-semibold">Built-in rules</summary>
          <div className="mt-4 grid gap-4 text-sm leading-relaxed text-zinc-300 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold text-zinc-100">Blocked during protected sessions</h3>
              <p className="mt-2">Websites · {ALWAYS_BLOCKED_DOMAINS.map(item => item.name).join(', ')}</p>
              <p className="mt-2">Mac apps · {ALWAYS_BLOCKED_APPS.map(item => item.name).join(', ')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100">Always allowed</h3>
              <p className="mt-2">Websites · {ALWAYS_ALLOWED_DOMAINS.map(item => item.name).join(', ')}</p>
              <p className="mt-2">Mac apps · {ALWAYS_ALLOWED_APPS.map(item => item.name).join(', ')}</p>
            </div>
          </div>
        </details>
      </main>
    </div>
  );
}
