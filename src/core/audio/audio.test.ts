import { describe, expect, it } from 'vitest';
import {
  crisisLevelFor,
  droneFrequencyFor,
  gavelParamsFor,
  heartbeatIntervalFor,
  heartbeatJitterFor,
  hissParamsFor,
} from './audioMath.ts';
import { ENVIRONMENTS, generateImpulseSamples, mulberry32 } from './impulse.ts';
import { HEARTBEAT_PROCESSOR_SOURCE } from './synthesizers/HeartbeatWorklet.ts';

describe('audioMath (PRD Bagian XIII)', () => {
  it('drone 110 Hz saat integritas penuh, 82.5 Hz saat runtuh', () => {
    expect(droneFrequencyFor(1)).toBe(110);
    expect(droneFrequencyFor(0)).toBe(82.5);
    expect(droneFrequencyFor(0.5)).toBeCloseTo(96.25);
  });

  it('detak jantung 900 ms tenang, 450 ms panik, jitter membesar saat panik', () => {
    expect(heartbeatIntervalFor(1)).toBe(900);
    expect(heartbeatIntervalFor(0)).toBe(450);
    expect(heartbeatJitterFor(1)).toBe(0);
    expect(heartbeatJitterFor(0)).toBe(140);
  });

  it('lapisan krisis aktif di bawah 0.4', () => {
    expect(crisisLevelFor(0.5)).toBe(0);
    expect(crisisLevelFor(0.4)).toBe(0);
    expect(crisisLevelFor(0.2)).toBeCloseTo(0.5);
    expect(crisisLevelFor(0)).toBe(1);
  });

  it('palu menang 80 Hz berat, kalah 200 Hz harsh', () => {
    expect(gavelParamsFor('menang').fundamental).toBe(80);
    expect(gavelParamsFor('kalah').fundamental).toBe(200);
    expect(gavelParamsFor('menang').decayMs).toBeGreaterThan(gavelParamsFor('kalah').decayMs);
  });

  it('hiss partikel: korporasi metalik (putih, Q tinggi), populis diffuse, eksekutif rendah', () => {
    expect(hissParamsFor('korporasi', 1).noise).toBe('putih');
    expect(hissParamsFor('korporasi', 1).q).toBeGreaterThan(hissParamsFor('populis', 1).q);
    expect(hissParamsFor('eksekutif', 0).center).toBeLessThan(hissParamsFor('populis', 0).center);
    expect(hissParamsFor('populis', 1).gain).toBeGreaterThan(hissParamsFor('populis', 0).gain);
  });
});

describe('impulse response sintetis', () => {
  it('deterministik, ternormalisasi, dan meluruh', () => {
    const a = generateImpulseSamples(ENVIRONMENTS.sidang, 8000, 11);
    const b = generateImpulseSamples(ENVIRONMENTS.sidang, 8000, 11);
    expect(Array.from(a.slice(0, 200))).toEqual(Array.from(b.slice(0, 200)));
    let peak = 0;
    for (const v of a) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeCloseTo(0.9, 2);
    const early = rms(a, 200, 1200);
    const late = rms(a, a.length - 1500, a.length - 100);
    expect(early).toBeGreaterThan(late * 5);
  });

  it('ruang krisis lebih panjang dan lebih gelap daripada koridor digital', () => {
    expect(ENVIRONMENTS.krisis.duration).toBeGreaterThan(ENVIRONMENTS.digital.duration);
    expect(ENVIRONMENTS.krisis.darkness).toBeGreaterThan(ENVIRONMENTS.digital.darkness);
  });

  it('mulberry32 menghasilkan urutan 0..1 yang stabil', () => {
    const r1 = mulberry32(7);
    const r2 = mulberry32(7);
    for (let i = 0; i < 5; i++) {
      const v = r1();
      expect(v).toBe(r2());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('HeartbeatWorklet', () => {
  it('sumber processor mendaftarkan prosesor dan parameter interval/jitter', () => {
    expect(HEARTBEAT_PROCESSOR_SOURCE).toMatch(/registerProcessor\('pf-heartbeat'/);
    expect(HEARTBEAT_PROCESSOR_SOURCE).toMatch(/name: 'interval'/);
    expect(HEARTBEAT_PROCESSOR_SOURCE).toMatch(/name: 'jitter'/);
  });
});

function rms(arr: Float32Array, from: number, to: number): number {
  let acc = 0;
  let n = 0;
  for (let i = Math.max(0, from); i < Math.min(arr.length, to); i++) {
    const v = arr[i] ?? 0;
    acc += v * v;
    n += 1;
  }
  return n ? Math.sqrt(acc / n) : 0;
}
