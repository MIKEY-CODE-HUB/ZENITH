'use client';

import type { ReactNode } from 'react';
import { Palette } from 'lucide-react';
import { useAmbient } from '@/contexts/AmbientContext';
import type { SceneryPage } from '@/lib/sceneries';

export function PageScenery({
  page,
  className,
  children,
}: {
  page: SceneryPage;
  className: string;
  children: ReactNode;
}) {
  const { pageSceneries } = useAmbient();
  const scenery = pageSceneries[page];

  return (
    <div className={`relative isolate ${className}`} data-scenery={scenery?.id}>
      {scenery && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[100svh] bg-cover bg-center [mask-image:linear-gradient(black_55%,transparent)]"
          style={{
            backgroundImage: scenery.bgImageUrl
              ? `${scenery.gradientOverlay}, url("${scenery.bgImageUrl}")`
              : scenery.gradientOverlay,
          }}
        />
      )}
      {children}
    </div>
  );
}

export function CustomizeSceneryButton({ className }: { className: string }) {
  const { setIsSceneryModalOpen } = useAmbient();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => setIsSceneryModalOpen(true)}
      className={className}
    >
      <Palette aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-400" />
      Customize theme
    </button>
  );
}
