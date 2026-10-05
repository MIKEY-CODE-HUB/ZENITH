'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Settings, Shield, Bell, Camera, Clock, Check, Snowflake, Download, ExternalLink, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [idleThreshold, setIdleThreshold] = useState(60);
  const [warningThreshold, setWarningThreshold] = useState(10);
  const [autoStart, setAutoStart] = useState(false);
  const [cameraVisibility, setCameraVisibility] = useState('Participants');
  const [distractionAlerts, setDistractionAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (user?.settings) {
      setIdleThreshold(user.settings.idleThresholdSeconds || 60);
      setWarningThreshold(user.settings.warningThresholdSeconds || 10);
      setAutoStart(user.settings.autoStartTimer || false);
      setCameraVisibility(user.settings.cameraVisibility || 'Participants');
      setDistractionAlerts(user.settings.distractionAlerts !== false);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings({
        idleThresholdSeconds: idleThreshold,
        warningThresholdSeconds: warningThreshold,
        autoStartTimer: autoStart,
        cameraVisibility,
        distractionAlerts,
      });
      await refreshUser();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100">
      <Sidebar />

      <main className="flex-1 p-5 sm:p-8 max-w-3xl mx-auto space-y-6">
        <div className="border-b border-white/[0.06] pb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
            <Settings className="h-3.5 w-3.5 text-zinc-400" />
            <span>Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Configure telemetry thresholds, background enforcement, and camera privacy.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        {/* 1. COMPANION EXTENSION CARD */}
        <div className="rounded-xl bg-[#121215] border border-white/[0.08] p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                <Snowflake className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>Companion Browser Extension</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ready
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Enforces instant tab snap-backs and background redirect interception.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-2 text-xs text-zinc-300">
            <p className="font-medium text-zinc-200">
              Installation (Unpacked Extension):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px] leading-relaxed">
              <li>Open <code className="text-zinc-200 font-mono">chrome://extensions</code> in your browser.</li>
              <li>Enable <strong>Developer mode</strong> in the top-right corner.</li>
              <li>Click <strong>Load unpacked</strong>.</li>
              <li>Select: <code className="text-zinc-300 font-mono">/Users/mikey/Desktop/ZENITH/zenith-extension</code></li>
            </ol>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Focus Telemetry Section */}
          <div className="rounded-xl bg-[#121215] border border-white/[0.07] p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <Clock className="h-4 w-4 text-zinc-400" />
              <h3 className="text-xs font-semibold text-white">Detection Thresholds</h3>
            </div>

            {/* Idle Threshold Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <label className="text-zinc-300">Inactivity Idle Limit</label>
                <span className="text-white font-mono">{idleThreshold}s</span>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                step="15"
                value={idleThreshold}
                onChange={(e) => setIdleThreshold(parseInt(e.target.value, 10))}
                className="w-full accent-white"
              />
              <p className="text-[11px] text-zinc-500">
                Duration without mouse or keyboard input before session transitions to idle status.
              </p>
            </div>

            {/* Distraction Alert Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div>
                <p className="text-xs font-medium text-zinc-200">Active Distraction Interception</p>
                <p className="text-[11px] text-zinc-500">Lock off-task tabs and display refocus alert</p>
              </div>
              <input
                type="checkbox"
                checked={distractionAlerts}
                onChange={(e) => setDistractionAlerts(e.target.checked)}
                className="accent-white h-4 w-4 rounded"
              />
            </div>
          </div>

          {/* Privacy & Camera Defaults */}
          <div className="rounded-xl bg-[#121215] border border-white/[0.07] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <Shield className="h-4 w-4 text-zinc-400" />
              <h3 className="text-xs font-semibold text-white">Camera Privacy</h3>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-2">Video Visibility Default</label>
              <div className="grid grid-cols-3 gap-2">
                {['Participants', 'Everyone', 'None'].map((vis) => (
                  <button
                    key={vis}
                    type="button"
                    onClick={() => setCameraVisibility(vis)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      cameraVisibility === vis
                        ? 'bg-white text-zinc-950 shadow-sm'
                        : 'bg-white/[0.02] text-zinc-400 border border-white/[0.06] hover:text-zinc-200'
                    }`}
                  >
                    {vis}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </main>
    </div>
  );
}
