/**
 * AudioEngine — singleton Web Audio API (PRD Bagian XIII, Dev Planning 08).
 *
 * Graf: sumber -> (dry) --------------------------------\
 *                -> ConvolverNode[env] -> wetGain[env] --+-> DynamicsCompressor -> master -> destination
 *
 * - AudioContext diinisialisasi setelah gesture pengguna pertama (unlock()).
 * - Tiga ConvolverNode dengan impulse response SINTETIS (ruang sidang, koridor
 *   digital, ruang krisis eksekutif); crossfade antar lingkungan.
 * - DynamicsCompressorNode mencegah clipping saat intensitas tinggi.
 * - SpatialSource (PannerNode HRTF) untuk suara berposisi 3D.
 * - Volume master/sfx/mute mengikuti audioSlice store.
 * - AnalyserNode di master untuk verifikasi & telemetri (RMS keluaran).
 */
import {
  constitutionalBus,
  type ConstitutionalEventBus,
} from '@core/engine/ConstitutionalEventBus.ts';
import { constitutionalStore, type ConstitutionalStore } from '@core/store/ConstitutionalStore.ts';
import { createImpulseBuffer, type EnvironmentName } from './impulse.ts';
import {
  SpatialSource,
  updateListenerFromCamera,
  type SpatialSourceOptions,
} from './SpatialAudio.ts';

export interface AudioEngineOptions {
  store?: ConstitutionalStore;
  bus?: ConstitutionalEventBus;
  /** latency hint; 'interactive' untuk game */
  latencyHint?: AudioContextLatencyCategory;
}

interface EnvironmentChain {
  convolver: ConvolverNode;
  wet: GainNode;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  static get(): AudioEngine {
    AudioEngine.instance ??= new AudioEngine();
    return AudioEngine.instance;
  }

  readonly store: ConstitutionalStore;
  readonly bus: ConstitutionalEventBus;
  private readonly latencyHint: AudioContextLatencyCategory;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private dry: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Float32Array<ArrayBuffer> | null = null;
  private environments: Partial<Record<EnvironmentName, EnvironmentChain>> = {};
  private currentEnvironment: EnvironmentName | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private readonly gestureEvents = ['pointerdown', 'keydown', 'touchstart'] as const;
  private gestureBound = false;
  private readonly onGesture = () => {
    void this.unlock();
  };

