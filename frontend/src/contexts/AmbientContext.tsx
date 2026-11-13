'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SCENERIES, Scenery, SceneryPage } from '@/lib/sceneries';
import { ambientSound } from '@/lib/ambientAudio';

interface AmbientContextType {
  currentScenery: Scenery;
  pageSceneries: Record<SceneryPage, Scenery | null>;
  setPageScenery: (page: SceneryPage, scenery: Scenery | null) => void;
  setSceneryId: (id: string) => void;
  isPlayingSound: boolean;
  activeSound: 'rain' | 'fire' | 'cafe' | 'forest' | 'alpha';
  volume: number;
  toggleSound: () => void;
  changeSound: (type: 'rain' | 'fire' | 'cafe' | 'forest' | 'alpha') => void;
  changeVolume: (val: number) => void;
  isZenMode: boolean;
  toggleZenMode: () => void;
  isSceneryModalOpen: boolean;
  setIsSceneryModalOpen: (open: boolean) => void;
  isSoundModalOpen: boolean;
  setIsSoundModalOpen: (open: boolean) => void;
}

const PAGE_SCENERY_KEYS = {
  home: 'zenith_home_scenery_id',
  dashboard: 'zenith_dashboard_scenery_id',
} satisfies Record<SceneryPage, string>;

function readPageScenery(page: SceneryPage) {
  const id = localStorage.getItem(PAGE_SCENERY_KEYS[page]);
  return SCENERIES.find((scenery) => scenery.id === id) ?? null;
}

const AmbientContext = createContext<AmbientContextType | undefined>(undefined);

export function AmbientProvider({ children }: { children: React.ReactNode }) {
  const [currentScenery, setCurrentScenery] = useState<Scenery>(SCENERIES[0]);
  const [pageSceneries, setPageSceneries] = useState<Record<SceneryPage, Scenery | null>>({
    home: null,
    dashboard: null,
  });
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [activeSound, setActiveSound] = useState<'rain' | 'fire' | 'cafe' | 'forest' | 'alpha'>('rain');
  const [volume, setVolume] = useState(0.4);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSceneryModalOpen, setIsSceneryModalOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);

  // Load saved scenery preference from localStorage
  useEffect(() => {
    try {
      setPageSceneries({
        home: readPageScenery('home'),
        dashboard: readPageScenery('dashboard'),
      });
      const savedSceneryId = localStorage.getItem('zenith_scenery_id');
      if (savedSceneryId) {
        const found = SCENERIES.find((s) => s.id === savedSceneryId);
        if (found) {
          setCurrentScenery(found);
          setActiveSound(found.defaultSound);
        }
      }
      const savedVolume = localStorage.getItem('zenith_ambient_volume');
      if (savedVolume) {
        const v = parseFloat(savedVolume);
        setVolume(v);
        ambientSound.setVolume(v);
      }
    } catch (e) {}
  }, []);

  const setPageScenery = (page: SceneryPage, scenery: Scenery | null) => {
    setPageSceneries((previous) => ({ ...previous, [page]: scenery }));
    try {
      if (scenery) {
        localStorage.setItem(PAGE_SCENERY_KEYS[page], scenery.id);
      } else {
        localStorage.removeItem(PAGE_SCENERY_KEYS[page]);
      }
    } catch {
      // The theme still applies when browser storage is unavailable.
    }
  };

  const setSceneryId = (id: string) => {
    const found = SCENERIES.find((s) => s.id === id);
    if (found) {
      setCurrentScenery(found);
      try {
        localStorage.setItem('zenith_scenery_id', id);
      } catch (e) {}

      // If already playing audio, optionally transition to the new scenery's default sound
      if (isPlayingSound) {
        setActiveSound(found.defaultSound);
        ambientSound.play(found.defaultSound);
      } else {
        setActiveSound(found.defaultSound);
      }
    }
  };

  const toggleSound = () => {
    if (isPlayingSound) {
      ambientSound.stop();
      setIsPlayingSound(false);
    } else {
      ambientSound.play(activeSound);
      setIsPlayingSound(true);
    }
  };

  const changeSound = (type: 'rain' | 'fire' | 'cafe' | 'forest' | 'alpha') => {
    setActiveSound(type);
    if (isPlayingSound) {
      ambientSound.play(type);
    }
  };

  const changeVolume = (val: number) => {
    setVolume(val);
    ambientSound.setVolume(val);
    try {
      localStorage.setItem('zenith_ambient_volume', String(val));
    } catch (e) {}
  };

  const toggleZenMode = () => {
    setIsZenMode((prev) => !prev);
  };

  return (
    <AmbientContext.Provider
      value={{
        currentScenery,
        pageSceneries,
        setPageScenery,
        setSceneryId,
        isPlayingSound,
        activeSound,
        volume,
        toggleSound,
        changeSound,
        changeVolume,
        isZenMode,
        toggleZenMode,
        isSceneryModalOpen,
        setIsSceneryModalOpen,
        isSoundModalOpen,
        setIsSoundModalOpen,
      }}
    >
      {children}
    </AmbientContext.Provider>
  );
}

export function useAmbient() {
  const context = useContext(AmbientContext);
  if (!context) {
    throw new Error('useAmbient must be used within an AmbientProvider');
  }
  return context;
}
