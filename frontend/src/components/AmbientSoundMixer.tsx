'use client';

import { useEffect, useRef, useState } from 'react';
import { Headphones, Pause, Play, X } from 'lucide-react';
import { useAmbient } from '@/contexts/AmbientContext';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import type { AmbientSound } from '@/lib/ambientAudio';

const sounds: { id: AmbientSound; label: string }[] = [
  { id: 'white', label: 'White noise' },
  { id: 'pink', label: 'Pink noise' },
  { id: 'brown', label: 'Brown noise' },
  { id: 'rain', label: 'Soft rain' },
  { id: 'fire', label: 'Fireplace' },
  { id: 'cafe', label: 'Quiet café' },
  { id: 'forest', label: 'Forest wind' },
  { id: 'alpha', label: 'Ambient drone' },
];

export function AmbientSoundMixer() {
  const { isSoundModalOpen, setIsSoundModalOpen, isPlayingSound, toggleSound, activeSound, changeSound, volume, changeVolume } = useAmbient();
  const [tab, setTab] = useState<'sounds' | 'spotify'>('sounds');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (isSoundModalOpen && element && !element.open) element.showModal();
    return () => element?.close();
  }, [isSoundModalOpen]);

  return (
    <dialog ref={dialog} aria-labelledby="audio-title" onCancel={() => setIsSoundModalOpen(false)}
      className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md space-y-5 overflow-auto rounded-2xl border border-[#efd1b5]/20 bg-[#231c17] p-5 text-[#fff0df] shadow-xl backdrop:bg-black/70">
      <div className="flex items-center justify-between gap-2">
        <h2 id="audio-title" className="flex items-center gap-2 text-lg font-semibold"><Headphones size={18} /> Focus audio</h2>
        <button type="button" aria-label="Close audio" className="rounded-lg p-2 hover:bg-white/10" onClick={() => setIsSoundModalOpen(false)}><X size={20} /></button>
      </div>
      <div role="group" aria-label="Audio source" className="flex gap-2">
        <button type="button" aria-pressed={tab === 'sounds'} onClick={() => setTab('sounds')} className="rounded-lg px-3 py-2 text-sm aria-pressed:bg-white/15">Ambience & noise</button>
        <button type="button" aria-pressed={tab === 'spotify'} onClick={() => setTab('spotify')} className="rounded-lg px-3 py-2 text-sm aria-pressed:bg-white/15">Spotify</button>
      </div>
      {tab === 'sounds' && <div className="space-y-4">
        <div role="group" aria-label="Ambience and noise" className="grid grid-cols-2 gap-2">
          {sounds.map(sound => <button key={sound.id} type="button" aria-pressed={sound.id === activeSound}
            className="rounded-lg border border-white/15 p-2 text-left text-sm hover:bg-white/10 aria-pressed:border-[#e6bd93] aria-pressed:bg-white/10"
            onClick={() => changeSound(sound.id)}>{sound.label}</button>)}
        </div>
        <button type="button" onClick={toggleSound} className="flex items-center gap-2 rounded-lg bg-[#edcfad] px-4 py-2 text-sm font-semibold text-[#2b1e15]">
          {isPlayingSound ? <Pause size={15} /> : <Play size={15} />}{isPlayingSound ? 'Pause ambience' : 'Play ambience'}
        </button>
        <label className="flex flex-wrap items-center gap-3 text-sm">Volume
          <input type="range" min="0" max="1" step="0.02" value={volume} onChange={event => changeVolume(Number(event.target.value))} className="grow accent-[#e6bd93]" />
          <span>{Math.round(volume * 100)}%</span>
        </label>
      </div>}
      <SpotifyPlayer visible={tab === 'spotify'} />
    </dialog>
  );
}
