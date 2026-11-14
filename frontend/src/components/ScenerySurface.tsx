'use client';

import { usePathname } from 'next/navigation';
import { getSceneryPage, useAmbient, type SceneryPage } from '@/contexts/AmbientContext';
import { SCENERIES } from '@/lib/sceneries';

const defaults: Record<SceneryPage, string> = {
  home: 'walnut-window',
  dashboard: 'moss-library',
  rooms: 'tea-at-dusk',
  leaderboard: 'violet-lake',
  workspace: 'linen-desk',
};

export function ScenerySurface({ children }: { children: React.ReactNode }) {
  const page = getSceneryPage(usePathname());
  const { pageSceneries } = useAmbient();
  const scenery = page && (pageSceneries[page] ?? SCENERIES.find(item => item.id === defaults[page]));
  if (!scenery) return <div className="flex-1">{children}</div>;

  return (
    <div className="relative isolate flex-1">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: scenery.bgImageUrl
          ? `linear-gradient(120deg, ${scenery.accentColor}24, transparent), linear-gradient(180deg, #14111090, #13100fe8), url("${scenery.bgImageUrl}")`
          : scenery.gradientOverlay }} />
      {children}
    </div>
  );
}
