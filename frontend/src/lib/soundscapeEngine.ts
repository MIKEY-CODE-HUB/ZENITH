'use client';

export type SoundLayerId =
  | 'rain'
  | 'ocean'
  | 'brown-noise'
  | 'fireplace'
  | 'wind'
  | 'cafe'
  | 'white-noise';

export interface SoundLayerConfig {
  id: SoundLayerId;
  name: string;
  icon: string;
  description: string;
}

export const SOUND_LAYERS: SoundLayerConfig[] = [
  { id: 'rain', name: 'Rain on Glass', icon: '🌧️', description: 'Gentle steady rainfall with distant soft drops' },
  { id: 'brown-noise', name: 'Brown Noise', icon: '🌊', description: 'Deep, smooth, low-frequency focus hum' },
  { id: 'ocean', name: 'Ocean Swell', icon: '🌊', description: 'Rhythmic rhythmic breakers and retreating foam' },
  { id: 'fireplace', name: 'Cabin Fire', icon: '🔥', description: 'Warm crackling embers and glowing hearth' },
  { id: 'wind', name: 'Highland Wind', icon: '🍃', description: 'Soft breeze blowing through alpine evergreens' },
  { id: 'cafe', name: 'Warm Cafe', icon: '☕', description: 'Comforting artisan coffee shop background hum' },
  { id: 'white-noise', name: 'White Noise', icon: '📻', description: 'Broad spectrum acoustic distraction masking' },
];

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private layers: Map<SoundLayerId, { gain: GainNode; sourceNode?: AudioNode; cleanup?: () => void }> = new Map();
  private volumes: Record<SoundLayerId, number> = {
    rain: 0,
    'brown-noise': 0,
    ocean: 0,
    fireplace: 0,
    wind: 0,
    cafe: 0,
    'white-noise': 0,
  };
  private isMasterMuted: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(id: SoundLayerId, volume: number) {
    this.volumes[id] = Math.max(0, Math.min(100, volume));
    this.initContext();

    if (!this.ctx || !this.masterGain) return;

    if (volume > 0) {
      if (!this.layers.has(id)) {
        this.startLayer(id);
      }
      const layer = this.layers.get(id);
      if (layer) {
        layer.gain.gain.setTargetAtTime(volume / 100, this.ctx.currentTime, 0.05);
      }
    } else {
      const layer = this.layers.get(id);
      if (layer) {
        layer.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
    }
  }

  public getVolume(id: SoundLayerId): number {
    return this.volumes[id] || 0;
  }

  public getAllVolumes(): Record<SoundLayerId, number> {
    return { ...this.volumes };
  }

  public toggleMute() {
    this.initContext();
    this.isMasterMuted = !this.isMasterMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMasterMuted ? 0 : 1.0, this.ctx.currentTime, 0.05);
    }
    return this.isMasterMuted;
  }

  public isMuted() {
    return this.isMasterMuted;
  }

  private startLayer(id: SoundLayerId) {
    if (!this.ctx || !this.masterGain) return;

    const layerGain = this.ctx.createGain();
    layerGain.gain.setValueAtTime((this.volumes[id] || 0) / 100, this.ctx.currentTime);
    layerGain.connect(this.masterGain);

    if (id === 'brown-noise' || id === 'white-noise') {
      const bufferSize = 2 * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (id === 'brown-noise') {
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5; // Gain compensation
        } else {
          data[i] = white * 0.15;
        }
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(layerGain);
      noise.start(0);

      this.layers.set(id, { gain: layerGain, sourceNode: noise });
    } else if (id === 'rain') {
      // Pink/filtered noise + lowpass
      const bufferSize = 2 * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(filter);
      filter.connect(layerGain);
      noise.start(0);

      this.layers.set(id, { gain: layerGain, sourceNode: noise });
    } else if (id === 'ocean') {
      // Modulated brown noise simulating ocean tide swells
      const bufferSize = 3 * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.0;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const swellFilter = this.ctx.createBiquadFilter();
      swellFilter.type = 'lowpass';
      swellFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

      // Slow LFO for tide rise and fall
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // 8-second cycle
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(300, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(swellFilter.frequency);

      lfo.start(0);
      noise.connect(swellFilter);
      swellFilter.connect(layerGain);
      noise.start(0);

      this.layers.set(id, { gain: layerGain, sourceNode: noise });
    } else if (id === 'fireplace') {
      // Low warm rumble + crackle
      const bufferSize = 2 * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const rumble = (lastOut + 0.03 * white) / 1.03;
        lastOut = rumble;
        // occasional random crackle pops
        const crackle = Math.random() > 0.998 ? (Math.random() - 0.5) * 1.5 : 0;
        data[i] = rumble * 1.8 + crackle;
      }

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(filter);
      filter.connect(layerGain);
      noise.start(0);

      this.layers.set(id, { gain: layerGain, sourceNode: noise });
    } else if (id === 'wind') {
      const bufferSize = 2 * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.2;
      }

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(filter);
      filter.connect(layerGain);
      noise.start(0);

      this.layers.set(id, { gain: layerGain, sourceNode: noise });
    } else if (id === 'cafe') {
      // Multi-layer warm acoustic hum
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc2.frequency.setValueAtTime(210, this.ctx.currentTime);
      osc1.type = 'triangle';
      osc2.type = 'sine';

      const humGain = this.ctx.createGain();
      humGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      osc1.connect(humGain);
      osc2.connect(humGain);
      humGain.connect(layerGain);

      osc1.start(0);
      osc2.start(0);

      this.layers.set(id, { gain: layerGain, sourceNode: humGain });
    }
  }

  public stopAll() {
    for (const [id, layer] of this.layers.entries()) {
      if (layer.cleanup) layer.cleanup();
      try {
        if (layer.sourceNode && (layer.sourceNode as any).stop) {
          (layer.sourceNode as any).stop();
        }
      } catch (e) {}
    }
    this.layers.clear();
    for (const key of Object.keys(this.volumes)) {
      this.volumes[key as SoundLayerId] = 0;
    }
  }
}

export const soundscapeEngine = new SoundscapeEngine();
