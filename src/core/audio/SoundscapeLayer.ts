/**
 * ResponsiveSoundscape — tidak ada musik latar looping (PRD Bagian XIII).
 * Tiga lapisan audio yang bereaksi real-time terhadap state game:
 *
 *  ConstitutionalFoundation : drone rendah 110 Hz -> 82.5 Hz mengikuti integritas
 *  CrisisLayer              : parsial disonan + noise band, aktif saat integritas < 0.4
 *  FrenzyLayer              : pulsa ritmis 130 BPM + sub yang naik, aktif saat Mode Frenzy
 *
 * update(dt, state) dipanggil tiap frame; semua perubahan lewat setTargetAtTime
 * agar halus. Lapisan aktif dicerminkan ke audioSlice (activeLayers).
 */
import { crisisLevelFor, droneFrequencyFor } from './audioMath.ts';
import type { AudioEngine } from './AudioEngine.ts';
import type { ConstitutionalState } from '@core/store/types.ts';

interface FoundationNodes {
  oscs: OscillatorNode[];
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  gain: GainNode;
}

interface CrisisNodes {
  oscs: OscillatorNode[];
  noise: AudioBufferSourceNode;
  noiseFilter: BiquadFilterNode;
  tremolo: GainNode;
  lfo: OscillatorNode;
  gain: GainNode;
}

interface FrenzyNodes {
  sub: OscillatorNode;
  subGain: GainNode;
  gain: GainNode;
  timer: ReturnType<typeof setInterval>;
}

export const FRENZY_BPM = 130;

export class ResponsiveSoundscape {
  private foundation: FoundationNodes | null = null;
  private crisis: CrisisNodes | null = null;
  private frenzy: FrenzyNodes | null = null;
  private frenzyNextPulse = 0;
  private started = false;

  constructor(private readonly engine: AudioEngine) {}

  get isRunning(): boolean {
    return this.started;
  }

  start(): void {
    const ctx = this.engine.context;
    if (!ctx || this.started) return;
    this.started = true;
    this.buildFoundation(ctx);
    this.buildCrisis(ctx);
    this.engine.store.getState().setLayer('foundation', true);
  }

