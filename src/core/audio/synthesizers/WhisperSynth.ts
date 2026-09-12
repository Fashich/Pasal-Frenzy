/**
 * WhisperSynth — bisikan oligarki dengan sintesis formant (Dev Planning 08 #2).
 * Noise merah muda -> tiga BiquadFilter bandpass paralel pada formant vokal
 * yang meluncur perlahan antar vokal (a-i-u-e-o) dengan modulasi acak, ditambah
 * tremolo lambat. Sengaja tidak pernah terdengar jelas: ambigu dan mengancam.
 * Dapat dipasang ke SpatialSource agar datang dari arah tertentu.
 */
import { VOWEL_FORMANTS } from '../audioMath.ts';
import type { AudioEngine } from '../AudioEngine.ts';

const VOWELS = ['a', 'i', 'u', 'e', 'o'] as const;

export class WhisperSynth {
  private source: AudioBufferSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private tremolo: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private output: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private level = 0.4;

  constructor(private readonly engine: AudioEngine) {}

  get isPlaying(): boolean {
    return this.source !== null;
  }

  start(destination?: AudioNode): void {
    const ctx = this.engine.context;
    if (!ctx || this.source) return;
    const dest = destination ?? this.engine.input;

    const src = ctx.createBufferSource();
    src.buffer = this.engine.createNoiseBuffer('merah-muda', 3);
    src.loop = true;

    const preGain = ctx.createGain();
    preGain.gain.value = 1.6;
    src.connect(preGain);

    this.output = ctx.createGain();
    this.output.gain.value = 0;
    this.tremolo = ctx.createGain();
    this.tremolo.gain.value = 0.7;
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.9;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.tremolo.gain);

    const formants = VOWEL_FORMANTS.a;
    this.filters = formants.map((f, i) => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = f;
      filter.Q.value = i === 0 ? 8 : 12;
      preGain.connect(filter);
      filter.connect(this.tremolo as GainNode);
      return filter;
    });
    this.tremolo.connect(this.output);
    this.output.connect(dest);

    src.start();
    this.lfo.start();
    this.source = src;
    this.output.gain.setTargetAtTime(this.level, ctx.currentTime, 0.8);

    // pergantian vokal acak setiap 700-1400 ms, meluncur halus
    const glide = () => {
      const c = this.engine.context;
      if (!c) return;
      const vowel = VOWELS[Math.floor(Math.random() * VOWELS.length)] ?? 'a';
      const target = VOWEL_FORMANTS[vowel];
      const t = c.currentTime;
      this.filters.forEach((f, i) => {
        const wobble = 1 + (Math.random() - 0.5) * 0.08;
        f.frequency.setTargetAtTime((target[i] ?? 800) * wobble, t, 0.25);
      });
      this.lfo?.frequency.setTargetAtTime(0.6 + Math.random() * 1.4, t, 0.5);
    };
    glide();
    this.timer = setInterval(glide, 700 + Math.random() * 700);
  }

  /** 0..1 volume bisikan */
  setLevel(level: number): void {
    this.level = Math.min(1, Math.max(0, level));
    const ctx = this.engine.context;
    if (ctx && this.output) this.output.gain.setTargetAtTime(this.level, ctx.currentTime, 0.4);
  }

  stop(fadeSeconds = 0.8): void {
    const ctx = this.engine.context;
    if (!ctx || !this.source) return;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const src = this.source;
    const lfo = this.lfo;
    const out = this.output;
    this.source = null;
    this.lfo = null;
    out?.gain.setTargetAtTime(0, ctx.currentTime, fadeSeconds / 3);
    const stopAt = ctx.currentTime + fadeSeconds + 0.1;
    src.stop(stopAt);
    lfo?.stop(stopAt);
    setTimeout(
      () => {
        out?.disconnect();
        this.filters.forEach((f) => f.disconnect());
        this.filters = [];
      },
      (fadeSeconds + 0.2) * 1000,
    );
  }
}
