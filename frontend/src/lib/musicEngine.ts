'use client';

export interface Track {
  id: string;
  title: string;
  artist: string;
  category: 'Lo-fi' | 'Deep Focus' | 'Classical' | 'Electronic' | 'Workout' | 'Chill';
  audioUrl: string;
  duration: number; // in seconds
  coverUrl: string;
}

export interface MusicProvider {
  name: string;
  isConnected(): boolean;
  getCurrentTrack(): Track | null;
  play(trackId?: string): Promise<void>;
  pause(): void;
  next(): void;
  previous(): void;
  setVolume(vol: number): void;
}

export const ZENITH_TRACKS: Track[] = [
  {
    id: 'zenith-lofi-1',
    title: 'Rainy Tokyo Midnight',
    artist: 'Zenith Sound Lab',
    category: 'Lo-fi',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    duration: 147,
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'zenith-ambient-2',
    title: 'Deep Focus Alpha Waves',
    artist: 'NeuroFlow Acoustics',
    category: 'Deep Focus',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    duration: 180,
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'zenith-classical-3',
    title: 'Nocturne Study in E Minor',
    artist: 'Imperial Conservatory',
    category: 'Classical',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=classical-piano-melody-10025.mp3',
    duration: 135,
    coverUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'zenith-synth-4',
    title: 'Cyberpunk Momentum Flow',
    artist: 'Zenith Labs High-Speed',
    category: 'Electronic',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=electronic-future-beats-117997.mp3',
    duration: 160,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80',
  },
];

class ZenithMusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentTrackIndex: number = 0;
  private isPlayingState: boolean = false;
  private volumeLevel: number = 0.5;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.volume = this.volumeLevel;
      this.audio.src = ZENITH_TRACKS[0].audioUrl;

      this.audio.addEventListener('ended', () => {
        this.next();
      });

      this.audio.addEventListener('play', () => {
        this.isPlayingState = true;
        this.notify();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlayingState = false;
        this.notify();
      });
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getCurrentTrack(): Track {
    return ZENITH_TRACKS[this.currentTrackIndex];
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getVolume(): number {
    return Math.round(this.volumeLevel * 100);
  }

  public setVolume(volPercent: number) {
    this.volumeLevel = Math.max(0, Math.min(100, volPercent)) / 100;
    if (this.audio) {
      this.audio.volume = this.volumeLevel;
    }
    this.notify();
  }

  public async togglePlay() {
    if (!this.audio) return;
    if (this.isPlayingState) {
      this.audio.pause();
    } else {
      try {
        await this.audio.play();
      } catch (err) {
        console.warn('Autoplay restricted by browser:', err);
      }
    }
  }

  public async playTrack(index: number) {
    if (!this.audio) return;
    if (index >= 0 && index < ZENITH_TRACKS.length) {
      this.currentTrackIndex = index;
      this.audio.src = ZENITH_TRACKS[index].audioUrl;
      try {
        await this.audio.play();
      } catch (err) {
        console.warn('Play error:', err);
      }
      this.notify();
    }
  }

  public next() {
    const nextIdx = (this.currentTrackIndex + 1) % ZENITH_TRACKS.length;
    this.playTrack(nextIdx);
  }

  public previous() {
    const prevIdx = (this.currentTrackIndex - 1 + ZENITH_TRACKS.length) % ZENITH_TRACKS.length;
    this.playTrack(prevIdx);
  }

  public stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.isPlayingState = false;
    this.notify();
  }
}

export const musicPlayer = new ZenithMusicPlayer();
