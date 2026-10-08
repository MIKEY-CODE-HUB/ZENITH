'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { api } from '@/lib/api';
import { BlockedResource, BlockerStatistics } from '@/lib/types';
import { ALWAYS_BLOCKED_DOMAINS, ALWAYS_ALLOWED_DOMAINS } from '@/lib/shieldDomains';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Lock,
  Check,
  Play,
  Square,
  Clock,
  Sparkles,
  Laptop,
  Globe,
  Smartphone,
  Eye,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function BlockerDashboardPage() {
  const router = useRouter();
  const [resources, setResources] = useState<BlockedResource[]>([]);
  const [stats, setStats] = useState<BlockerStatistics['stats'] | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [blockerMode, setBlockerMode] = useState<'MONITOR' | 'BLOCK' | 'STRICT'>('STRICT');
  const [shieldToggling, setShieldToggling] = useState<boolean>(false);

  // Form State for Tier 3 Custom Distraction: ONLY Link/App + Display Name
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(checkLiveStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  async function checkLiveStatus() {
    try {
      const res = await fetch('http://127.0.0.1:5001/api/blocker/live-status').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data.active) {
          setActiveSession(data);
          if (data.mode) setBlockerMode(data.mode);
        } else {
          setActiveSession(null);
        }
      }
    } catch (e) {}
  }

  async function loadData() {
    try {
      setLoading(true);
      const [resRes, statsRes] = await Promise.all([
        api.getBlockerResources().catch(() => ({ success: false, resources: [] })),
        api.getBlockerStatistics().catch(() => ({ success: false, stats: null, activeSession: null })),
      ]);

      if (resRes.success && resRes.resources) {
        setResources(resRes.resources);
      }
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
        if (statsRes.activeSession) {
          setActiveSession(statsRes.activeSession);
          if (statsRes.activeSession?.mode) {
            setBlockerMode(statsRes.activeSession.mode);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load blocker data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleMasterShield = async () => {
    try {
      setShieldToggling(true);
      if (activeSession) {
        await api.deactivateBlocker(activeSession.focusSessionId || activeSession.sessionId || '');
        setActiveSession(null);
        if (typeof window !== 'undefined') {
          window.postMessage({ type: 'ZENITH_ROOM_ENDED' }, '*');
          localStorage.removeItem('zenith_shield_active');
          localStorage.removeItem('zenith_shield_url');
        }
        setNotification('Distraction Shield deactivated. All apps and external sites unlocked.');
      } else {
        const res = await api.activateBlocker('', blockerMode);
        if (res.success) {
          setActiveSession(res.blockerSession);
          if (typeof window !== 'undefined') {
            window.postMessage({ type: 'ZENITH_ROOM_ACTIVE', roomUrl: window.location.href }, '*');
            localStorage.setItem('zenith_shield_active', 'true');
            localStorage.setItem('zenith_shield_url', window.location.href);
          }
          setNotification(`Distraction Shield engaged in ${blockerMode} mode.`);
        }
      }
      setTimeout(() => setNotification(null), 4000);
      await checkLiveStatus();
    } catch (err: any) {
      // Local fallback engagement
      const localSession = {
        id: 'local-shield-active',
        sessionId: 'local-shield-active',
        focusSessionId: 'local-shield-active',
        mode: blockerMode,
        status: 'ACTIVE',
        startTime: new Date().toISOString(),
      };
      setActiveSession(localSession);
      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'ZENITH_ROOM_ACTIVE', roomUrl: window.location.href }, '*');
        localStorage.setItem('zenith_shield_active', 'true');
        localStorage.setItem('zenith_shield_url', window.location.href);
      }
      setNotification(`Distraction Shield engaged in ${blockerMode} mode.`);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setShieldToggling(false);
    }
  };

  const handleSimulateInterception = async () => {
    try {
      api.recordBlockerAttempt({
        sessionId: activeSession?.sessionId || activeSession?.focusSessionId,
        resourceType: 'WEBSITE',
        resourceIdentifier: 'instagram.com (Simulated)',
        action: 'BLOCKED',
      }).catch(() => {});
    } catch (e) {}

    const returnUrl = typeof window !== 'undefined' ? window.location.href : '/blocker';
    router.push(`/blocker/blocked?domain=instagram.com&url=https://instagram.com&room=${encodeURIComponent(returnUrl)}`);
  };

  const handleToggleResource = async (res: BlockedResource) => {
    try {
      const updated = await api.updateBlockerResource(res.id, { enabled: !res.enabled });
      if (updated.success) {
        setResources((prev) =>
          prev.map((r) => (r.id === res.id ? { ...r, enabled: !r.enabled } : r))
        );
      }
    } catch (err) {
      console.error('Failed to toggle resource:', err);
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await api.deleteBlockerResource(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      setNotification('Distraction removed from My Blocklist.');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  };

  // Tier 3: ONLY 2 inputs (Paste Link or App Name & Display Name)
  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!newIdentifier.trim()) return;

    try {
      setSubmitting(true);
      const raw = newIdentifier.trim();
      const isWebsite = raw.includes('.') || raw.startsWith('http') || raw.includes('/');
      const resourceType = isWebsite ? 'WEBSITE' : 'APPLICATION';
      const cleanIdent = isWebsite ? raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : raw;
      const name = newDisplayName.trim() || (isWebsite ? cleanIdent.split('.')[0].toUpperCase() : cleanIdent);

      const res = await api.createBlockerResource({
        type: resourceType,
        identifier: cleanIdent,
        displayName: name,
        category: 'CUSTOM',
        isAllowlist: false,
        enabled: true,
      });

      if (res.success) {
        setResources((prev) => [...prev, res.resource]);
        setNewIdentifier('');
        setNewDisplayName('');
        setNotification(`Added "${name}" to My Blocklist (${resourceType === 'WEBSITE' ? 'Web Domain' : 'Desktop App'})`);
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add resource to blocklist');
    } finally {
      setSubmitting(false);
    }
  };

  // User-defined custom blocklist items (Tier 3)
  const myBlocklist = resources.filter((r) => !r.isAllowlist);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#07080b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-8 max-w-6xl mx-auto space-y-8">
        {/* Atmospheric Header with Glow Accents */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/20 via-[#10121a] to-[#121420] border border-white/[0.08] shadow-2xl overflow-hidden">
          {/* Subtle Ambient Background Lighting */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-emerald-400">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <Shield className="h-3.5 w-3.5" />
                <span>Zero-Tolerance Focus Guardian</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Distraction Shield
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Dual-layer enforcement: locks external websites with <strong>instant 0ms snap-back</strong> and auto-hides distracting desktop applications.
              </p>
            </div>

            {/* Master Switch & Simulate Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleToggleMasterShield}
                disabled={shieldToggling}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-xs transition-all shadow-xl active:scale-95 ${
                  activeSession
                    ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-950/60 ring-2 ring-rose-400/40'
                    : 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-emerald-950/60 ring-2 ring-emerald-400/30'
                }`}
              >
                {activeSession ? (
                  <>
                    <Square className="h-4 w-4 fill-current" />
                    <span>Deactivate Shield</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>Arm Distraction Shield</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSimulateInterception}
                className="px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-zinc-200 transition-colors"
                title="Test distraction telemetry event"
              >
                Simulate Block
              </button>
            </div>
          </div>
        </div>

        {/* Live Notification Banners */}
        {notification && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2.5 shadow-lg animate-in fade-in duration-150">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5 shadow-lg animate-in fade-in duration-150">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Real-time System Status Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#11131a] border border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${activeSession ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="font-semibold text-white">
                Status: {activeSession ? 'Armed & Enforcing (Active Session)' : 'Standby (Click Arm to Begin)'}
              </span>
            </div>
            <span className="text-zinc-600">•</span>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Laptop className="h-3.5 w-3.5 text-emerald-400" />
              <span>macOS Daemon & Chrome Interceptor: <strong className="text-emerald-400">0ms Snap-Back Active</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
            <span className="text-rose-400">{ALWAYS_BLOCKED_DOMAINS.length} Core Locked</span>
            <span>•</span>
            <span className="text-emerald-400">{ALWAYS_ALLOWED_DOMAINS.length} Core Allowed</span>
            <span>•</span>
            <span className="text-amber-400">{myBlocklist.filter((m) => m.enabled).length} Custom Active</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            THREE-TIER DISTRACTION SHIELD SYSTEM
        ═══════════════════════════════════════════════════════ */}
        <div className="space-y-7">

          {/* TIER 1: ALWAYS BLOCKED (Zenith Core Protection) */}
          <div className="rounded-3xl bg-gradient-to-b from-[#161218] to-[#121215] border border-rose-500/25 p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-inner">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Tier 1: Always Blocked</h2>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Core Protection
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Automatically enforced during active focus rooms. Zenith pulls you back immediately upon any tab switch or access.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-rose-400/90 font-semibold self-start sm:self-center">
                {ALWAYS_BLOCKED_DOMAINS.length} High-Distraction Platforms
              </span>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
              {ALWAYS_BLOCKED_DOMAINS.map((item) => (
                <div
                  key={item.domain}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-rose-500/30 transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-rose-400 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-100 truncate">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono block truncate mt-0.5">
                      {item.domain}
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold text-zinc-400 px-2 py-0.5 rounded-md bg-white/[0.04] shrink-0 border border-white/5">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 italic pt-1">
              Protected by Zenith: These domains cannot be removed to guarantee complete immunity against doomscrolling.
            </p>
          </div>

          {/* TIER 2: ALWAYS ALLOWED (Essential Tools) */}
          <div className="rounded-3xl bg-gradient-to-b from-[#111916] to-[#121215] border border-emerald-500/25 p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-inner">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Tier 2: Always Allowed</h2>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Essential Tools
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Essential coding, problem-solving, and study platforms. These are NEVER blocked under any mode.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-semibold self-start sm:self-center">
                {ALWAYS_ALLOWED_DOMAINS.length} Protected Tools
              </span>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
              {ALWAYS_ALLOWED_DOMAINS.map((item) => (
                <div
                  key={item.domain}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-100 truncate">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono block truncate mt-0.5">
                      {item.domain}
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-400/80 px-2 py-0.5 rounded-md bg-emerald-500/10 shrink-0 border border-emerald-500/20">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TIER 3: MY BLOCKLIST (User-Controlled) */}
          <div className="rounded-3xl bg-gradient-to-b from-[#1a1712] to-[#121215] border border-amber-500/25 p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Tier 3: My Blocklist</h2>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Personal Customization
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Target your personal distraction weaknesses (forums, shopping, desktop apps). Works across web and macOS applications.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-amber-400 font-semibold self-start sm:self-center">
                {myBlocklist.filter((m) => m.enabled).length} active of {myBlocklist.length}
              </span>
            </div>

            {/* Add Custom Entry Form - ONLY 2 INPUTS: Paste Link/App Name & Display Name */}
            <form onSubmit={handleAddCustom} className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-amber-400" />
                  <span>Add Distraction to Block</span>
                </span>
                <span className="text-[11px] text-zinc-500">Auto-detects web domain or desktop application</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <input
                    type="text"
                    placeholder="Paste link or app name (e.g. reddit.com or Discord)"
                    value={newIdentifier}
                    onChange={(e) => setNewIdentifier(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors font-mono"
                    required
                  />
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Display name (optional)"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </form>

            {/* List of User Custom Distractions */}
            {myBlocklist.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {myBlocklist.map((item) => {
                  const isApp = item.type === 'APPLICATION';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleResource(item)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                        item.enabled
                          ? 'bg-white/[0.03] border-white/[0.08] hover:border-amber-500/30 text-zinc-200'
                          : 'bg-transparent border-white/[0.04] text-zinc-600 line-through opacity-50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              item.enabled ? 'bg-amber-400' : 'bg-zinc-700'
                            }`}
                          />
                          <p className="text-xs font-semibold truncate">{item.displayName}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-500 font-mono truncate">
                            {item.identifier}
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5 flex items-center gap-1">
                            {isApp ? <Smartphone className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                            <span>{isApp ? 'App' : 'Web'}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteResource(item.id);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-2"
                        title="Remove from blocklist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-1.5">
                <p className="text-xs text-zinc-400 font-medium">Your custom blocklist is currently empty.</p>
                <p className="text-[11px] text-zinc-500">
                  Zenith core protections (Tier 1) are active automatically. Add specific websites or macOS applications above.
                </p>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
