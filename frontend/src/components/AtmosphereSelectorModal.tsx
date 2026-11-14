'use client';

import React, { useState } from 'react';
import { ATMOSPHERES, AtmosphereTheme } from '@/lib/atmospheres';
import { X, Check, Palette } from 'lucide-react';

interface AtmosphereSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedId: string;
  customAtmosphere?: AtmosphereTheme;
  onSelectAtmosphere: (atm: AtmosphereTheme) => void;
}

export function AtmosphereSelectorModal({
  isOpen,
  onClose,
  selectedId,
  customAtmosphere,
  onSelectAtmosphere,
}: AtmosphereSelectorModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('COZY');

  if (!isOpen) return null;

  const categories = [
    'COZY',
    'All',
    'VIDEO',
    'TECH',
    'ATMOSPHERE',
    'LIBRARY / STUDY',
    'NIGHT',
    'SKY',
    'NATURE',
    'ABSTRACT',
  ];

  const themes = customAtmosphere ? [customAtmosphere, ...ATMOSPHERES] : ATMOSPHERES;
  const filtered = themes.filter(theme =>
    activeCategory === 'All' || (theme.category === activeCategory &&
      (activeCategory !== 'COZY' || Boolean(theme.mood) || theme.id === 'custom')));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#281f19] p-6 shadow-2xl text-zinc-100 space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#efd3ac]/10 text-[#efd3ac] border border-[#efd3ac]/20">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Cozy atmospheres</h2>
              <p className="text-xs text-zinc-400">
                Choose a scene for this session.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close atmospheres"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat === 'COZY' ? 'Cozy scenes' : cat === 'VIDEO' ? 'Video' : cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeCategory === cat
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {cat === 'COZY' ? 'Cozy scenes' : cat === 'VIDEO' ? 'Video' : cat}
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
                <div className="h-28 w-full relative" style={{ background: atm.gradientOverlay }}>
                  {atm.bgImageUrl && <img
                    src={atm.bgImageUrl}
                    alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#211711] via-black/40 to-transparent" />
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
                <div className="p-2.5 bg-[#211711]">
                  <p className="text-[10px] text-[#dbc5b3] line-clamp-2 leading-relaxed">
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
