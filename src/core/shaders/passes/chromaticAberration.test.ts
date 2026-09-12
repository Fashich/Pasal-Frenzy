import { describe, expect, it } from 'vitest';
import {
  aberrationOffsetPx,
  desaturationOf,
  MAX_ABERRATION_PX,
} from './ChromaticAberrationPass.ts';

describe('aberrationOffsetPx', () => {
  it('nol saat integritas penuh dan maksimum 15 px saat integritas nol', () => {
    expect(aberrationOffsetPx(1)).toBe(0);
    expect(aberrationOffsetPx(0)).toBeCloseTo(MAX_ABERRATION_PX, 6);
  });

  it('kurva eksponensial: setengah integritas jauh di bawah setengah offset', () => {
    const half = aberrationOffsetPx(0.5);
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(MAX_ABERRATION_PX / 2);
  });

  it('monoton naik saat integritas turun', () => {
    let prev = -1;
    for (let i = 10; i >= 0; i--) {
      const v = aberrationOffsetPx(i / 10);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('Frenzy dan temporal flux memperbesar offset tetapi dibatasi 2x maksimum', () => {
    expect(aberrationOffsetPx(0.3, 15, 1, 0)).toBeGreaterThan(aberrationOffsetPx(0.3));
    expect(aberrationOffsetPx(0, 15, 1, 1)).toBeLessThanOrEqual(30);
  });
});

describe('desaturationOf', () => {
  it('tidak ada desaturasi saat sehat, dibatasi 0.7 saat runtuh', () => {
    expect(desaturationOf(1)).toBe(0);
    expect(desaturationOf(0)).toBe(0.7);
    expect(desaturationOf(0.5)).toBeCloseTo(0.2);
  });
});
