'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getDefaultScenery, SCENERY_PAGES, type SceneryPage, useAmbient } from '@/contexts/AmbientContext';
import { AtmosphericScene } from '@/components/AtmosphericScene';
import { loadSceneryMedia, parseSceneryUrl, sceneryLinkError } from '@/lib/sceneryMedia';
import { type Scenery, SCENERIES, customScenery } from '@/lib/sceneries';

const sections = Object.entries(SCENERY_PAGES) as [SceneryPage, string][];
const categories = ['Cozy scenes', 'Reading rooms', 'Rain & snow', 'Quiet mornings', 'Outdoors', 'Video', 'Still colors', 'All'];
const featuredIds = ['walnut-window', 'moss-library', 'snow-cabin', 'tea-at-dusk', 'early-bakery', 'fern-path', 'violet-lake', 'linen-desk', 'rose-canyon'];
const featuredScenes = featuredIds.flatMap(id => SCENERIES.filter(scene => scene.id === id));

export function ScenerySelectorModal() {
  const { isSceneryModalOpen, setIsSceneryModalOpen, sceneryPage, pageSceneries, setPageScenery } = useAmbient();
  const dialog = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState<SceneryPage>('home');
  const [category, setCategory] = useState('Cozy scenes');
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
      setCustomError(sceneryLinkError(customUrl));
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
    setCategory('Cozy scenes');
    selectPreview(pageSceneries[sceneryPage]);
    const element = dialog.current;
    element?.showModal();
    return () => { previewRequest.current++; element?.close(); };
  }, [isSceneryModalOpen, sceneryPage]);

  const displayed = preview ?? getDefaultScenery(page);
  const themes = category === 'Cozy scenes'
    ? featuredScenes
    : SCENERIES.filter(scene => category === 'All' || scene.category === category);
  const customLinkReady = !customUrl.trim() ||
    (preview?.id === 'custom' && customUrl === (preview.videoUrl || preview.bgImageUrl));

  return (
    <dialog
      ref={dialog}
      aria-labelledby="scenery-title"
      onCancel={() => setIsSceneryModalOpen(false)}
      className="zenith-room-dialog m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-3xl p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="scenery-title" className="font-serif text-3xl tracking-tight">Cozy atmospheres</h2>
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
            className="zenith-room-tab"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative mt-4 flex aspect-[2.45/1] min-h-36 items-end overflow-hidden rounded-2xl border border-white/10 bg-[#30251d] p-4 text-white">
        <AtmosphericScene scene={displayed} fallbackImage={getDefaultScenery(page).bgImageUrl} />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#110d0c]/90 via-transparent to-transparent" />
        <div className="relative z-10">
          <p className="font-serif text-2xl sm:text-3xl">{displayed.name}</p>
          {(displayed.mood || displayed.videoUrl) && (
            <p className="mt-1 text-xs text-[#ecd8c1]">{displayed.videoUrl ? 'Looping video' : displayed.mood?.label}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Theme collection">
        {categories.map(group => (
          <button key={group} type="button" className="zenith-room-tab shrink-0" aria-pressed={group === category}
            onClick={() => setCategory(group)}>{group}</button>
        ))}
      </div>
      <div className="mt-2 grid max-h-64 grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-3" role="group" aria-label="Preview an atmosphere">
        {themes.map(scenery => (
          <button key={scenery.id} type="button" aria-pressed={displayed.id === scenery.id}
            onClick={() => selectPreview(scenery)}
            className="flex flex-col overflow-hidden rounded-xl border border-[#efd3ac]/20 text-left text-sm hover:bg-white/5 aria-pressed:border-[#efd3ac]"
            title={scenery.name}>
            <span className="block h-16 w-full shrink-0 overflow-hidden" style={{ backgroundImage: scenery.gradientOverlay }} aria-hidden>
              {scenery.bgImageUrl && <img src={scenery.bgImageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
                className="h-full w-full object-cover" />}
            </span>
            <span className="block px-2.5 py-2">
              <span className="block font-medium">{scenery.name}</span>
              {scenery.mood && <span className="mt-0.5 block text-xs text-[#dbc5b3]">{scenery.videoUrl ? 'Looping video' : scenery.mood.label}</span>}
            </span>
          </button>
        ))}
      </div>
      <details className="mt-4 rounded-xl border border-[#efd3ac]/15 px-3 py-2"
        key={page} open={preview?.id === 'custom' || undefined}>
        <summary className="cursor-pointer text-sm text-[#ecd8c1]">Use a custom image or video</summary>
        <form className="mt-4 space-y-2" onSubmit={event => { event.preventDefault(); void previewCustom(); }}>
          <label htmlFor="scenery-url" className="text-sm font-medium">Custom image or video link</label>
          <p className="text-xs text-[#e3d1c0]">From Google Images, open the image and choose Copy image address.</p>
          <div className="flex flex-wrap gap-2">
            <input id="scenery-url" type="url" value={customUrl} placeholder="https://example.com/wallpaper.jpg"
              onChange={event => {
                previewRequest.current++;
                setChecking(false);
                setCustomError('');
                setCustomUrl(event.target.value);
              }} className="zenith-room-field !mt-0 min-w-0 flex-1" />
            <button disabled={checking || !customUrl.trim()} className="zenith-room-quiet">
              {checking ? 'Checking…' : 'Preview link'}
            </button>
          </div>
          {customError && <p role="alert" className="text-sm text-rose-200">{customError}</p>}
        </form>
      </details>
      <div className="sticky -bottom-5 z-10 mt-4 flex flex-wrap justify-between gap-3 border-t border-white/10 bg-[#281f19] py-3 sm:-bottom-6">
        <button type="button" onClick={() => selectPreview(null)} className="rounded-lg px-3 py-2 text-sm underline underline-offset-4">Restore default</button>
        <button type="button" disabled={checking || !customLinkReady} onClick={() => {
          setPageScenery(page, preview);
          setIsSceneryModalOpen(false);
        }} className="zenith-room-primary">
          Apply to {SCENERY_PAGES[page]}
        </button>
      </div>
    </dialog>
  );
}
