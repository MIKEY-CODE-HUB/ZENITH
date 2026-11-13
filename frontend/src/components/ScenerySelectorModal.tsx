'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { type SceneryPage, useAmbient } from '@/contexts/AmbientContext';
import { type Scenery, SCENERIES } from '@/lib/sceneries';

const sections = [
  { id: 'home', label: 'Home Screen' },
  { id: 'dashboard', label: 'Dashboard' },
] as const;

export function ScenerySelectorModal() {
  const { isSceneryModalOpen, setIsSceneryModalOpen, sceneryPage, pageSceneries, setPageScenery } = useAmbient();
  const dialog = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState<SceneryPage>('home');
  const [preview, setPreview] = useState<Scenery | null>(null);

  useEffect(() => {
    if (!isSceneryModalOpen) return;
    setPage(sceneryPage);
    setPreview(pageSceneries[sceneryPage]);
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, [isSceneryModalOpen, sceneryPage, pageSceneries]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="scenery-title"
      onCancel={() => setIsSceneryModalOpen(false)}
      className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-[rgb(var(--tint))]/10 bg-[rgb(var(--panel))] p-5 text-[rgb(var(--ink))] shadow-2xl backdrop:bg-black/65 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="scenery-title" className="text-lg font-semibold">Customize Theme</h2>
        <button type="button" aria-label="Close" className="rounded-lg p-2 hover:bg-[rgb(var(--tint))]/10" onClick={() => setIsSceneryModalOpen(false)}>
          <X size={20} />
        </button>
      </div>
      <div className="mt-3 flex gap-2" aria-label="Page to customize" role="group">
        {sections.map(section => (
          <button
            key={section.id}
            type="button"
            aria-pressed={page === section.id}
            onClick={() => {
              setPage(section.id);
              setPreview(pageSceneries[section.id]);
            }}
            className="rounded-lg px-3 py-2 text-sm aria-pressed:bg-[rgb(var(--tint))]/10 aria-pressed:font-semibold"
          >
            {section.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex aspect-[3/1] items-end rounded-xl bg-cover bg-center bg-[#30251d] p-3 text-white" style={{
        backgroundImage: preview?.bgImageUrl
          ? `linear-gradient(0deg, #14100dcc, transparent 70%), url("${preview.bgImageUrl}")`
          : preview?.gradientOverlay,
      }}>
        <span className="text-sm font-medium">{preview?.name ?? 'Default background'}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Preview a background">
        {SCENERIES.map(scenery => (
          <button
            type="button"
            key={scenery.id}
            aria-pressed={preview?.id === scenery.id}
            onClick={() => setPreview(scenery)}
            className="rounded-lg border border-[rgb(var(--tint))]/10 px-3 py-2 text-left text-sm hover:bg-[rgb(var(--tint))]/5 aria-pressed:border-emerald-600"
          >
            {scenery.name}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <button type="button" onClick={() => setPreview(null)} className="rounded-lg px-3 py-2 text-sm underline underline-offset-4">Restore default</button>
        <button type="button" onClick={() => {
          setPageScenery(page, preview);
          setIsSceneryModalOpen(false);
        }} className="rounded-lg bg-[rgb(var(--action))] px-4 py-2 text-sm font-semibold text-[rgb(var(--action-ink))]">
          Apply to {page === 'home' ? 'Home Screen' : 'Dashboard'}
        </button>
      </div>
    </dialog>
  );
}
