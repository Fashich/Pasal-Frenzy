/**
 * HeartbeatWorklet — detak jantung pemain di thread audio khusus (PRD Bagian XIII).
 *
 * AudioWorkletProcessor mensintesis "lub" (kontraksi ventrikel, sinus rendah
 * menurun) dan "dub" (penutupan katup, sedikit lebih tinggi). Interval antar
 * detak dan jitter (aritmia) adalah AudioParam yang dikontrol real-time oleh
 * overallPsychologicalHealth: 900 ms tenang -> 450 ms + jitter saat panik.
 * Karena berjalan di AudioWorkletGlobalScope, detak tidak pernah dropout
 * walau main thread sibuk saat Mode Frenzy.
 *
 * Kode processor disimpan sebagai string dan dimuat lewat Blob URL agar tidak
 * bergantung pada penanganan aset bundler dan tetap berjalan di Electron/
 * Capacitor (offline). Fallback (tanpa AudioWorklet): penjadwalan OscillatorNode
 * di main thread dengan lookahead.
 */
import { heartbeatIntervalFor, heartbeatJitterFor } from '../audioMath.ts';
import type { AudioEngine } from '../AudioEngine.ts';

export const HEARTBEAT_PROCESSOR_SOURCE = /* js */ `
class PfHeartbeatProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'interval', defaultValue: 900, minValue: 300, maxValue: 2000, automationRate: 'k-rate' },
      { name: 'jitter', defaultValue: 0, minValue: 0, maxValue: 300, automationRate: 'k-rate' },
      { name: 'gain', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    this.t = 0;              // waktu (detik) sejak awal
    this.nextBeat = 0.2;     // waktu detak berikutnya
    this.seed = 12345;
    this.events = [];        // [{start, kind}]
    this.port.onmessage = (e) => { if (e.data === 'stop') this.stopped = true; };
    this.stopped = false;
  }
  rand() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  thud(tRel, kind) {
    // kind 0 = lub (55 -> 38 Hz, 95 ms), kind 1 = dub (72 -> 48 Hz, 70 ms)
    const dur = kind === 0 ? 0.095 : 0.07;
    if (tRel < 0 || tRel > dur) return 0;
    const f0 = kind === 0 ? 55 : 72;
    const f1 = kind === 0 ? 38 : 48;
    const p = tRel / dur;
    const f = f0 + (f1 - f0) * p;
    const env = Math.sin(Math.PI * p) * Math.exp(-3.2 * p);
    return Math.sin(2 * Math.PI * f * tRel * (1 + 0.15 * p)) * env * (kind === 0 ? 1 : 0.7);
  }
  process(inputs, outputs, parameters) {
    if (this.stopped) return false;
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const ch0 = out[0];
    const n = ch0.length;
    const interval = parameters.interval[0] / 1000;
    const jitter = parameters.jitter[0] / 1000;
    const gain = parameters.gain[0];
    const dt = 1 / sampleRate;
    for (let i = 0; i < n; i++) {
      if (this.t >= this.nextBeat) {
        this.events.push({ start: this.nextBeat, kind: 0 });
        this.events.push({ start: this.nextBeat + 0.14, kind: 1 });
        const j = (this.rand() * 2 - 1) * jitter;
        this.nextBeat += Math.max(0.3, interval + j);
        if (this.events.length > 8) this.events.splice(0, this.events.length - 8);
      }
      let s = 0;
      for (let k = 0; k < this.events.length; k++) {
        const ev = this.events[k];
        s += this.thud(this.t - ev.start, ev.kind);
      }
      ch0[i] = s * gain;
      this.t += dt;
    }
    for (let c = 1; c < out.length; c++) out[c].set(ch0);
    return true;
  }
}
registerProcessor('pf-heartbeat', PfHeartbeatProcessor);
`;

