'use client';

import React from 'react';
import { useAmbient } from '@/contexts/AmbientContext';
import { SCENERIES } from '@/lib/sceneries';
import { X, Check, Sparkles, Volume2, Image as ImageIcon } from 'lucide-react';

export function ScenerySelectorModal() {
  const {
    isSceneryModalOpen,
    setIsSceneryModalOpen,
    currentScenery,
    setSceneryId,
  } = useAmbient();

  if (!isSceneryModalOpen) return null;

  const categories = ['All', 'Cozy', 'Lofi', 'Nature', 'Dark Academia', 'Minimal'] as const;
  const [activeCategory, setActiveCategory] = React.useState<string>('All');

  const filteredSceneries = activeCategory === 'All'
    ? SCENERIES
    : SCENERIES.filter((s) => s.category === activeCategory);

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#121215] border border-white/10 shadow-2xl p-6 space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-white">
              <ImageIcon className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Study Sceneries & Ambience
              </h2>
              <p className="text-xs text-zinc-400">
                Immersive photographic and minimalist backdrops for deep focus
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSceneryModalOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeCategory === cat
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-white/[0.05]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sceneries Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1">
          {filteredSceneries.map((scenery) => {
            const isSelected = currentScenery.id === scenery.id;

            return (
              <div
                key={scenery.id}
                onClick={() => {
                  setSceneryId(scenery.id);
                  setIsSceneryModalOpen(false);
                }}
                className={`group relative aspect-[16/10] rounded-xl overflow-hidden border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-950/40'
                    : 'border-white/[0.08] hover:border-white/20'
                }`}
              >
                {/* Background Image / Color */}
                {scenery.bgImageUrl ? (
                  <img
                    src={scenery.bgImageUrl}
                    alt={scenery.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#09090b]" />
                )}

                {/* Dark Vignette Overlay */}
                <div
                  className="absolute inset-0 transition-opacity"
                  style={{ background: scenery.gradientOverlay }}
                />

                {/* Content Overlay */}
                <div className="absolute inset-0 p-3.5 flex flex-col justify-between z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-white/80 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                      {scenery.category}
                    </span>

                    {isSelected && (
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-zinc-950">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                      {scenery.name}
                    </h3>
                    <p className="text-[11px] text-zinc-300/90 line-clamp-1 mt-0.5">
                      {scenery.tagline}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
