'use client';

/**
 * 🎧 Web Audio API Synthesizer for Realistic Study Ambient Soundscapes
 * 100% Client-Side, Zero External Dependencies, Works Offline
 */

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: { stop: () => void }[] = [];
  private currentType: 'rain' | 'fire' | 'cafe' | 'forest' | 'alpha' | null = null;
  private isPlaying = false;
  private volume = 0.4;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
  }

  // Create White/Pink Noise Buffer
  private createNoiseBuffer(duration = 5, isPink = false): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (isPink) {
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
    } else {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return buffer;
  }

  // 1. 🌧️ RAIN SOUNDSCAPE
  private startRain() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer(5, true);
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // Dual-stage lowpass filter for soft window raindrops
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    // Highpass to eliminate harsh sub-bass rumble
    const hpFilter = this.ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(150, this.ctx.currentTime);

    // Subtle LFO modulation for rain wind swell
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noiseSource.connect(filter);
    filter.connect(hpFilter);
    hpFilter.connect(this.masterGain);

    noiseSource.start();
    lfo.start();

    this.activeNodes.push({
      stop: () => {
        try {
          noiseSource.stop();
          lfo.stop();
        } catch (e) {}
      },
    });
  }

  // 2. 🔥 FIREPLACE CRACKLE
  private startFire() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer(4, true);
    if (!buffer) return;

    // Warm hearth base rumble
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(this.masterGain);
    noiseSource.start();

    // Stochastic wood crackle clicks
    let crackleTimer: any = null;
    const playCrackle = () => {
      if (!this.ctx || !this.masterGain) return;
      try {
        const osc = this.ctx.createOscillator();
        const crackleGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 + Math.random() * 800, this.ctx.currentTime);
        crackleGain.gain.setValueAtTime(0.08 + Math.random() * 0.12, this.ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

        osc.connect(crackleGain);
        crackleGain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
      } catch (e) {}

      const nextInterval = 80 + Math.random() * 350;
      crackleTimer = setTimeout(playCrackle, nextInterval);
    };

    playCrackle();

    this.activeNodes.push({
      stop: () => {
        try {
          noiseSource.stop();
          if (crackleTimer) clearTimeout(crackleTimer);
        } catch (e) {}
      },
    });
  }

  // 3. ☕ CAFE AMBIENCE
  private startCafe() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer(5, true);
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    // Warm ambient coffeehouse hum
    const hum = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();
    hum.type = 'sine';
    hum.frequency.setValueAtTime(120, this.ctx.currentTime);
    humGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    hum.connect(humGain);
    humGain.connect(this.masterGain);
    noiseSource.connect(filter);
    filter.connect(this.masterGain);

    hum.start();
    noiseSource.start();

    this.activeNodes.push({
      stop: () => {
        try {
          noiseSource.stop();
          hum.stop();
        } catch (e) {}
      },
    });
  }

  // 4. 🌲 NORDIC FOREST WIND
  private startForest() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createNoiseBuffer(6, true);
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(200, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noiseSource.connect(filter);
    filter.connect(this.masterGain);

    noiseSource.start();
    lfo.start();

    this.activeNodes.push({
      stop: () => {
        try {
          noiseSource.stop();
          lfo.stop();
        } catch (e) {}
      },
    });
  }

  // 5. 🧠 BINAURAL 40Hz DEEP ALPHA FOCUS
  private startAlpha() {
    if (!this.ctx || !this.masterGain) return;

    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();
    const gainLeft = this.ctx.createGain();
    const gainRight = this.ctx.createGain();

    // Base carrier 196Hz + 40Hz binaural beat offset
    oscLeft.frequency.setValueAtTime(196, this.ctx.currentTime);
    oscRight.frequency.setValueAtTime(236, this.ctx.currentTime);

    gainLeft.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gainRight.gain.setValueAtTime(0.08, this.ctx.currentTime);

    oscLeft.connect(gainLeft);
    oscRight.connect(gainRight);
    gainLeft.connect(this.masterGain);
    gainRight.connect(this.masterGain);

    // Warm brown noise underlay
    const buffer = this.createNoiseBuffer(5, true);
    if (buffer) {
      const brown = this.ctx.createBufferSource();
      brown.buffer = buffer;
      brown.loop = true;
      const bFilter = this.ctx.createBiquadFilter();
      bFilter.type = 'lowpass';
      bFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
      brown.connect(bFilter);
      bFilter.connect(this.masterGain);
      brown.start();
      this.activeNodes.push({ stop: () => { try { brown.stop(); } catch (e) {} } });
    }

    oscLeft.start();
    oscRight.start();

    this.activeNodes.push({
      stop: () => {
        try {
          oscLeft.stop();
          oscRight.stop();
        } catch (e) {}
      },
    });
  }

  public play(type: 'rain' | 'fire' | 'cafe' | 'forest' | 'alpha') {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.stop();

    this.currentType = type;
    this.isPlaying = true;

    switch (type) {
      case 'rain':
        this.startRain();
        break;
      case 'fire':
        this.startFire();
        break;
      case 'cafe':
        this.startCafe();
        break;
      case 'forest':
        this.startForest();
        break;
      case 'alpha':
        this.startAlpha();
        break;
    }
  }

  public stop() {
    this.activeNodes.forEach((node) => node.stop());
    this.activeNodes = [];
    this.isPlaying = false;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      currentType: this.currentType,
      volume: this.volume,
    };
  }
}

export const ambientSound = new AmbientSoundEngine();
