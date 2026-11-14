'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useAmbient } from '@/contexts/AmbientContext';
import { loadSceneryMedia, parseSceneryUrl, sceneryLinkError } from '@/lib/sceneryMedia';
import { Sidebar } from '@/components/Sidebar';
import { Settings, Shield, Bell, Camera, Clock, Check,  Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { resetBrowserScenery } = useAmbient();

  const [idleThreshold, setIdleThreshold] = useState(60);
  const [warningThreshold, setWarningThreshold] = useState(10);
  const [autoStart, setAutoStart] = useState(false);
  const [cameraVisibility, setCameraVisibility] = useState('Participants');
  const [distractionAlerts, setDistractionAlerts] = useState(true);
  const [appearanceMode, setAppearanceMode] = useState('dark');
  const [customThemeUrl, setCustomThemeUrl] = useState('');
  const [customThemeTarget, setCustomThemeTarget] = useState('BOTH');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  async function downloadData() {
    setExporting(true);
    setExportError('');
    try {
      const { data } = await api.exportAccountData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const download = document.createElement('a');
      download.href = url;
      download.download = 'zenith-account-data.json';
      download.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not export your data.');
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (user?.settings) {
      setIdleThreshold(user.settings.idleThresholdSeconds || 60);
      setWarningThreshold(user.settings.warningThresholdSeconds || 10);
      setAutoStart(user.settings.autoStartTimer || false);
      setCameraVisibility(user.settings.cameraVisibility || 'Participants');
      setDistractionAlerts(user.settings.distractionAlerts !== false);
      setAppearanceMode(user.settings.appearanceMode || 'dark');
      setCustomThemeUrl(user.settings.customThemeUrl || '');
      setCustomThemeTarget(user.settings.customThemeTarget === 'ROOM' ? 'ROOMS' : user.settings.customThemeTarget || 'BOTH');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveError(null);
      const rawUrl = customThemeUrl.trim();
      const media = rawUrl ? parseSceneryUrl(rawUrl) : null;
      if (rawUrl && !media) throw new Error(sceneryLinkError(rawUrl));
      const wallpaperChanged = (media?.url || '') !== (user?.settings?.customThemeUrl || '') ||
        customThemeTarget !== (user?.settings?.customThemeTarget === 'ROOM' ? 'ROOMS' : user?.settings?.customThemeTarget || 'BOTH');
      if (media && wallpaperChanged) await loadSceneryMedia(media.url, media.kind);
      await api.updateSettings({
        idleThresholdSeconds: idleThreshold,
        warningThresholdSeconds: warningThreshold,
        autoStartTimer: autoStart,
        cameraVisibility,
        distractionAlerts,
        appearanceMode,
        customThemeUrl: media?.url || null,
        customThemeTarget,
      });
      if (wallpaperChanged && media) {
        if (customThemeTarget !== 'ROOMS') resetBrowserScenery('dashboard');
        if (customThemeTarget !== 'DASHBOARD') resetBrowserScenery('rooms');
      }
      await refreshUser();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[rgb(var(--page))] text-[rgb(var(--ink))]">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-8 max-w-3xl mx-auto space-y-6">
        <div className="border-b border-[rgb(var(--tint))]/[0.06] pb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-[rgb(var(--ink-muted))] mb-1">
            <Settings className="h-3.5 w-3.5 text-[rgb(var(--ink-muted))]" />
            <span>Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[rgb(var(--ink))] tracking-tight">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-[rgb(var(--ink-muted))] mt-1">
            Configure telemetry thresholds, background enforcement, and camera privacy.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <a href="/blocker#install-shield" className="flex items-center gap-3 rounded-xl border border-[rgb(var(--tint))]/10 bg-[rgb(var(--panel))] p-5 text-sm text-[rgb(var(--ink))]">
          <Shield className="h-4 w-4" />
          Set up Distraction Shield and manage blocked sites and apps
        </a>

        <form onSubmit={handleSave} className="space-y-6">
          {saveError && <p role="alert" className="text-sm text-rose-500">{saveError}</p>}
          {/* Focus Telemetry Section */}
          <div className="rounded-xl bg-[rgb(var(--panel))] border border-[rgb(var(--tint))]/[0.07] p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-[rgb(var(--tint))]/[0.06] pb-3">
              <Clock className="h-4 w-4 text-[rgb(var(--ink-muted))]" />
              <h3 className="text-xs font-semibold text-[rgb(var(--ink))]">Detection Thresholds</h3>
            </div>

            {/* Idle Threshold Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <label className="text-[rgb(var(--ink-secondary))]">Inactivity Idle Limit</label>
                <span className="text-[rgb(var(--ink))] font-mono">{idleThreshold}s</span>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                step="15"
                value={idleThreshold}
                onChange={(e) => setIdleThreshold(parseInt(e.target.value, 10))}
                className="w-full accent-[rgb(var(--action))]"
              />
              <p className="text-[11px] text-[rgb(var(--ink-muted))]">
                Duration without mouse or keyboard input before session transitions to idle status.
              </p>
            </div>

            <label className="block space-y-1 text-xs text-[rgb(var(--ink-secondary))]">
              <span className="block font-medium">Time away before a warning · {warningThreshold}s</span>
              <input type="range" min="5" max="60" step="5" value={warningThreshold}
                onChange={(event) => setWarningThreshold(Number(event.target.value))} className="w-full accent-[rgb(var(--action))]" />
            </label>

            {/* Distraction Alert Toggle */}
            <label className="flex items-center justify-between gap-3 rounded-lg border border-[rgb(var(--tint))]/[0.05] bg-[rgb(var(--tint))]/[0.02] p-3">
              <span>
                <span className="block text-xs font-medium text-[rgb(var(--ink-secondary))]">Distraction warnings</span>
                <span className="block text-[11px] text-[rgb(var(--ink-muted))]">Show a warning after a block attempt or prolonged time away.</span>
              </span>
              <input
                type="checkbox"
                checked={distractionAlerts}
                onChange={(e) => setDistractionAlerts(e.target.checked)}
                className="accent-[rgb(var(--action))] h-4 w-4 rounded"
              />
            </label>
          </div>

          {/* Privacy & Camera Defaults */}
          <div className="rounded-xl bg-[rgb(var(--panel))] border border-[rgb(var(--tint))]/[0.07] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[rgb(var(--tint))]/[0.06] pb-3">
              <Shield className="h-4 w-4 text-[rgb(var(--ink-muted))]" />
              <h3 className="text-xs font-semibold text-[rgb(var(--ink))]">Camera Privacy</h3>
            </div>

            <div>
              <label className="text-xs font-medium text-[rgb(var(--ink-secondary))] block mb-2">Video Visibility Default</label>
              <div className="grid grid-cols-3 gap-2">
                {['Participants', 'Everyone', 'None'].map((vis) => (
                  <button
                    key={vis}
                    type="button"
                    onClick={() => setCameraVisibility(vis)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      cameraVisibility === vis
                        ? 'bg-[rgb(var(--action))] text-[rgb(var(--action-ink))] shadow-sm'
                        : 'bg-[rgb(var(--tint))]/[0.02] text-[rgb(var(--ink-muted))] border border-[rgb(var(--tint))]/[0.06] hover:text-[rgb(var(--ink-secondary))]'
                    }`}
                  >
                    {vis}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Theme & Atmosphere Section */}
          <div className="rounded-xl bg-[rgb(var(--panel))] border border-[rgb(var(--tint))]/[0.07] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[rgb(var(--tint))]/[0.06] pb-3">
              <Sparkles className="h-4 w-4 text-[rgb(var(--ink-muted))]" />
              <h3 className="text-xs font-semibold text-[rgb(var(--ink))]">Theme & Atmosphere</h3>
            </div>

            <div>
              <label className="text-xs font-medium text-[rgb(var(--ink-secondary))] block mb-2">Appearance Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dark', label: 'Dark Mode (OLED Focus)' },
                  { id: 'light', label: 'Light Mode (High Contrast)' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={appearanceMode === mode.id}
                    onClick={() => setAppearanceMode(mode.id)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      appearanceMode === mode.id
                        ? 'bg-[rgb(var(--action))] text-[rgb(var(--action-ink))] shadow-sm font-semibold'
                        : 'bg-[rgb(var(--tint))]/[0.02] text-[rgb(var(--ink-muted))] border border-[rgb(var(--tint))]/[0.06] hover:text-[rgb(var(--ink-secondary))]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="wallpaper-url" className="text-xs font-medium text-[rgb(var(--ink-secondary))] block">Custom background link</label>
              <input
                id="wallpaper-url"
                type="url"
                placeholder="https://example.com/wallpaper.jpg"
                value={customThemeUrl}
                onChange={(e) => setCustomThemeUrl(e.target.value)}
                className="w-full rounded-lg bg-[rgb(var(--tint))]/[0.03] border border-[rgb(var(--tint))]/[0.08] px-3 py-2 text-xs text-[rgb(var(--ink))] placeholder-[rgb(var(--ink-muted))] focus:outline-none focus:border-[rgb(var(--tint))]/20"
              />
              <p className="text-[11px] text-[rgb(var(--ink-muted))]">
                Use a public HTTPS image or MP4/WebM file. Clear the field and save to remove your account wallpaper.
              </p>
              <label className="flex items-center gap-2 text-xs">
                Apply to
                <select value={customThemeTarget} onChange={event => setCustomThemeTarget(event.target.value)}
                  className="rounded-lg border border-[rgb(var(--tint))]/20 bg-[rgb(var(--panel))] px-2 py-1.5">
                  <option value="BOTH">Home and rooms</option>
                  <option value="DASHBOARD">Home</option>
                  <option value="ROOMS">Join Rooms and focus rooms</option>
                </select>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[rgb(var(--action))] py-2.5 text-xs font-semibold text-[rgb(var(--action-ink))] hover:bg-[rgb(var(--action-hover))] transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
        {user && (
          <section className="space-y-3 rounded-xl border border-[rgb(var(--tint))]/10 bg-[rgb(var(--panel))] p-5">
            <h2 className="text-sm font-semibold">Your data</h2>
            <p className="text-sm text-[rgb(var(--ink-muted))]">Download your sessions, focus events, points, and preferences as JSON.</p>
            <button type="button" disabled={exporting} className="rounded-lg border border-[rgb(var(--tint))]/20 px-3 py-2 text-sm" onClick={() => void downloadData()}>
              {exporting ? 'Preparing download…' : 'Export account data'}
            </button>
            {exportError && <p role="alert" className="text-sm">{exportError}</p>}
          </section>
        )}
      </main>
    </div>
  );
}
