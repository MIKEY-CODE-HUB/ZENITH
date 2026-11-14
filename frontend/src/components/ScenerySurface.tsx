'use client';

import { type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { getDefaultScenery, getSceneryPage, useAmbient } from '@/contexts/AmbientContext';
import { SceneryVideo } from '@/components/SceneryVideo';

export function ScenerySurface({ children }: { children: React.ReactNode }) {
  const page = getSceneryPage(usePathname());
  const { pageSceneries, isSceneryModalOpen } = useAmbient();
  const scenery = page && (pageSceneries[page] ?? getDefaultScenery(page));
  const fallback = page && getDefaultScenery(page);
  const fallbackImage = fallback && fallback.bgImageUrl;
  const image = scenery && (scenery.bgImageUrl || (scenery.videoUrl ? fallbackImage : ''));

  return (
    <div data-cozy-surface={page || undefined} className="relative isolate flex min-h-screen flex-col"
      style={scenery ? { '--zenith-scene-accent': scenery.accentColor } as CSSProperties : undefined}>
      {scenery && <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#30251d]" style={{
        backgroundImage: scenery.gradientOverlay,
      }}>
        {image && <img key={image} src={image} alt="" fetchPriority="high" decoding="async" referrerPolicy="no-referrer"
          onError={event => {
            const element = event.currentTarget;
            if (fallbackImage && image !== fallbackImage && !element.dataset.fallback) {
              element.dataset.fallback = 'true';
              element.src = fallbackImage;
            } else element.hidden = true;
          }}
          className="absolute inset-0 h-full w-full object-cover object-center" />}
        {scenery.videoUrl && <SceneryVideo src={scenery.videoUrl} paused={isSceneryModalOpen} className="absolute inset-0 h-full w-full object-cover object-center" />}
        <div className="zenith-scenery-shade absolute inset-0" />
      </div>}
      {children}
    </div>
  );
}
