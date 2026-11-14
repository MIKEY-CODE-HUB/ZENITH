'use client';

import { type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { getDefaultScenery, getSceneryPage, useAmbient } from '@/contexts/AmbientContext';
import { AtmosphericScene } from '@/components/AtmosphericScene';

export function ScenerySurface({ children }: { children: React.ReactNode }) {
  const page = getSceneryPage(usePathname());
  const { pageSceneries, isSceneryModalOpen } = useAmbient();
  const fallback = page ? getDefaultScenery(page) : undefined;
  const scenery = page ? pageSceneries[page] ?? fallback : undefined;

  return (
    <div data-cozy-surface={page || undefined} className="relative isolate flex min-h-screen flex-col"
      style={scenery ? { '--zenith-scene-accent': scenery.accentColor } as CSSProperties : undefined}>
      {scenery && <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#30251d]">
        <AtmosphericScene scene={scenery} fallbackImage={fallback?.bgImageUrl} priority paused={isSceneryModalOpen} />
        <div className="zenith-scenery-shade absolute inset-0" />
      </div>}
      {children}
    </div>
  );
}
