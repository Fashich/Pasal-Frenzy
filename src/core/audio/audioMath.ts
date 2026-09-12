/**
 * Fungsi parameter audio murni (dapat diuji tanpa AudioContext).
 * Angka mengikuti PRD Bagian XIII.
 */

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** drone Constitutional Foundation: 110 Hz saat integritas penuh -> 82.5 Hz saat runtuh */
export function droneFrequencyFor(integrity: number): number {
  return 82.5 + (110 - 82.5) * clamp01(integrity);
}

/** interval detak jantung (ms): health 1.0 -> 900 ms tenang, 0.0 -> 450 ms panik */
export function heartbeatIntervalFor(health: number): number {
  return 450 + 450 * clamp01(health);
}

/** jitter acak maksimum (ms) yang membesar saat health turun (aritmia) */
export function heartbeatJitterFor(health: number): number {
  return (1 - clamp01(health)) * 140;
}

/** intensitas lapisan krisis: aktif di bawah 0.4, penuh di 0 */
export function crisisLevelFor(integrity: number): number {
  if (integrity >= 0.4) return 0;
  return clamp01((0.4 - integrity) / 0.4);
}

export interface GavelParams {
  fundamental: number;
  partial: number;
  filterQ: number;
  decayMs: number;
  clickLevel: number;
}

/** ketukan palu: menang = 80 Hz berat & final; kalah = 200 Hz harsh */
export function gavelParamsFor(outcome: 'menang' | 'kalah'): GavelParams {
  return outcome === 'menang'
    ? { fundamental: 80, partial: 80 * 2.76, filterQ: 6, decayMs: 220, clickLevel: 0.35 }
    : { fundamental: 200, partial: 200 * 3.1, filterQ: 9, decayMs: 130, clickLevel: 0.55 };
}

/** formant vokal (Hz) untuk bisikan oligarki; nilai formant standar fonetik */
export const VOWEL_FORMANTS: Record<'a' | 'i' | 'u' | 'e' | 'o', [number, number, number]> = {
  a: [730, 1090, 2440],
  i: [270, 2290, 3010],
  u: [300, 870, 2240],
  e: [530, 1840, 2480],
  o: [570, 840, 2410],
};

export type CorruptiveKind = 'korporasi' | 'populis' | 'eksekutif';

export interface HissParams {
  /** frekuensi tengah bandpass (Hz) */
  center: number;
  q: number;
  /** modulasi amplitudo (Hz) */
  tremoloHz: number;
  gain: number;
  /** tipe noise: putih (metalik) atau merah muda (diffuse) */
  noise: 'putih' | 'merah-muda';
}

export function hissParamsFor(kind: CorruptiveKind, intensity: number): HissParams {
  const i = clamp01(intensity);
  switch (kind) {
    case 'korporasi':
      return {
        center: 2400 + 1800 * i,
        q: 14,
        tremoloHz: 7 + 6 * i,
        gain: 0.12 + 0.18 * i,
        noise: 'putih',
      };
    case 'populis':
      return {
        center: 900 + 400 * i,
        q: 1.2,
        tremoloHz: 0.6 + 1.2 * i,
        gain: 0.1 + 0.15 * i,
        noise: 'merah-muda',
      };
    case 'eksekutif':
    default:
      return {
        center: 140 + 60 * i,
        q: 3,
        tremoloHz: 2 + 2 * i,
        gain: 0.16 + 0.22 * i,
        noise: 'merah-muda',
      };
  }
}
