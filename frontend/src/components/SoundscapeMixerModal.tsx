'use client';

import React, { useState, useEffect } from 'react';
import { SOUND_LAYERS, SoundLayerId, soundscapeEngine } from '@/lib/soundscapeEngine';
import { Volume2, VolumeX, X, Sliders, Sparkles, RotateCcw } from 'lucide-react';

interface SoundscapeMixerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SoundscapeMixerModal({ isOpen, onClose }: SoundscapeMixerModalProps) {
  const [volumes, setVolumes] = useState<Record<SoundLayerId, number>>(soundscapeEngine.getAllVolumes());
  const [isMuted, setIsMuted] = useState(soundscapeEngine.isMuted());

  useEffect(() => {
    if (isOpen) {
      setVolumes(soundscapeEngine.getAllVolumes());
      setIsMuted(soundscapeEngine.isMuted());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVolumeChange = (id: SoundLayerId, val: number) => {
    soundscapeEngine.setVolume(id, val);
    setVolumes(soundscapeEngine.getAllVolumes());
  };

  const handleToggleMute = () => {
    const muted = soundscapeEngine.toggleMute();
    setIsMuted(muted);
  };

  const applyPreset = (preset: Partial<Record<SoundLayerId, number>>) => {
    soundscapeEngine.stopAll();
    Object.entries(preset).forEach(([id, vol]) => {
      soundscapeEngine.setVolume(id as SoundLayerId, vol || 0);
    });
    setVolumes(soundscapeEngine.getAllVolumes());
  };

  const handleReset = () => {
    soundscapeEngine.stopAll();
    setVolumes(soundscapeEngine.getAllVolumes());
  };

  const activeLayersCount = Object.values(volumes).filter((v) => v > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0f14]/95 p-6 shadow-2xl text-zinc-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Layered Soundscape Mixer
                {activeLayersCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                    {activeLayersCount} Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                Blend continuous ambient frequencies with individual volume faders.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Atmosphere Presets</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => applyPreset({ rain: 45, 'brown-noise': 15 })}
              className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              🌧️ Rainy Study
            </button>
            <button
              onClick={() => applyPreset({ 'brown-noise': 50, cafe: 20 })}
              className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              ☕ Cafe Focus
            </button>
            <button
              onClick={() => applyPreset({ ocean: 40, wind: 20 })}
              className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              🌊 Coastal Deep Work
            </button>
            <button
              onClick={() => applyPreset({ fireplace: 45, 'brown-noise': 20 })}
              className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              🔥 Hearth & Code
            </button>
          </div>
        </div>

        {/* Sound Layer Sliders */}
        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
          {SOUND_LAYERS.map((layer) => {
            const vol = volumes[layer.id] || 0;
            return (
              <div key={layer.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span>{layer.icon}</span>
                    <span className="font-medium text-white">{layer.name}</span>
                  </div>
                  <span className={`font-mono text-xs ${vol > 0 ? 'text-sky-400 font-semibold' : 'text-zinc-500'}`}>
                    {vol}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vol}
                  onChange={(e) => handleVolumeChange(layer.id, parseInt(e.target.value, 10))}
                  className="w-full accent-sky-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Mute All</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isMuted
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-white/10 text-white border-white/15'
              }`}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span>{isMuted ? 'Unmute Master' : 'Mute Master'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold hover:bg-sky-400 transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
