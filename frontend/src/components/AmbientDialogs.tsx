'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAmbient } from '@/contexts/AmbientContext';

const ThemePicker = dynamic(() => import('./ScenerySelectorModal').then(module => module.ScenerySelectorModal), { ssr: false });
const SoundMixer = dynamic(() => import('./AmbientSoundMixer').then(module => module.AmbientSoundMixer), { ssr: false });

export function AmbientDialogs() {
  const { isSceneryModalOpen, isSoundModalOpen } = useAmbient();
  const [hasOpenedAudio, setHasOpenedAudio] = useState(false);

  useEffect(() => {
    if (isSoundModalOpen) setHasOpenedAudio(true);
  }, [isSoundModalOpen]);

  return (
    <>
      {isSceneryModalOpen && <ThemePicker />}
      {(isSoundModalOpen || hasOpenedAudio) && <SoundMixer />}
    </>
  );
}
