/**
 * GavelSynth — ketukan palu hakim yang disintesis, bukan sampel (PRD Bagian XIII).
 * Dua OscillatorNode (fundamental + parsial inharmonik) -> BiquadFilter bandpass
 * -> GainNode envelope perkusif (attack ~2 ms, decay cepat) + transien noise "kayu".
 * Menang: ~80 Hz berat dan final. Kalah: ~200 Hz harsh dan tidak memuaskan.
 */
import { gavelParamsFor } from '../audioMath.ts';
import type { AudioEngine } from '../AudioEngine.ts';

export interface GavelStrikeOptions {
  outcome: 'menang' | 'kalah';
  /** 0..1 kekuatan ketukan */
  velocity?: number;
  /** node tujuan (default: bus SFX ber-reverb) */
  destination?: AudioNode;
  /** jumlah ketukan berurutan (mis. 3 untuk "sidang ditutup") */
  count?: number;
  intervalMs?: number;
}

export class GavelSynth {
  constructor(private readonly engine: AudioEngine) {}

  strike(options: GavelStrikeOptions): void {
    const ctx = this.engine.context;
    if (!ctx) return;
    const count = Math.max(1, options.count ?? 1);
    const interval = (options.intervalMs ?? 260) / 1000;
    for (let i = 0; i < count; i++) {
      this.strikeAt(ctx, ctx.currentTime + i * interval, options);
    }
  }

  private strikeAt(ctx: AudioContext, t0: number, options: GavelStrikeOptions): void {
    const p = gavelParamsFor(options.outcome);
    const velocity = Math.min(1, Math.max(0.05, options.velocity ?? 0.9));
    const dest = options.destination ?? this.engine.sfx;
    const decay = p.decayMs / 1000;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(p.fundamental * 1.6, t0);
    osc1.frequency.exponentialRampToValueAtTime(p.fundamental, t0 + 0.03);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(p.partial, t0);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = p.fundamental * 2.2;
    filter.Q.value = p.filterQ;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(velocity, t0 + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(dest);

    // transien noise pendek: kontak kayu
    const clickBuffer = this.engine.createNoiseBuffer('putih', 0.05);
    const click = ctx.createBufferSource();
    click.buffer = clickBuffer;
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'highpass';
    clickFilter.frequency.value = options.outcome === 'menang' ? 1800 : 3200;
    const clickEnv = ctx.createGain();
    clickEnv.gain.setValueAtTime(p.clickLevel * velocity, t0);
    clickEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
    click.connect(clickFilter);
    clickFilter.connect(clickEnv);
    clickEnv.connect(dest);

    osc1.start(t0);
    osc2.start(t0);
    click.start(t0);
    const stop = t0 + decay + 0.05;
    osc1.stop(stop);
    osc2.stop(stop);
    click.stop(t0 + 0.05);
  }
}
