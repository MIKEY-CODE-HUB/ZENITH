'use client';

import React from 'react';
import { useAmbient } from '@/contexts/AmbientContext';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  CloudRain,
  Flame,
  Coffee,
  Trees,
  Radio,
  X,
  Sliders,
} from 'lucide-react';

export function AmbientSoundMixer() {
  const {
    isSoundModalOpen,
    setIsSoundModalOpen,
    isPlayingSound,
    toggleSound,
    activeSound,
    changeSound,
    volume,
    changeVolume,
  } = useAmbient();

  if (!isSoundModalOpen) return null;

  const soundOptions = [
    {
      id: 'rain',
      label: 'Soft Rain & Drops',
      icon: CloudRain,
      desc: 'Gentle raindrops falling against windowpane',
    },
    {
      id: 'cafe',
      label: 'Cozy Cafe Ambience',
      icon: Coffee,
      desc: 'Soft background coffeehouse acoustics',
    },
    {
      id: 'fire',
      label: 'Fireplace Crackle',
      icon: Flame,
      desc: 'Warm mountain hearth & snapping cedar wood',
    },
    {
      id: 'forest',
      label: 'Highland Pine Wind',
      icon: Trees,
      desc: 'Soothing mountain breeze through conifers',
    },
    {
      id: 'alpha',
      label: '40Hz Alpha Focus Drone',
      icon: Radio,
      desc: 'Binaural concentration wave + brown noise',
    },
  ] as const;

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#121215] border border-white/10 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-emerald-400">
              <Volume2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Ambient Soundscape
              </h2>
              <p className="text-xs text-zinc-400">
                Layerable audio synthesizer for deep work
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSoundModalOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Master Play/Pause & Volume Bar */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={toggleSound}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isPlayingSound
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-white text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              {isPlayingSound ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause Ambience</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Play Ambience</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {volume === 0 ? (
                <VolumeX className="h-4 w-4 text-zinc-500" />
              ) : (
                <Volume2 className="h-4 w-4 text-zinc-300" />
              )}
              <span className="font-mono tabular-nums text-zinc-300">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          {/* Volume Slider */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            className="w-full accent-emerald-400 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Sound Selection List */}
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
            Select Soundscape
          </span>

          <div className="space-y-1.5">
            {soundOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = activeSound === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => changeSound(opt.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-white/[0.08] border-white/20 text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/[0.04] text-zinc-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-zinc-500">{opt.desc}</p>
                    </div>
                  </div>

                  {isSelected && isPlayingSound && (
                    <div className="flex items-center gap-1">
                      <span className="h-3 w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-4 w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-1 bg-emerald-400 rounded-full animate-bounce" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
