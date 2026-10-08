'use client';

import React, { useState, useEffect } from 'react';
import { useAmbient } from '@/contexts/AmbientContext';
import { api } from '@/lib/api';
import { formatSeconds } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Trash2,
  Flame,
  Clock,
  LayoutDashboard,
  Check,
} from 'lucide-react';

export function StudiousAmbientDashboard({ onSwitchToStandardView }: { onSwitchToStandardView: () => void }) {
  const router = useRouter();
  const {
    currentScenery,
    setIsSceneryModalOpen,
    setIsSoundModalOpen,
    isPlayingSound,
    toggleSound,
    activeSound,
    volume,
    isZenMode,
    toggleZenMode,
  } = useAmbient();

  // Current Live Clock State
  const [time, setTime] = useState<Date | null>(null);

  // Focus Timer Mode State (Pomodoro)
  const [timerMode, setTimerMode] = useState<'CLOCK' | 'TIMER'>('CLOCK');
  const [timerDuration, setTimerDuration] = useState<number>(50 * 60); // 50m default
  const [timerRemaining, setTimerRemaining] = useState<number>(50 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Intention / Scratchpad Tasks
  const [intention, setIntention] = useState('');
  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  // Shield Blocker Status
  const [isShieldActive, setIsShieldActive] = useState<boolean>(false);
  const [shieldLoading, setShieldLoading] = useState<boolean>(false);

  // Clock Ticker
  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer Ticker
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerRemaining > 0) {
      interval = setInterval(() => {
        setTimerRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (timerRemaining === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerRemaining]);

  // Load Saved Intention & Tasks from localStorage
  useEffect(() => {
    try {
      const savedIntention = localStorage.getItem('zenith_study_intention');
      if (savedIntention) setIntention(savedIntention);

      const savedTasks = localStorage.getItem('zenith_study_tasks');
      if (savedTasks) setTasks(JSON.parse(savedTasks));
    } catch (e) {}
  }, []);

  // Poll Blocker Status
  useEffect(() => {
    async function checkBlocker() {
      try {
        const res = await api.getBlockerStatus();
        if (res.success) {
          setIsShieldActive(res.status === 'ACTIVE');
        }
      } catch (e) {}
    }
    checkBlocker();
    const interval = setInterval(checkBlocker, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleShield = async () => {
    try {
      setShieldLoading(true);
      if (isShieldActive) {
        await api.deactivateBlocker('');
        setIsShieldActive(false);
      } else {
        await api.activateBlocker('', 'STRICT');
        setIsShieldActive(true);
      }
    } catch (e) {
      console.error('Failed to toggle shield:', e);
    } finally {
      setShieldLoading(false);
    }
  };

  const handleIntentionChange = (val: string) => {
    setIntention(val);
    try {
      localStorage.setItem('zenith_study_intention', val);
    } catch (e) {}
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const updated = [...tasks, { id: Date.now().toString(), text: newTaskText.trim(), done: false }];
    setTasks(updated);
    setNewTaskText('');
    try {
      localStorage.setItem('zenith_study_tasks', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(updated);
    try {
      localStorage.setItem('zenith_study_tasks', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    try {
      localStorage.setItem('zenith_study_tasks', JSON.stringify(updated));
    } catch (e) {}
  };

  const formatClockTime = (d: Date | null) => {
    if (!d) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatClockDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const setPresetDuration = (mins: number) => {
    setTimerDuration(mins * 60);
    setTimerRemaining(mins * 60);
    setIsTimerRunning(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden flex flex-col justify-between p-4 sm:p-8 transition-colors duration-700">
      {/* 1. ATMOSPHERIC SCENERY BACKGROUND */}
      {currentScenery.bgImageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-out"
          style={{ backgroundImage: `url(${currentScenery.bgImageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#09090b]" />
      )}

      {/* Atmospheric Vignette & Contrast Layer */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ background: currentScenery.gradientOverlay }}
      />

      {/* 2. TOP AMBIENT CONTROLS BAR */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 w-full max-w-6xl mx-auto">
        {/* Left: Scenery & Soundscape Pills */}
        <div className="flex items-center gap-2">
          {/* Scenery Selector Trigger */}
          <button
            onClick={() => setIsSceneryModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 text-xs font-medium text-zinc-200 transition-all hover:border-white/20 shadow-sm"
          >
            <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
            <span>{currentScenery.name}</span>
          </button>

          {/* Soundscape Trigger */}
          <button
            onClick={() => setIsSoundModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border text-xs font-medium transition-all shadow-sm ${
              isPlayingSound
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                : 'bg-black/40 hover:bg-black/60 border-white/10 text-zinc-200 hover:border-white/20'
            }`}
          >
            {isPlayingSound ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-zinc-400" />
            )}
            <span className="capitalize">{activeSound} ({Math.round(volume * 100)}%)</span>
          </button>
        </div>

        {/* Right: Shield Blocker + Mode Controls */}
        <div className="flex items-center gap-2.5">
          {/* Master Shield Toggle */}
          <button
            onClick={handleToggleShield}
            disabled={shieldLoading}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-xl border text-xs font-medium transition-all shadow-sm ${
              isShieldActive
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-rose-950/40'
                : 'bg-black/40 hover:bg-black/60 border-white/10 text-zinc-300 hover:border-white/20'
            }`}
          >
            <Shield className={`h-3.5 w-3.5 ${isShieldActive ? 'text-rose-400' : 'text-zinc-400'}`} />
            <span>{isShieldActive ? 'Distraction Shield Active' : 'Shield Idle'}</span>
          </button>

          {/* Switch View to Standard Linear Dashboard */}
          <button
            onClick={onSwitchToStandardView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all hover:border-white/20"
            title="Switch to telemetry metrics view"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Telemetry</span>
          </button>

          {/* Fullscreen Zen Mode */}
          <button
            onClick={toggleZenMode}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 text-zinc-300 hover:text-white transition-all hover:border-white/20"
            title="Toggle Zen Mode"
          >
            {isZenMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* 3. CENTER HERO: AESTHETIC STUDIOUS CLOCK / TIMER */}
      <div className="relative z-20 my-auto flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-6 space-y-6">
        {/* Mode Switcher Pill */}
        <div className="inline-flex items-center p-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-xs font-medium text-zinc-400">
          <button
            onClick={() => setTimerMode('CLOCK')}
            className={`px-3 py-1 rounded-full transition-all ${
              timerMode === 'CLOCK' ? 'bg-white/10 text-white font-semibold' : 'hover:text-zinc-200'
            }`}
          >
            Live Clock
          </button>
          <button
            onClick={() => setTimerMode('TIMER')}
            className={`px-3 py-1 rounded-full transition-all ${
              timerMode === 'TIMER' ? 'bg-white/10 text-white font-semibold' : 'hover:text-zinc-200'
            }`}
          >
            Study Pomodoro
          </button>
        </div>

        {/* Display: Big Clock OR Focus Timer */}
        {timerMode === 'CLOCK' ? (
          <div className="space-y-2 animate-in fade-in duration-300">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-light tracking-tight text-white drop-shadow-md font-mono tabular-nums select-none">
              {formatClockTime(time)}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-zinc-300/80 tracking-wide uppercase">
              {formatClockDate(time)}
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Preset Buttons */}
            <div className="flex items-center justify-center gap-2 text-xs">
              {[25, 50, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setPresetDuration(mins)}
                  className={`px-3 py-1 rounded-lg border transition-all ${
                    timerDuration === mins * 60
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold'
                      : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Huge Countdown Display */}
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-light tracking-tight text-white drop-shadow-md font-mono tabular-nums select-none">
              {formatSeconds(timerRemaining)}
            </h1>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md ${
                  isTimerRunning
                    ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                    : 'bg-white text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                {isTimerRunning ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                <span>{isTimerRunning ? 'Pause Session' : 'Start Focus Flow'}</span>
              </button>

              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerRemaining(timerDuration);
                }}
                className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-zinc-300 hover:text-white transition-colors"
                title="Reset timer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Studious Intention Input (Click to edit) */}
        <div className="w-full max-w-md pt-2">
          <input
            type="text"
            value={intention}
            onChange={(e) => handleIntentionChange(e.target.value)}
            placeholder="Set your main study intention for today..."
            className="w-full text-center text-xs sm:text-sm text-zinc-100 placeholder-zinc-400/70 bg-black/30 backdrop-blur-xl border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl py-2 px-4 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* 4. BOTTOM WIDGETS ROW: TASKS SCRATCHPAD & QUICK ROOM LAUNCHER */}
      <div className="relative z-20 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        {/* Minimalist Task Scratchpad */}
        <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Study Scratchpad ({tasks.filter((t) => t.done).length}/{tasks.length})</span>
            </span>
            <span className="text-[10px] text-zinc-400">Stored locally</span>
          </div>

          {/* Task List */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-xs transition-colors hover:bg-white/[0.05]"
              >
                <button
                  onClick={() => handleToggleTask(task.id)}
                  className="flex items-center gap-2 min-w-0 text-left flex-1"
                >
                  <span
                    className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                      task.done
                        ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
                        : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {task.done && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <span className={`truncate ${task.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                    {task.text}
                  </span>
                </button>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors ml-2"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Task Input */}
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              type="text"
              placeholder="Add quick study task..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-white/20 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/15 text-white text-xs font-semibold transition-colors"
            >
              Add
            </button>
          </form>
        </div>

        {/* Quick Accountability Rooms Widget */}
        <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Live Accountability Rooms</span>
            </span>
            <button
              onClick={() => router.push('/rooms')}
              className="text-[11px] text-zinc-400 hover:text-white transition-colors"
            >
              Browse All →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div
              onClick={() => router.push('/rooms')}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 cursor-pointer transition-all space-y-1 group"
            >
              <p className="font-semibold text-zinc-200 group-hover:text-white truncate">Silent Library</p>
              <p className="text-[10px] text-zinc-400">90m Deep Study • 4 Active</p>
            </div>

            <div
              onClick={() => router.push('/rooms')}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 cursor-pointer transition-all space-y-1 group"
            >
              <p className="font-semibold text-zinc-200 group-hover:text-white truncate">DSA Grind Lab</p>
              <p className="text-[10px] text-zinc-400">50m Coding • 3 Active</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/focus/custom/setup')}
            className="w-full py-2 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-100 transition-colors shadow-sm text-center"
          >
            Launch Solo Focus Room with Blocker
          </button>
        </div>
      </div>
    </div>
  );
}
