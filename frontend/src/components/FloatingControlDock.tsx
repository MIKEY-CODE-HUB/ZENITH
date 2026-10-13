'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Music,
  Clock,
  Star,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  LogOut,
  Sparkles,
  Flame,
  Check,
  X,
  Sliders,
} from 'lucide-react';
import { ATMOSPHERES, AtmosphereTheme } from '@/lib/atmospheres';
import { formatSeconds, formatMinutesHuman } from '@/lib/utils';

interface FloatingControlDockProps {
  currentAtmosphere: AtmosphereTheme;
  onSelectAtmosphere: (atm: AtmosphereTheme) => void;
  isCameraOn: boolean;
  isMicOn: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
  isInteractionRoom: boolean;
  remainingSeconds: number;
  plannedMinutes: number;
  focusedSeconds: number;
  distractedSeconds: number;
  focusScore: number;
  estimatedPoints: number;
  onEndSession: () => void;
  streakDays?: number;
  weeklyPoints?: number;
}

export function FloatingControlDock({
  currentAtmosphere,
  onSelectAtmosphere,
  isCameraOn,
  isMicOn,
  toggleCamera,
  toggleMic,
  isInteractionRoom,
  remainingSeconds,
  plannedMinutes,
  focusedSeconds,
  distractedSeconds,
  focusScore,
  estimatedPoints,
  onEndSession,
  streakDays = 5,
  weeklyPoints = 240,
}: FloatingControlDockProps) {
  // Active panel: 'theme' | 'music' | 'time' | 'xp' | 'camera' | null
  const [activePanel, setActivePanel] = useState<'theme' | 'music' | 'time' | 'xp' | 'camera' | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  // Soundscape state for Music Panel
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(true);
  const [rainVolume, setRainVolume] = useState<number>(65);
  const [lofiVolume, setLofiVolume] = useState<number>(40);
  const [noiseVolume, setNoiseVolume] = useState<number>(20);

  // Close panel on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setActivePanel(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePanel = (panel: 'theme' | 'music' | 'time' | 'xp' | 'camera') => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div ref={dockRef} className="absolute bottom-4 inset-x-0 z-40 flex flex-col items-center pointer-events-none">
      {/* ── COMPACT FLOATING POPOVERS ── */}
      {activePanel && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl bg-black/85 backdrop-blur-2xl border border-white/20 p-4 shadow-2xl text-zinc-100 pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
              {activePanel === 'theme' && 'Atmospheric Theme'}
              {activePanel === 'music' && 'In-Room Audio & Soundscape'}
              {activePanel === 'time' && 'Focus Session Timer'}
              {activePanel === 'xp' && 'Focus Telemetry & XP'}
              {activePanel === 'camera' && 'Media & Device Controls'}
            </span>
            <button
              onClick={() => setActivePanel(null)}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 1. Theme Panel */}
          {activePanel === 'theme' && (
            <div className="space-y-3">
              <p className="text-[11px] text-zinc-400">Select an immersive atmosphere for your study canvas.</p>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
                {ATMOSPHERES.slice(0, 8).map((atm) => {
                  const isSelected = atm.id === currentAtmosphere.id;
                  return (
                    <button
                      key={atm.id}
                      onClick={() => onSelectAtmosphere(atm)}
                      className={`flex flex-col text-left p-2 rounded-xl border transition-all text-xs group relative overflow-hidden ${
                        isSelected
                          ? 'border-sky-400 bg-sky-500/15 text-white ring-1 ring-sky-400/50'
                          : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span className="truncate">{atm.name}</span>
                        {isSelected && <Check className="h-3 w-3 text-sky-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-zinc-400 truncate mt-0.5">{atm.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Music Panel */}
          {activePanel === 'music' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-white">Live In-Room Audio</span>
                </div>
                <button
                  onClick={() => setIsPlayingMusic(!isPlayingMusic)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors"
                >
                  {isPlayingMusic ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  <span>{isPlayingMusic ? 'Mute' : 'Resume'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Rain Ambience</span>
                    <span>{rainVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={rainVolume}
                    onChange={(e) => setRainVolume(Number(e.target.value))}
                    className="w-full accent-sky-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Lo-Fi Beats</span>
                    <span>{lofiVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lofiVolume}
                    onChange={(e) => setLofiVolume(Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>White / Brown Noise</span>
                    <span>{noiseVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={noiseVolume}
                    onChange={(e) => setNoiseVolume(Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Focus Time Panel */}
          {activePanel === 'time' && (
            <div className="space-y-3 text-xs">
              <div className="text-center py-2 bg-white/[0.03] rounded-xl border border-white/10">
                <div className="text-3xl font-mono font-light text-white tracking-wider">
                  {formatSeconds(remainingSeconds)}
                </div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1 block">
                  Planned: {plannedMinutes} Minutes
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span className="block text-[10px] text-zinc-400 uppercase">Focused</span>
                  <span className="font-bold text-sm font-mono">{formatMinutesHuman(Math.round(focusedSeconds / 60))}</span>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <span className="block text-[10px] text-zinc-400 uppercase">Distracted</span>
                  <span className="font-bold text-sm font-mono">{formatMinutesHuman(Math.round(distractedSeconds / 60))}</span>
                </div>
              </div>

              <button
                onClick={onEndSession}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-all font-semibold text-xs mt-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Complete & Exit Session</span>
              </button>
            </div>
          )}

          {/* 4. XP Panel */}
          {activePanel === 'xp' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-lg font-mono">
                    <Star className="h-4 w-4 fill-amber-400" />
                    <span>+{estimatedPoints}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 uppercase">Session Points</span>
                </div>

                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <div className="text-sky-400 font-bold text-lg font-mono">{focusScore}%</div>
                  <span className="text-[10px] text-zinc-400 uppercase">Focus Score</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px]">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400 fill-orange-400" />
                  <span>Streak: <strong>{streakDays} Days</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Weekly: <strong>{weeklyPoints} ⭐</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Camera & Device Panel */}
          {activePanel === 'camera' && (
            <div className="space-y-3 text-xs">
              <div className="space-y-2">
                {/* Camera Switch */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-sky-400" />
                    <span>Video Camera</span>
                  </div>
                  <button
                    onClick={toggleCamera}
                    className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors ${
                      isCameraOn
                        ? 'bg-sky-500 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {isCameraOn ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* Mic Switch */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-emerald-400" />
                    <span>Microphone</span>
                  </div>
                  {isInteractionRoom ? (
                    <button
                      onClick={toggleMic}
                      className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors ${
                        isMicOn
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {isMicOn ? 'Unmuted' : 'Muted'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">Silent Study Room</span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                Device access is locally managed and secured. Your media feeds remain active in your selected room.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 5-BUTTON FLOATING PILL DOCK (320–420px Desktop Target) ── */}
      <nav
        aria-label="Focus Room Controls"
        className="pointer-events-auto w-[340px] sm:w-[380px] h-14 rounded-full bg-black/80 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.7)] px-3 flex items-center justify-between"
      >
        {/* 1. Theme */}
        <button
          onClick={() => togglePanel('theme')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-medium ${
            activePanel === 'theme'
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-zinc-300 hover:text-white hover:bg-white/10'
          }`}
          title="Theme"
        >
          <Palette className="h-4 w-4 text-sky-400" />
          <span className="hidden sm:inline">Theme</span>
        </button>

        {/* 2. Music */}
        <button
          onClick={() => togglePanel('music')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-medium ${
            activePanel === 'music'
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-zinc-300 hover:text-white hover:bg-white/10'
          }`}
          title="Music"
        >
          <Music className="h-4 w-4 text-indigo-400" />
          <span className="hidden sm:inline">Music</span>
        </button>

        {/* 3. Focus Time */}
        <button
          onClick={() => togglePanel('time')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-medium ${
            activePanel === 'time'
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-zinc-300 hover:text-white hover:bg-white/10'
          }`}
          title="Focus Time"
        >
          <Clock className="h-4 w-4 text-emerald-400" />
          <span className="hidden sm:inline">Time</span>
        </button>

        {/* 4. XP */}
        <button
          onClick={() => togglePanel('xp')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-medium ${
            activePanel === 'xp'
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-zinc-300 hover:text-white hover:bg-white/10'
          }`}
          title="XP"
        >
          <Star className="h-4 w-4 text-amber-400 fill-amber-400/50" />
          <span className="hidden sm:inline">XP</span>
        </button>

        {/* 5. Camera */}
        <button
          onClick={() => togglePanel('camera')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-medium ${
            activePanel === 'camera'
              ? 'bg-white/20 text-white shadow-sm'
              : isCameraOn
              ? 'text-sky-400 hover:bg-sky-500/10'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Camera"
        >
          {isCameraOn ? <Camera className="h-4 w-4 text-sky-400" /> : <CameraOff className="h-4 w-4 text-zinc-400" />}
          <span className="hidden sm:inline">Camera</span>
        </button>
      </nav>
    </div>
  );
}
