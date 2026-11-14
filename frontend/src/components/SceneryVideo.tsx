'use client';

import { useEffect, useState } from 'react';

export function SceneryVideo({ src, className }: { src: string; className: string }) {
  const [allowMotion, setAllowMotion] = useState(false);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAllowMotion(!preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  if (!allowMotion) return null;
  return <video key={src} aria-hidden className={className} src={src} autoPlay muted loop playsInline disablePictureInPicture />;
}
