'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAmbient } from '@/contexts/AmbientContext';
import { SCENERIES } from '@/lib/sceneries';
import { X, Check, Image as ImageIcon } from 'lucide-react';

export function ScenerySelectorModal() {
  const {
    isSceneryModalOpen,
    setIsSceneryModalOpen,
    currentScenery,
    setSceneryId,
    pageSceneries,
    setPageScenery,
  } = useAmbient();

  const pathname = usePathname();
  const page = pathname === '/' ? 'home' : pathname === '/dashboard' ? 'dashboard' : null;
  const selectedScenery = page ? pageSceneries[page] : currentScenery;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const categories = ['All', 'Cozy', 'Lofi', 'Nature', 'Dark Academia', 'Minimal'] as const;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isSceneryModalOpen && !dialog.open) dialog.showModal();
    if (!isSceneryModalOpen && dialog.open) dialog.close();
  }, [isSceneryModalOpen]);

  useEffect(() => {
    setIsSceneryModalOpen(false);
  }, [pathname, setIsSceneryModalOpen]);

  const filteredSceneries = activeCategory === 'All'
    ? SCENERIES
    : SCENERIES.filter((s) => s.category === activeCategory);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="scenery-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        setIsSceneryModalOpen(false);
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#121215] text-zinc-100 shadow-2xl backdrop:bg-black/75"
    >
      <div className="flex max-h-[85dvh] flex-col gap-4 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-white">
              <ImageIcon className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 id="scenery-dialog-title" className="text-base font-semibold text-white">
                {page === 'home' ? 'Customize Home' : page === 'dashboard' ? 'Customize Dashboard' : 'Study Sceneries'}
              </h2>
              {page && <p className="text-xs text-zinc-400">Choose a background for this screen.</p>}
            </div>
          </div>

          <button
            type="button"
            aria-label="Close customization"
            onClick={() => setIsSceneryModalOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {page && (
          <button
            type="button"
            aria-pressed={!selectedScenery}
            onClick={() => setPageScenery(page, null)}
            className="self-start rounded-lg border border-white/10 px-3 py-2 text-xs font-medium hover:bg-white/10 aria-pressed:border-emerald-400 aria-pressed:text-emerald-300"
          >
            Default background
          </button>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={activeCategory === cat}
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
          {isSceneryModalOpen && filteredSceneries.map((scenery) => {
            const isSelected = selectedScenery?.id === scenery.id;

            return (
              <button
                key={scenery.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  if (page) {
                    setPageScenery(page, scenery);
                  } else {
                    setSceneryId(scenery.id);
                    setIsSceneryModalOpen(false);
                  }
                }}
                className={`group relative aspect-[16/10] rounded-xl overflow-hidden border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-950/40'
                    : 'border-white/[0.08] hover:border-white/20'
                }`}
              >
                {/* Background Image / Color */}
                {scenery.bgImageUrl ? (
                  <img
                    src={scenery.bgImageUrl}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span className="absolute inset-0 bg-[#09090b]" />
                )}

                {/* Dark Vignette Overlay */}
                <span
                  className="absolute inset-0 transition-opacity"
                  style={{ background: scenery.gradientOverlay }}
                />

                {/* Content Overlay */}
                <span className="absolute inset-0 p-3.5 flex flex-col justify-between z-10">
                  <span className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-white/80 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                      {scenery.category}
                    </span>

                    {isSelected && (
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-zinc-950">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </span>

                  <span>
                    <span className="block text-sm font-semibold text-white drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                      {scenery.name}
                    </span>
                    <span className="block text-[11px] text-zinc-300/90 line-clamp-1 mt-0.5">
                      {scenery.tagline}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
