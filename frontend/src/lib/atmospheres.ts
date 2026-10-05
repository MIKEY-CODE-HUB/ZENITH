export type AtmosphereCategory =
  | 'TECH'
  | 'ATMOSPHERE'
  | 'LIBRARY / STUDY'
  | 'NIGHT'
  | 'SKY'
  | 'NATURE'
  | 'ABSTRACT';

export interface AtmosphereTheme {
  id: string;
  name: string;
  tagline: string;
  category: AtmosphereCategory;
  bgImageUrl: string;
  effectType: 'rain' | 'particles' | 'cyber-grid' | 'stars' | 'ambient';
  gradientOverlay: string;
  accentColor: string;
  recommendedSound: 'rain' | 'brown-noise' | 'cafe' | 'fireplace' | 'ocean' | 'wind' | 'lofi';
}

export const ATMOSPHERES: AtmosphereTheme[] = [
  // ── TECH ──────────────────────────────────────────
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    tagline: 'Quiet Tokyo high-rise desk overlooking neon twilight',
    category: 'TECH',
    bgImageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&q=80&auto=format&fit=crop',
    effectType: 'cyber-grid',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(12,10,24,0.55) 0%, rgba(6,4,14,0.92) 100%)',
    accentColor: '#818cf8',
    recommendedSound: 'lofi',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Grid',
    tagline: 'Futuristic neon skyline with holographic telemetry lines',
    category: 'TECH',
    bgImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=80&auto=format&fit=crop',
    effectType: 'cyber-grid',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(8,16,28,0.5) 0%, rgba(3,6,12,0.95) 100%)',
    accentColor: '#38bdf8',
    recommendedSound: 'brown-noise',
  },
  {
    id: 'terminal',
    name: 'Terminal Matrix',
    tagline: 'Monochrome dark mode engineering aesthetic',
    category: 'TECH',
    bgImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&q=80&auto=format&fit=crop',
    effectType: 'particles',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(4,14,8,0.55) 0%, rgba(2,6,3,0.94) 100%)',
    accentColor: '#10b981',
    recommendedSound: 'brown-noise',
  },
  {
    id: 'energy-grid',
    name: 'Energy Grid',
    tagline: 'High-intensity athletic cyber grid designed for workouts',
    category: 'TECH',
    bgImageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80&auto=format&fit=crop',
    effectType: 'cyber-grid',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(28,10,12,0.5) 0%, rgba(12,4,6,0.95) 100%)',
    accentColor: '#f43f5e',
    recommendedSound: 'lofi',
  },

  // ── ATMOSPHERE ────────────────────────────────────
  {
    id: 'rainy-window',
    name: 'Rainy Window',
    tagline: 'Slow raindrops beating softly against panoramic glass',
    category: 'ATMOSPHERE',
    bgImageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1920&q=80&auto=format&fit=crop',
    effectType: 'rain',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(10,14,20,0.6) 0%, rgba(4,6,10,0.93) 100%)',
    accentColor: '#38bdf8',
    recommendedSound: 'rain',
  },
  {
    id: 'fireplace',
    name: 'Cabin Fireplace',
    tagline: 'Crackling rustic timber fire in alpine seclusion',
    category: 'ATMOSPHERE',
    bgImageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1920&q=80&auto=format&fit=crop',
    effectType: 'ambient',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(24,12,6,0.55) 0%, rgba(10,5,2,0.94) 100%)',
    accentColor: '#fb923c',
    recommendedSound: 'fireplace',
  },
  {
    id: 'thunderstorm',
    name: 'Midnight Thunder',
    tagline: 'Distant lightning illuminating rain-streaked skylines',
    category: 'ATMOSPHERE',
    bgImageUrl: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=1920&q=80&auto=format&fit=crop',
    effectType: 'rain',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(8,10,16,0.6) 0%, rgba(3,4,8,0.95) 100%)',
    accentColor: '#60a5fa',
    recommendedSound: 'rain',
  },

  // ── LIBRARY / STUDY ───────────────────────────────
  {
    id: 'night-library',
    name: 'Night Library',
    tagline: 'Deep leather tomes, warm green lamps, and unbroken quiet',
    category: 'LIBRARY / STUDY',
    bgImageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&q=80&auto=format&fit=crop',
    effectType: 'ambient',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(16,12,8,0.6) 0%, rgba(6,5,3,0.94) 100%)',
    accentColor: '#eab308',
    recommendedSound: 'cafe',
  },
  {
    id: 'coffee-shop',
    name: 'Artisan Cafe',
    tagline: 'Soft espresso hum, gentle murmurs, and morning rain',
    category: 'LIBRARY / STUDY',
    bgImageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1920&q=80&auto=format&fit=crop',
    effectType: 'ambient',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(16,10,8,0.55) 0%, rgba(7,4,3,0.92) 100%)',
    accentColor: '#d97706',
    recommendedSound: 'cafe',
  },
  {
    id: 'minimal-desk',
    name: 'Minimal Dark Desk',
    tagline: 'Zero clutter, matte concrete surface, focused task lighting',
    category: 'LIBRARY / STUDY',
    bgImageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1920&q=80&auto=format&fit=crop',
    effectType: 'ambient',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(12,12,14,0.6) 0%, rgba(6,6,8,0.95) 100%)',
    accentColor: '#a1a1aa',
    recommendedSound: 'brown-noise',
  },

  // ── NIGHT ─────────────────────────────────────────
  {
    id: 'starry-sky',
    name: 'Starry Sky',
    tagline: 'Infinite cosmic dome above silent midnight mountain peaks',
    category: 'NIGHT',
    bgImageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1920&q=80&auto=format&fit=crop',
    effectType: 'stars',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(8,10,24,0.5) 0%, rgba(3,4,12,0.94) 100%)',
    accentColor: '#c084fc',
    recommendedSound: 'wind',
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    tagline: 'Ribbons of luminescent emerald dancing across subarctic skies',
    category: 'NIGHT',
    bgImageUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80&auto=format&fit=crop',
    effectType: 'ambient',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(6,18,16,0.5) 0%, rgba(2,8,6,0.94) 100%)',
    accentColor: '#34d399',
    recommendedSound: 'wind',
  },

  // ── SKY ───────────────────────────────────────────
  {
    id: 'cloudy-sky',
    name: 'Cloudy Sky & Dawn',
    tagline: 'Drifting stratospheric sea of morning vapor and cool air',
    category: 'SKY',
    bgImageUrl: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1920&q=80&auto=format&fit=crop',
    effectType: 'ambient',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(12,16,24,0.55) 0%, rgba(5,7,12,0.92) 100%)',
    accentColor: '#93c5fd',
    recommendedSound: 'wind',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour Horizon',
    tagline: 'Warm amber dusk gently dissolving into evening quiet',
    category: 'SKY',
    bgImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80&auto=format&fit=crop',
    effectType: 'ambient',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(24,14,10,0.5) 0%, rgba(10,5,4,0.93) 100%)',
    accentColor: '#f59e0b',
    recommendedSound: 'ocean',
  },

  // ── NATURE ────────────────────────────────────────
  {
    id: 'misty-forest',
    name: 'Misty Nordic Pines',
    tagline: 'Evergreen branches veiled in dawn mist and cool highland air',
    category: 'NATURE',
    bgImageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80&auto=format&fit=crop',
    effectType: 'ambient',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(8,16,12,0.6) 0%, rgba(3,7,5,0.93) 100%)',
    accentColor: '#10b981',
    recommendedSound: 'wind',
  },
  {
    id: 'ocean-waves',
    name: 'Pacific Ocean Swell',
    tagline: 'Rhythmic deep tide waves against basalt cliffs',
    category: 'NATURE',
    bgImageUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80&auto=format&fit=crop',
    effectType: 'ambient',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(8,16,24,0.55) 0%, rgba(3,7,12,0.94) 100%)',
    accentColor: '#38bdf8',
    recommendedSound: 'ocean',
  },

  // ── ABSTRACT ──────────────────────────────────────
  {
    id: 'deep-space',
    name: 'Deep Space Nebula',
    tagline: 'Weightless floating particles across interstellar dust',
    category: 'ABSTRACT',
    bgImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80&auto=format&fit=crop',
    effectType: 'particles',
    gradientOverlay: 'radial-gradient(ellipse at center, rgba(14,8,24,0.55) 0%, rgba(5,2,10,0.95) 100%)',
    accentColor: '#a855f7',
    recommendedSound: 'brown-noise',
  },
];

export function getAtmosphereById(id: string): AtmosphereTheme {
  const found = ATMOSPHERES.find((a) => a.id === id || a.name.toLowerCase() === id.toLowerCase());
  return found || ATMOSPHERES[0];
}
