import { COZY_THEMES, cozyGradient, getCozySceneMood, type CozySceneMood } from './cozyThemes';
import { MOTION_SCENERIES, parseSceneryUrl } from './sceneryMedia';
import type { AmbientSound } from './ambientAudio';

export interface Scenery {
  id: string;
  name: string;
  tagline: string;
  category: string;
  bgImageUrl: string;
  videoUrl?: string;
  mood?: CozySceneMood;
  gradientOverlay: string;
  defaultSound: AmbientSound;
  accentColor: string;
}

export const SCENERIES: Scenery[] = [
  {
    id: 'rainy-cafe',
    name: 'Rainy Cafe & Window',
    tagline: 'Gentle raindrops on glass, warm lamp glow and soft coffee aroma',
    category: 'Cozy',
    bgImageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1920&q=80&auto=format&fit=crop',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(10,12,16,0.65) 0%, rgba(6,7,10,0.92) 100%)',
    defaultSound: 'rain',
    accentColor: '#38bdf8',
  },
  {
    id: 'tokyo-midnight',
    name: 'Tokyo Midnight Lofi',
    tagline: 'Quiet desk in the city, neon twilight and chilled study flow',
    category: 'Lofi',
    bgImageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&q=80&auto=format&fit=crop',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(12,10,24,0.6) 0%, rgba(8,6,16,0.94) 100%)',
    defaultSound: 'alpha',
    accentColor: '#a78bfa',
  },
  {
    id: 'cabin-fireplace',
    name: 'Cabin Fireplace Hearth',
    tagline: 'Crackling rustic hearth, cedar timbers and cozy mountain stillness',
    category: 'Cozy',
    bgImageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1920&q=80&auto=format&fit=crop',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(20,12,8,0.55) 0%, rgba(10,6,4,0.92) 100%)',
    defaultSound: 'fire',
    accentColor: '#fb923c',
  },
  {
    id: 'nordic-forest',
    name: 'Misty Nordic Pines',
    tagline: 'Evergreen branches veiled in dawn mist and cool highland air',
    category: 'Nature',
    bgImageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80&auto=format&fit=crop',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(8,16,12,0.6) 0%, rgba(5,10,8,0.92) 100%)',
    defaultSound: 'forest',
    accentColor: '#34d399',
  },
  {
    id: 'oxford-library',
    name: 'Oxford Vaulted Library',
    tagline: 'Ancient mahogany tomes, green glass banker lamps and cathedral quiet',
    category: 'Dark Academia',
    bgImageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&q=80&auto=format&fit=crop',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(14,12,10,0.6) 0%, rgba(7,6,5,0.93) 100%)',
    defaultSound: 'cafe',
    accentColor: '#facc15',
  },
  {
    id: 'sunset-horizon',
    name: 'Golden Hour Dusk',
    tagline: 'Warm horizon gradient, fading daylight and peaceful evening reflection',
    category: 'Lofi',
    bgImageUrl: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1920&q=80&auto=format&fit=crop',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(18,12,20,0.55) 0%, rgba(8,6,12,0.92) 100%)',
    defaultSound: 'alpha',
    accentColor: '#f472b6',
  },
  {
    id: 'obsidian-minimal',
    name: 'Obsidian Minimal',
    tagline: 'Distraction-free pure zinc canvas, precision focus with zero clutter',
    category: 'Minimal',
    bgImageUrl: '',
    gradientOverlay: 'radial-gradient(ellipse at top, #141418 0%, #09090b 100%)',
    defaultSound: 'alpha',
    accentColor: '#10b981',
  },
];

SCENERIES.unshift(...COZY_THEMES.map(theme => ({
  id: theme.id, name: theme.name, tagline: getCozySceneMood(theme.art)?.label ?? theme.group, category: theme.group,
  mood: getCozySceneMood(theme.art),
  bgImageUrl: theme.art ? `/scenery/${theme.art}.webp` : '',
  gradientOverlay: cozyGradient(theme.glow, theme.base),
  defaultSound: theme.art === 'rain' ? 'rain' as const : 'white' as const,
  accentColor: theme.glow,
})));

export function customScenery(value: string): Scenery | null {
  const media = parseSceneryUrl(value);
  if (!media) return null;
  return {
    id: 'custom', name: 'Custom background', category: 'Custom', tagline: '',
    bgImageUrl: media.kind === 'image' ? media.url : '',
    videoUrl: media.kind === 'video' ? media.url : undefined,
    gradientOverlay: cozyGradient('#986a45', '#33271f'),
    defaultSound: 'rain', accentColor: '#b68966',
  };
}

SCENERIES.unshift(...MOTION_SCENERIES.map(theme => ({
  id: theme.id, name: theme.name, category: 'Video', tagline: 'Looping video',
  mood: getCozySceneMood(theme.art),
  bgImageUrl: `/scenery/${theme.art}.webp`, videoUrl: `/scenery/${theme.art}-motion.mp4`,
  gradientOverlay: cozyGradient(theme.tint, '#29201c'),
  defaultSound: 'rain' as const, accentColor: theme.tint,
})));
