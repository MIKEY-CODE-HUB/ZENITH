'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getDefaultScenery, SCENERY_PAGES, type SceneryPage, useAmbient } from '@/contexts/AmbientContext';
import { SceneryVideo } from '@/components/SceneryVideo';
import { loadSceneryMedia, parseSceneryUrl } from '@/lib/sceneryMedia';
import { type Scenery, SCENERIES, customScenery } from '@/lib/sceneries';

const sections = Object.entries(SCENERY_PAGES) as [SceneryPage, string][];
const categories = ['All', ...new Set(SCENERIES.map(theme => theme.category))];

export function ScenerySelectorModal() {
  const { isSceneryModalOpen, setIsSceneryModalOpen, sceneryPage, pageSceneries, setPageScenery } = useAmbient();
  const dialog = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState<SceneryPage>('home');
  const [category, setCategory] = useState('All');
  const [preview, setPreview] = useState<Scenery | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState('');
  const [checking, setChecking] = useState(false);
  const previewRequest = useRef(0);

  function selectPreview(scenery: Scenery | null) {
    previewRequest.current++;
    setChecking(false);
    setCustomError('');
    setPreview(scenery);
    setCustomUrl(scenery?.id === 'custom' ? scenery.videoUrl || scenery.bgImageUrl : '');
  }

  async function previewCustom() {
    const media = parseSceneryUrl(customUrl);
    if (!media) {
      setCustomError('Paste a public HTTPS link to an image or MP4/WebM video.');
      return;
    }
    const request = ++previewRequest.current;
    setChecking(true);
    setCustomError('');
    try {
      await loadSceneryMedia(media.url, media.kind);
      if (request === previewRequest.current) {
        setPreview(customScenery(media.url));
        setCustomUrl(media.url);
      }
    } catch (error) {
      if (request === previewRequest.current && error instanceof Error) setCustomError(error.message);
    } finally {
      if (request === previewRequest.current) setChecking(false);
    }
  }

  useEffect(() => {
    if (!isSceneryModalOpen) return;
    setPage(sceneryPage);
    setCategory('All');
    selectPreview(pageSceneries[sceneryPage]);
    const element = dialog.current;
    element?.showModal();
    return () => { previewRequest.current++; element?.close(); };
  }, [isSceneryModalOpen, sceneryPage]);

  const displayed = preview ?? getDefaultScenery(page);

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
      <div className="mt-3 flex flex-wrap gap-1" aria-label="Page to customize" role="group">
        {sections.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={page === id}
            onClick={() => {
              setPage(id);
              selectPreview(pageSceneries[id]);
            }}
            className="rounded-lg px-3 py-2 text-sm aria-pressed:bg-[rgb(var(--tint))]/10 aria-pressed:font-semibold"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative mt-4 flex aspect-[3/1] items-end overflow-hidden rounded-xl bg-[#30251d] p-3 text-white"
        style={{ backgroundImage: displayed.gradientOverlay }}>
        {displayed.bgImageUrl && <img src={displayed.bgImageUrl} alt="" referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover" />}
        {displayed.videoUrl && <SceneryVideo src={displayed.videoUrl} className="absolute inset-0 h-full w-full object-cover" />}
        <span className="relative z-10 rounded bg-black/70 px-2 py-1 text-sm font-medium">{preview?.name ?? 'Default background'}</span>
      </div>
      <form className="mt-4 space-y-2" onSubmit={event => { event.preventDefault(); void previewCustom(); }}>
        <label htmlFor="scenery-url" className="text-sm font-medium">Custom image or video link</label>
        <div className="flex flex-wrap gap-2">
          <input id="scenery-url" type="url" value={customUrl} placeholder="https://example.com/wallpaper.jpg"
            onChange={event => {
              previewRequest.current++;
              setChecking(false);
              setCustomError('');
              setCustomUrl(event.target.value);
            }} className="min-w-0 flex-1 rounded-lg border border-[rgb(var(--tint))]/20 bg-transparent px-3 py-2 text-sm" />
          <button disabled={checking || !customUrl.trim()} className="rounded-lg border border-[rgb(var(--tint))]/20 px-3 py-2 text-sm disabled:opacity-50">
            {checking ? 'Checking…' : 'Preview link'}
          </button>
        </div>
        {customError && <p role="alert" className="text-sm text-red-500">{customError}</p>}
      </form>
      <label className="mt-4 flex items-center gap-3 text-sm">
        Theme collection
        <select className="rounded-lg border border-[rgb(var(--tint))]/10 bg-[rgb(var(--panel))] px-2 py-1"
          value={category} onChange={event => setCategory(event.target.value)}>
          {categories.map(group => <option key={group}>{group}</option>)}
        </select>
      </label>
      <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3" role="group" aria-label="Preview a background">
        {SCENERIES.filter(theme => category === 'All' || theme.category === category).map(scenery => (
          <button
            type="button"
            key={scenery.id}
            aria-pressed={preview?.id === scenery.id}
            onClick={() => selectPreview(scenery)}
            className="overflow-hidden rounded-lg border border-[rgb(var(--tint))]/15 text-left text-sm hover:bg-[rgb(var(--tint))]/5 aria-pressed:border-emerald-500"
            title={scenery.name}
          >
            <span className="block h-12 bg-cover bg-center" style={{ backgroundImage: scenery.bgImageUrl ? `url("${scenery.bgImageUrl}")` : scenery.gradientOverlay }} aria-hidden />
            <span className="block px-2 py-2">{scenery.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <button type="button" onClick={() => selectPreview(null)} className="rounded-lg px-3 py-2 text-sm underline underline-offset-4">Restore default</button>
        <button type="button" disabled={checking || (!!customUrl.trim() && (preview?.id !== 'custom' || customUrl !== (preview.videoUrl || preview.bgImageUrl)))} onClick={() => {
          setPageScenery(page, preview);
          setIsSceneryModalOpen(false);
        }} className="rounded-lg bg-[rgb(var(--action))] px-4 py-2 text-sm font-semibold text-[rgb(var(--action-ink))] disabled:opacity-50">
          Apply to {SCENERY_PAGES[page]}
        </button>
      </div>
    </dialog>
  );
}
