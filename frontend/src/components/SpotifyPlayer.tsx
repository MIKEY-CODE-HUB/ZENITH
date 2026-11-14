'use client';

import { useId, useState, type FormEvent } from 'react';

export function SpotifyPlayer({ visible = true }: { visible?: boolean }) {
  const inputId = useId();
  const [link, setLink] = useState('');
  const [embed, setEmbed] = useState('');
  const [error, setError] = useState('');

  function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const parsed = new URL(link.trim());
      const match = /^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|playlist|album)\/([a-z0-9]{22})\/?$/i.exec(parsed.pathname);
      if (parsed.origin !== 'https://open.spotify.com' || parsed.username || parsed.password || !match) throw new Error();
      setEmbed(`https://open.spotify.com/embed/${match[1]}/${match[2]}`);
      setError('');
    } catch {
      setError('Paste a Spotify track, album, or playlist link.');
    }
  }

  return (
    <div hidden={!visible} className="space-y-3">
      <form onSubmit={load} className="space-y-2">
        <label htmlFor={inputId} className="text-sm">Spotify track, album, or playlist</label>
        <div className="flex gap-2">
          <input id={inputId} type="url" required value={link} onChange={event => setLink(event.target.value)}
            placeholder="https://open.spotify.com/…" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white">Load</button>
        </div>
        {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
      </form>
      {embed && <>
        <iframe src={embed} title="Spotify player" width="100%" height="152"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture" className="rounded-xl" />
        <button type="button" className="text-sm underline" onClick={() => setEmbed('')}>Remove player</button>
      </>}
    </div>
  );
}
