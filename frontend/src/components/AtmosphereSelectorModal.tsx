'use client';

import React, { useState } from 'react';
import { ATMOSPHERES, AtmosphereCategory, AtmosphereTheme } from '@/lib/atmospheres';
import { X, Check, Palette, Sparkles } from 'lucide-react';

interface AtmosphereSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedId: string;
  onSelectAtmosphere: (atm: AtmosphereTheme) => void;
}

export function AtmosphereSelectorModal({
  isOpen,
  onClose,
  selectedId,
  onSelectAtmosphere,
}: AtmosphereSelectorModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = [
    'All',
    'TECH',
    'ATMOSPHERE',
    'LIBRARY / STUDY',
    'NIGHT',
    'SKY',
    'NATURE',
    'ABSTRACT',
  ];

  const filtered =
    activeCategory === 'All'
      ? ATMOSPHERES
      : ATMOSPHERES.filter((a) => a.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0d0f14]/95 p-6 shadow-2xl text-zinc-100 space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Atmosphere Library</h2>
              <p className="text-xs text-zinc-400">
                Personalized environmental shaders, procedural dynamics & visuals
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

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeCategory === cat
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 overflow-y-auto pr-1 flex-1">
          {filtered.map((atm) => {
            const isSelected = selectedId === atm.id;
            return (
              <button
                key={atm.id}
                onClick={() => {
                  onSelectAtmosphere(atm);
                  onClose();
                }}
                className={`relative rounded-xl overflow-hidden border text-left transition-all group ${
                  isSelected
                    ? 'ring-2 ring-sky-400 border-transparent shadow-lg shadow-sky-500/10'
                    : 'border-white/10 hover:border-white/25 hover:shadow-md'
                }`}
              >
                <div className="h-28 w-full relative">
                  <img
                    src={atm.bgImageUrl}
                    alt={atm.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-black/40 to-transparent" />
                  {isSelected && (
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-sky-500 text-white shadow-md">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/60 text-zinc-300 backdrop-blur-sm">
                      {atm.category}
                    </span>
                    <h3 className="text-xs font-bold text-white mt-1 truncate">{atm.name}</h3>
                  </div>
                </div>
                <div className="p-2.5 bg-[#12141a]">
                  <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {atm.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