export class HeartbeatWorklet {
  private node: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private fallbackNext = 0;
  private health = 1;
  private intensity = 0.5;
  private started = false;
  private static moduleUrl: string | null = null;
  private static loaded = new WeakSet<BaseAudioContext>();

  constructor(private readonly engine: AudioEngine) {}

  get isRunning(): boolean {
    return this.started;
  }

  get usingWorklet(): boolean {
    return this.node !== null;
  }

  async start(): Promise<void> {
    const ctx = this.engine.context;
    if (!ctx || this.started) return;
    this.started = true;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.9;
    // detak jantung tanpa reverb ruangan: ia berada "di dalam" pemain
    this.gainNode.connect(this.engine.direct);

    if (typeof ctx.audioWorklet !== 'undefined' && typeof AudioWorkletNode === 'function') {
      try {
        if (!HeartbeatWorklet.loaded.has(ctx)) {
          HeartbeatWorklet.moduleUrl ??= URL.createObjectURL(
            new Blob([HEARTBEAT_PROCESSOR_SOURCE], { type: 'application/javascript' }),
          );
          await ctx.audioWorklet.addModule(HeartbeatWorklet.moduleUrl);
          HeartbeatWorklet.loaded.add(ctx);
        }
        this.node = new AudioWorkletNode(ctx, 'pf-heartbeat', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        });
        this.node.connect(this.gainNode);
        this.applyParams();
        return;
      } catch (error) {
        console.warn('[HeartbeatWorklet] AudioWorklet gagal, memakai fallback main thread', error);
        this.node = null;
      }
    }
    this.startFallback(ctx);
  }

  /** 0..1 dari overallPsychologicalHealth */
  setHealth(health: number): void {
    this.health = Math.min(1, Math.max(0, health));
    this.applyParams();
  }

  /** 0..1 kekerasan detak */
  setIntensity(intensity: number): void {
    this.intensity = Math.min(1, Math.max(0, intensity));
    this.applyParams();
  }

  private applyParams(): void {
    const ctx = this.engine.context;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (this.node) {
      const interval = this.node.parameters.get('interval');
      const jitter = this.node.parameters.get('jitter');
      const gain = this.node.parameters.get('gain');
      interval?.setTargetAtTime(heartbeatIntervalFor(this.health), t, 0.3);
      jitter?.setTargetAtTime(heartbeatJitterFor(this.health), t, 0.3);
      gain?.setTargetAtTime(0.25 + 0.55 * this.intensity, t, 0.2);
    }
  }

  private startFallback(ctx: AudioContext): void {
    this.fallbackNext = ctx.currentTime + 0.2;
    const schedule = () => {
      const now = ctx.currentTime;
      while (this.fallbackNext < now + 0.5) {
        this.thud(ctx, this.fallbackNext, 0);
        this.thud(ctx, this.fallbackNext + 0.14, 1);
        const jitter = (Math.random() * 2 - 1) * (heartbeatJitterFor(this.health) / 1000);
        this.fallbackNext += Math.max(0.3, heartbeatIntervalFor(this.health) / 1000 + jitter);
      }
    };
    schedule();
    this.fallbackTimer = setInterval(schedule, 120);
  }

  private thud(ctx: AudioContext, t0: number, kind: 0 | 1): void {
    if (!this.gainNode) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(kind === 0 ? 55 : 72, t0);
    osc.frequency.exponentialRampToValueAtTime(
      kind === 0 ? 38 : 48,
      t0 + (kind === 0 ? 0.095 : 0.07),
    );
    const env = ctx.createGain();
    const peak = (0.25 + 0.55 * this.intensity) * (kind === 0 ? 1 : 0.7);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + (kind === 0 ? 0.095 : 0.07));
    osc.connect(env);
    env.connect(this.gainNode);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    if (this.fallbackTimer !== null) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.node) {
      this.node.port.postMessage('stop');
      this.node.disconnect();
      this.node = null;
    }
    this.gainNode?.disconnect();
    this.gainNode = null;
  }
}
