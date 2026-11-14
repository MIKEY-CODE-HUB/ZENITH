'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SCENERIES, Scenery, customScenery } from '@/lib/sceneries';
import { ambientSound, type AmbientSound } from '@/lib/ambientAudio';

export type SceneryPage = 'home' | 'dashboard' | 'rooms' | 'leaderboard' | 'workspace';

export const SCENERY_PAGES: Record<SceneryPage, string> = {
  home: 'Welcome', dashboard: 'Home', rooms: 'Join Rooms', leaderboard: 'Leaderboard', workspace: 'Other pages',
};

const defaultSceneryIds: Record<SceneryPage, string> = {
  home: 'walnut-window', dashboard: 'moss-library', rooms: 'tea-at-dusk',
  leaderboard: 'violet-lake', workspace: 'linen-desk',
};

export function getDefaultScenery(page: SceneryPage) {
  return SCENERIES.find(theme => theme.id === defaultSceneryIds[page])!;
}

export function getSceneryPage(path: string): SceneryPage | null {
  const section = path.split('/')[1];
  if (['blocker', 'profile', 'settings'].includes(section)) return null;
  if (!section || section === 'login' || section === 'signup' || section === 'welcome') return 'home';
  if (section === 'dashboard') return 'dashboard';
  if (section === 'rooms' || section === 'leaderboard') return section;
  if (section === 'focus' && /^\/focus\/[^/]+\/?$/.test(path)) return null;
  return 'workspace';
}

const PAGE_SCENERY_KEYS = {
  home: 'zenith_home_scenery_id',
  dashboard: 'zenith_dashboard_scenery_id',
  rooms: 'zenith_rooms_scenery_id',
  leaderboard: 'zenith_leaderboard_scenery_id',
  workspace: 'zenith_workspace_scenery_id',
} satisfies Record<SceneryPage, string>;

interface AmbientContextType {
  pageSceneries: Record<SceneryPage, Scenery | null>;
  setPageScenery: (page: SceneryPage, scenery: Scenery | null) => void;
  resetBrowserScenery: (page: SceneryPage) => void;
  sceneryPage: SceneryPage;
  openSceneryModal: (page: SceneryPage) => void;
  currentScenery: Scenery;
  setSceneryId: (id: string) => void;
  isPlayingSound: boolean;
  activeSound: AmbientSound;
  volume: number;
  toggleSound: () => void;
  changeSound: (type: AmbientSound) => void;
  changeVolume: (val: number) => void;
  isZenMode: boolean;
  toggleZenMode: () => void;
  isSceneryModalOpen: boolean;
  setIsSceneryModalOpen: (open: boolean) => void;
  isSoundModalOpen: boolean;
  setIsSoundModalOpen: (open: boolean) => void;
}

const AmbientContext = createContext<AmbientContextType | undefined>(undefined);

export function AmbientProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedSceneries, setSavedSceneries] = useState<Partial<Record<SceneryPage, Scenery | null>>>({});
  const settingsUrl = user?.settings?.customThemeUrl;
  const accountScenery = settingsUrl ? customScenery(settingsUrl) : null;
  const target = user?.settings?.customThemeTarget;
  const pageSceneries = {
    home: savedSceneries.home ?? null,
    dashboard: savedSceneries.dashboard === undefined && target !== 'ROOMS' && target !== 'ROOM'
      ? accountScenery : savedSceneries.dashboard ?? null,
    rooms: savedSceneries.rooms === undefined && target !== 'DASHBOARD'
      ? accountScenery : savedSceneries.rooms ?? null,
    leaderboard: savedSceneries.leaderboard ?? null,
    workspace: savedSceneries.workspace ?? null,
  };
  const [sceneryPage, setSceneryPage] = useState<SceneryPage>('home');
  const [currentScenery, setCurrentScenery] = useState<Scenery>(SCENERIES[0]);
  const resetBrowserScenery = (page: SceneryPage) => {
    try { localStorage.removeItem(PAGE_SCENERY_KEYS[page]); } catch {}
    setSavedSceneries(previous => ({ ...previous, [page]: undefined }));
  };
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [activeSound, setActiveSound] = useState<AmbientSound>('rain');
  const [volume, setVolume] = useState(0.4);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSceneryModalOpen, setIsSceneryModalOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);

  // Load saved scenery preference from localStorage
  useEffect(() => {
    try {
      const loadPageScenery = (page: SceneryPage) => {
        const id = localStorage.getItem(PAGE_SCENERY_KEYS[page]);
        if (id === 'default') return null;
        if (id?.startsWith('custom:')) return customScenery(id.slice(7)) ?? undefined;
        return SCENERIES.find(scenery => scenery.id === id);
      };
      setSavedSceneries({ home: loadPageScenery('home'), dashboard: loadPageScenery('dashboard'), rooms: loadPageScenery('rooms'), leaderboard: loadPageScenery('leaderboard'), workspace: loadPageScenery('workspace') });
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
    try {
      const customUrl = scenery?.id === 'custom' && (scenery.videoUrl || scenery.bgImageUrl);
      localStorage.setItem(PAGE_SCENERY_KEYS[page], customUrl ? `custom:${customUrl}` : scenery?.id ?? 'default');
    } catch {
      // The preference still applies for the current tab when storage is unavailable.
    }
    setSavedSceneries(previous => ({ ...previous, [page]: scenery }));
  };

  const openSceneryModal = (page: SceneryPage) => {
    setSceneryPage(page);
    setIsSceneryModalOpen(true);
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

  const changeSound = (type: AmbientSound) => {
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
        pageSceneries,
        setPageScenery,
        resetBrowserScenery,
        sceneryPage,
        openSceneryModal,
        currentScenery,
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
