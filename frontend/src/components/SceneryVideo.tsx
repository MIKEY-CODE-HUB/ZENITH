'use client';

import { useEffect, useRef, useState } from 'react';

export function SceneryVideo({ src, className, paused = false }: { src: string; className: string; paused?: boolean }) {
  const [allowMotion, setAllowMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAllowMotion(!preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const syncPlayback = () => {
      if (paused || document.hidden) video.pause();
      else void video.play().catch(() => {});
    };
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    return () => document.removeEventListener('visibilitychange', syncPlayback);
  }, [allowMotion, paused, src]);

  if (!allowMotion) return null;
  return <video key={src} ref={videoRef} aria-hidden className={className} src={src}
    preload="none" muted loop playsInline disablePictureInPicture />;
}
