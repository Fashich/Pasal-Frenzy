/**
 * CorruptiveHiss — suara partikel koruptif yang dihasilkan prosedural (PRD Bagian XIII).
 * Noise -> bandpass (warna per jenis) -> tremolo -> SpatialSource (HRTF).
 *  - korporasi : kilau metalik (noise putih, Q tinggi, tremolo cepat)
 *  - populis   : diffuse, seperti bisikan (noise merah muda, Q rendah)
 *  - eksekutif : gemuruh rendah berat
 * Filtering dan pitch mengikuti "corruption intensity" partikel.
 */
import { hissParamsFor, type CorruptiveKind } from '../audioMath.ts';
import type { AudioEngine } from '../AudioEngine.ts';
import type { SpatialSource } from '../SpatialAudio.ts';

export class CorruptiveHiss {
  readonly spatial: SpatialSource;
  private source: AudioBufferSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private tremolo: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private level: GainNode | null = null;
  private intensity: number;

  constructor(
    private readonly engine: AudioEngine,
    readonly kind: CorruptiveKind,
    intensity = 0.5,
  ) {
    this.intensity = intensity;
    this.spatial = engine.createSpatialSource({ refDistance: 2, maxDistance: 45 });
  }

  start(): void {
    const ctx = this.engine.context;
    if (!ctx || this.source) return;
    const p = hissParamsFor(this.kind, this.intensity);

    const src = ctx.createBufferSource();
    src.buffer = this.engine.createNoiseBuffer(p.noise, 2);
    src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = p.center;
    this.filter.Q.value = p.q;

    this.tremolo = ctx.createGain();
    this.tremolo.gain.value = 0.75;
    this.lfo = ctx.createOscillator();
    this.lfo.type = this.kind === 'korporasi' ? 'square' : 'sine';
    this.lfo.frequency.value = p.tremoloHz;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.25;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.tremolo.gain);

    this.level = ctx.createGain();
    this.level.gain.value = 0;

    src.connect(this.filter);
    this.filter.connect(this.tremolo);
    this.tremolo.connect(this.level);
    this.level.connect(this.spatial.input);

    src.start();
    this.lfo.start();
    this.source = src;
    this.level.gain.setTargetAtTime(p.gain, ctx.currentTime, 0.3);
  }

  setIntensity(intensity: number): void {
    this.intensity = Math.min(1, Math.max(0, intensity));
    const ctx = this.engine.context;
    if (!ctx || !this.filter || !this.level || !this.lfo) return;
    const p = hissParamsFor(this.kind, this.intensity);
    const t = ctx.currentTime;
    this.filter.frequency.setTargetAtTime(p.center, t, 0.2);
    this.lfo.frequency.setTargetAtTime(p.tremoloHz, t, 0.2);
    this.level.gain.setTargetAtTime(p.gain, t, 0.2);
  }

  setPosition(x: number, y: number, z: number): void {
    this.spatial.setPosition(x, y, z);
  }

  stop(fadeSeconds = 0.4): void {
    const ctx = this.engine.context;
    if (!ctx || !this.source) return;
    const src = this.source;
    const lfo = this.lfo;
    this.source = null;
    this.lfo = null;
    this.level?.gain.setTargetAtTime(0, ctx.currentTime, fadeSeconds / 3);
    const stopAt = ctx.currentTime + fadeSeconds + 0.05;
    src.stop(stopAt);
    lfo?.stop(stopAt);
    setTimeout(() => this.spatial.dispose(), (fadeSeconds + 0.1) * 1000);
  }
}