  constructor(options: AudioEngineOptions = {}) {
    this.store = options.store ?? constitutionalStore;
    this.bus = options.bus ?? constitutionalBus;
    this.latencyHint = options.latencyHint ?? 'interactive';
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  get isUnlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** node masukan untuk suara dengan reverb lingkungan (dry + wet) */
  get input(): AudioNode {
    return this.ensureGraph().dry;
  }

  /** node masukan tanpa reverb (UI, detak jantung) */
  get direct(): AudioNode {
    return this.ensureGraph().compressor;
  }

  /** bus SFX (mengikuti sfxVolume) yang bermuara ke input ber-reverb */
  get sfx(): AudioNode {
    return this.ensureGraph().sfxBus;
  }

  /** memasang listener gesture agar AudioContext dibuka pada interaksi pertama */
  armAutoUnlock(target: EventTarget = window): void {
    if (this.gestureBound) return;
    this.gestureBound = true;
    for (const ev of this.gestureEvents) {
      target.addEventListener(ev, this.onGesture, { passive: true });
    }
  }

  private disarmAutoUnlock(target: EventTarget = window): void {
    if (!this.gestureBound) return;
    this.gestureBound = false;
    for (const ev of this.gestureEvents) target.removeEventListener(ev, this.onGesture);
  }

  /** membuka AudioContext (harus dari gesture pengguna) */
  async unlock(): Promise<boolean> {
    const g = this.ensureGraph();
    try {
      if (g.ctx.state !== 'running') await g.ctx.resume();
    } catch {
      return false;
    }
    if (g.ctx.state === 'running') {
      this.disarmAutoUnlock();
      this.store.getState().setAudioUnlocked(true);
      return true;
    }
    return false;
  }

  private ensureGraph(): {
    ctx: AudioContext;
    master: GainNode;
    sfxBus: GainNode;
    dry: GainNode;
    compressor: DynamicsCompressorNode;
  } {
    if (this.ctx && this.master && this.sfxBus && this.dry && this.compressor) {
      return {
        ctx: this.ctx,
        master: this.master,
        sfxBus: this.sfxBus,
        dry: this.dry,
        compressor: this.compressor,
      };
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) throw new Error('Web Audio API tidak tersedia');
    const ctx = new AC({ latencyHint: this.latencyHint });
    this.ctx = ctx;

    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;

    compressor.connect(master);
    master.connect(analyser);
    analyser.connect(ctx.destination);

    const dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(compressor);

    const sfxBus = ctx.createGain();
    sfxBus.connect(dry);

    this.master = master;
    this.compressor = compressor;
    this.analyser = analyser;
    this.analyserData = new Float32Array(analyser.fftSize);
    this.dry = dry;
    this.sfxBus = sfxBus;

    for (const name of ['sidang', 'digital', 'krisis'] as const) {
      const convolver = ctx.createConvolver();
      convolver.normalize = true;
      convolver.buffer = createImpulseBuffer(ctx, name);
      const wet = ctx.createGain();
      wet.gain.value = 0;
      dry.connect(convolver);
      convolver.connect(wet);
      wet.connect(compressor);
      this.environments[name] = { convolver, wet };
    }

    this.applyVolumes();
    this.unsubscribeStore?.();
    this.unsubscribeStore = this.store.subscribe(
      (s) => ({ master: s.masterVolume, sfx: s.sfxVolume, muted: s.muted }),
      () => this.applyVolumes(),
      { equalityFn: (a, b) => a.master === b.master && a.sfx === b.sfx && a.muted === b.muted },
    );

    return { ctx, master, sfxBus, dry, compressor };
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.sfxBus) return;
    const s = this.store.getState();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.masterVolume, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfxVolume, t, 0.05);
  }

  /** crossfade ke lingkungan reverb; null = kering */
  setEnvironment(name: EnvironmentName | null, wetLevel = 0.35, seconds = 1.2): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [key, chain] of Object.entries(this.environments) as [
      EnvironmentName,
      EnvironmentChain,
    ][]) {
      const target = key === name ? wetLevel : 0;
      chain.wet.gain.cancelScheduledValues(t);
      chain.wet.gain.setTargetAtTime(target, t, seconds / 3);
    }
    this.currentEnvironment = name;
  }

  get environment(): EnvironmentName | null {
    return this.currentEnvironment;
  }

  createSpatialSource(options?: SpatialSourceOptions): SpatialSource {
    const g = this.ensureGraph();
    return new SpatialSource(g.ctx, g.dry, options);
  }

  updateListener(
    position: { x: number; y: number; z: number },
    forward: { x: number; y: number; z: number },
    up: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 },
  ): void {
    if (!this.ctx) return;
    updateListenerFromCamera(this.ctx, position, forward, up);
  }

  /** RMS keluaran master (0..1) untuk verifikasi dan telemetri */
  getOutputRms(): number {
    if (!this.analyser || !this.analyserData) return 0;
    this.analyser.getFloatTimeDomainData(this.analyserData);
    let acc = 0;
    for (const v of this.analyserData) acc += v * v;
    return Math.sqrt(acc / this.analyserData.length);
  }

  /** buffer noise 2 detik (putih atau merah muda) untuk sumber hiss/whisper */
  createNoiseBuffer(kind: 'putih' | 'merah-muda' = 'putih', seconds = 2): AudioBuffer {
    const g = this.ensureGraph();
    const length = Math.floor(g.ctx.sampleRate * seconds);
    const buffer = g.ctx.createBuffer(1, length, g.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === 'putih') {
        data[i] = white;
      } else {
        // pink noise (Paul Kellet, versi ekonomis)
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.25;
      }
    }
    return buffer;
  }

  async suspend(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend();
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  dispose(): void {
    this.disarmAutoUnlock();
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.dry = null;
    this.compressor = null;
    this.analyser = null;
    this.environments = {};
    if (AudioEngine.instance === this) AudioEngine.instance = null;
  }
}