  private buildFoundation(ctx: AudioContext): void {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 0.8;
    const detunes = [-7, 0, 6];
    const oscs = detunes.map((d) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = droneFrequencyFor(1);
      o.detune.value = d;
      const g = ctx.createGain();
      g.gain.value = 0.11;
      o.connect(g);
      g.connect(filter);
      o.start();
      return o;
    });
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    filter.connect(gain);
    gain.connect(this.engine.input);
    gain.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5);
    this.foundation = { oscs, filter, lfo, gain };
  }

  private buildCrisis(ctx: AudioContext): void {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    // parsial disonan (tritone dan detik minor terhadap drone)
    const ratios = [1.414, 2.12, 2.83];
    const oscs = ratios.map((r) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = droneFrequencyFor(1) * r;
      const g = ctx.createGain();
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(gain);
      o.start();
      return o;
    });
    const noise = ctx.createBufferSource();
    noise.buffer = this.engine.createNoiseBuffer('merah-muda', 3);
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1400;
    noiseFilter.Q.value = 2.5;
    const tremolo = ctx.createGain();
    tremolo.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.35;
    lfo.connect(lfoGain);
    lfoGain.connect(tremolo.gain);
    noise.connect(noiseFilter);
    noiseFilter.connect(tremolo);
    tremolo.connect(gain);
    noise.start();
    lfo.start();
    gain.connect(this.engine.input);
    this.crisis = { oscs, noise, noiseFilter, tremolo, lfo, gain };
  }

  private buildFrenzy(ctx: AudioContext): void {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.engine.direct);
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 41;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.22;
    sub.connect(subGain);
    subGain.connect(gain);
    sub.start();
    this.frenzyNextPulse = ctx.currentTime + 0.05;
    const beat = 60 / FRENZY_BPM;
    const schedule = () => {
      const c = this.engine.context;
      if (!c) return;
      const now = c.currentTime;
      while (this.frenzyNextPulse < now + 0.4) {
        const accent = Math.random() < 0.28;
        this.pulse(c, this.frenzyNextPulse, accent ? 1 : 0.55, gain);
        this.frenzyNextPulse += accent ? beat / 2 : beat;
      }
    };
    schedule();
    const timer = setInterval(schedule, 100);
    gain.gain.setTargetAtTime(0.7, ctx.currentTime, 0.4);
    this.frenzy = { sub, subGain, gain, timer };
  }

  private pulse(ctx: AudioContext, t0: number, level: number, dest: AudioNode): void {
    const src = ctx.createBufferSource();
    src.buffer = this.engine.createNoiseBuffer('putih', 0.12);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900 + Math.random() * 900;
    filter.Q.value = 4;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(0.5 * level, t0 + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    src.connect(filter);
    filter.connect(env);
    env.connect(dest);
    src.start(t0);
    src.stop(t0 + 0.12);
  }

  private stopFrenzy(): void {
    const ctx = this.engine.context;
    if (!ctx || !this.frenzy) return;
    const f = this.frenzy;
    this.frenzy = null;
    clearInterval(f.timer);
    f.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    const stopAt = ctx.currentTime + 1.2;
    f.sub.stop(stopAt);
    setTimeout(() => f.gain.disconnect(), 1300);
  }

  /** dipanggil tiap frame dengan state store */
  update(_dt: number, state: ConstitutionalState): void {
    const ctx = this.engine.context;
    if (!ctx || !this.started) return;
    const t = ctx.currentTime;
    const drone = droneFrequencyFor(state.integrity);

    if (this.foundation) {
      for (const o of this.foundation.oscs) o.frequency.setTargetAtTime(drone, t, 0.6);
      const dark = 320 - 160 * (1 - state.integrity);
      this.foundation.filter.frequency.setTargetAtTime(dark, t, 0.8);
      const active = state.activeLayers.foundation;
      this.foundation.gain.gain.setTargetAtTime(active ? 0.5 : 0, t, 1.0);
    }

    if (this.crisis) {
      const level = crisisLevelFor(state.integrity);
      const ratios = [1.414, 2.12, 2.83];
      this.crisis.oscs.forEach((o, i) =>
        o.frequency.setTargetAtTime(drone * (ratios[i] ?? 2), t, 0.6),
      );
      this.crisis.lfo.frequency.setTargetAtTime(1.2 + level * 2.4, t, 0.5);
      this.crisis.gain.gain.setTargetAtTime(level * 0.5, t, 0.8);
      const wantCrisis = level > 0;
      if (state.activeLayers.crisis !== wantCrisis) state.setLayer('crisis', wantCrisis);
    }

    if (state.frenzyActive && !this.frenzy) this.buildFrenzy(ctx);
    else if (!state.frenzyActive && this.frenzy) this.stopFrenzy();
    if (this.frenzy) {
      const load = state.cognitiveLoad;
      this.frenzy.sub.frequency.setTargetAtTime(38 + load * 14, t, 0.5);
      this.frenzy.gain.gain.setTargetAtTime(0.55 + 0.3 * load, t, 0.4);
    }
  }

  stop(): void {
    const ctx = this.engine.context;
    if (!ctx || !this.started) return;
    this.started = false;
    const t = ctx.currentTime;
    const stopAt = t + 1.6;
    if (this.foundation) {
      this.foundation.gain.gain.setTargetAtTime(0, t, 0.5);
      this.foundation.oscs.forEach((o) => o.stop(stopAt));
      this.foundation.lfo.stop(stopAt);
      this.foundation = null;
    }
    if (this.crisis) {
      this.crisis.gain.gain.setTargetAtTime(0, t, 0.5);
      this.crisis.oscs.forEach((o) => o.stop(stopAt));
      this.crisis.noise.stop(stopAt);
      this.crisis.lfo.stop(stopAt);
      this.crisis = null;
    }
    this.stopFrenzy();
    const s = this.engine.store.getState();
    s.setLayer('foundation', false);
    s.setLayer('crisis', false);
  }
}
