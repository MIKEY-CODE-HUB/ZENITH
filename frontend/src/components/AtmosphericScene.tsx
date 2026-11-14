'use client';

import type { CSSProperties } from 'react';
import type { Scenery } from '@/lib/sceneries';
import { SceneryVideo } from '@/components/SceneryVideo';

type Scene = Pick<Scenery, 'bgImageUrl' | 'videoUrl' | 'gradientOverlay' | 'accentColor' | 'mood'>;

export function AtmosphericScene({ scene, fallbackImage, priority = false, paused = false, still = false }: {
  scene: Scene;
  fallbackImage?: string;
  priority?: boolean;
  paused?: boolean;
  still?: boolean;
}) {
  const image = scene.bgImageUrl || (scene.videoUrl ? fallbackImage : undefined);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" data-scene={scene.mood?.effect}
      data-scene-paused={paused || undefined}
      style={{
        backgroundImage: scene.gradientOverlay,
        '--scene-tint': scene.accentColor,
        '--scene-light-position': scene.mood?.position,
      } as CSSProperties}>
      {image && (
        <img key={image} src={image} alt="" decoding="async" fetchPriority={priority ? 'high' : undefined}
          referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover"
          onError={event => {
            const element = event.currentTarget;
            if (fallbackImage && image !== fallbackImage && !element.dataset.fallback) {
              element.dataset.fallback = 'true';
              element.src = fallbackImage;
            } else {
              element.hidden = true;
            }
          }} />
      )}
      {!still && scene.videoUrl && <SceneryVideo src={scene.videoUrl} paused={paused} className="absolute inset-0 h-full w-full object-cover" />}
      {scene.mood && <>
        <div className="zenith-scene-light" />
        {!still && !scene.videoUrl && <div className="zenith-scene-motion" />}
      </>}
    </div>
  );
}
