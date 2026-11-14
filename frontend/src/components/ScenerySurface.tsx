'use client';

import { usePathname } from 'next/navigation';
import { getDefaultScenery, getSceneryPage, useAmbient } from '@/contexts/AmbientContext';
import { SceneryVideo } from '@/components/SceneryVideo';

export function ScenerySurface({ children }: { children: React.ReactNode }) {
  const page = getSceneryPage(usePathname());
  const { pageSceneries } = useAmbient();
  const scenery = page && (pageSceneries[page] ?? getDefaultScenery(page));
  const fallback = page && getDefaultScenery(page);
  const image = scenery && (scenery.bgImageUrl || (scenery.videoUrl && fallback ? fallback.bgImageUrl : ''));

  return (
    <div data-cozy-surface={scenery ? '' : undefined} className="relative isolate flex min-h-screen flex-col">
      {scenery && <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#30251d]" style={{
        backgroundImage: scenery.gradientOverlay,
      }}>
        {image && <img key={image} src={image} alt="" referrerPolicy="no-referrer"
          onError={event => { event.currentTarget.hidden = true; }}
          className="absolute inset-0 h-full w-full object-cover object-center" />}
        {scenery.videoUrl && <SceneryVideo src={scenery.videoUrl} className="absolute inset-0 h-full w-full object-cover object-center" />}
        <div className="zenith-scenery-shade absolute inset-0" />
      </div>}
      {children}
    </div>
  );
}
