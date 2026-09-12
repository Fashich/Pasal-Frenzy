/**
 * Impulse response sintetis untuk ConvolverNode (tanpa berkas audio unduhan).
 * Noise dengan peluruhan eksponensial + pewarnaan spektral sederhana (moving
 * average sebagai low-pass) menghasilkan reverb yang cukup meyakinkan untuk
 * tiga ruang naratif PRD: ruang sidang, koridor digital, ruang krisis eksekutif.
 */

export type EnvironmentName = 'sidang' | 'digital' | 'krisis';

export interface ImpulseSpec {
  /** durasi ekor reverb (detik) */
  duration: number;
  /** laju peluruhan (lebih besar = lebih cepat) */
  decay: number;
  /** 0..1: proporsi low-pass (0 = terang, 1 = sangat gelap) */
  darkness: number;
  /** pra-delay (detik) */
  preDelay: number;
  /** flutter periodik (detik antar pantulan); 0 = tidak ada */
  flutter: number;
}

export const ENVIRONMENTS: Record<EnvironmentName, ImpulseSpec> = {
  sidang: { duration: 1.9, decay: 3.2, darkness: 0.45, preDelay: 0.018, flutter: 0 },
  digital: { duration: 0.9, decay: 5.5, darkness: 0.1, preDelay: 0.004, flutter: 0.011 },
  krisis: { duration: 3.4, decay: 2.1, darkness: 0.7, preDelay: 0.03, flutter: 0 },
};

/** PRNG deterministik (mulberry32) agar IR sama di setiap sesi */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** menghasilkan satu kanal IR sebagai Float32Array */
export function generateImpulseSamples(
  spec: ImpulseSpec,
  sampleRate: number,
  seed = 1,
): Float32Array<ArrayBuffer> {
  const length = Math.max(1, Math.floor(spec.duration * sampleRate));
  const out = new Float32Array(new ArrayBuffer(length * 4));
  const rand = mulberry32(seed);
  const preDelaySamples = Math.floor(spec.preDelay * sampleRate);
  const flutterSamples = spec.flutter > 0 ? Math.floor(spec.flutter * sampleRate) : 0;

  for (let i = preDelaySamples; i < length; i++) {
    const t = (i - preDelaySamples) / sampleRate;
    const env = Math.exp(-spec.decay * t);
    let n = rand() * 2 - 1;
    if (flutterSamples > 0) {
      // pantulan periodik (flutter echo koridor digital)
      const phase = (i - preDelaySamples) % flutterSamples;
      n *= 0.35 + 0.65 * (phase < flutterSamples * 0.12 ? 1 : 0.4);
    }
    out[i] = n * env;
  }

  // low-pass sederhana: rata-rata bergerak dengan panjang sesuai darkness
  const window = 1 + Math.round(spec.darkness * 12);
  if (window > 1) {
    let acc = 0;
    const queue: number[] = [];
    for (let i = 0; i < length; i++) {
      const v = out[i] ?? 0;
      queue.push(v);
      acc += v;
      if (queue.length > window) acc -= queue.shift() ?? 0;
      out[i] = acc / queue.length;
    }
  }

  // normalisasi puncak ke 0.9
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i] ?? 0));
  if (peak > 0) for (let i = 0; i < length; i++) out[i] = ((out[i] ?? 0) / peak) * 0.9;
  return out;
}

/** membuat AudioBuffer stereo (dua seed berbeda untuk lebar stereo) */
export function createImpulseBuffer(context: BaseAudioContext, name: EnvironmentName): AudioBuffer {
  const spec = ENVIRONMENTS[name];
  const left = generateImpulseSamples(spec, context.sampleRate, 11);
  const right = generateImpulseSamples(spec, context.sampleRate, 29);
  const buffer = context.createBuffer(2, left.length, context.sampleRate);
  buffer.copyToChannel(left, 0);
  buffer.copyToChannel(right, 1);
  return buffer;
}
