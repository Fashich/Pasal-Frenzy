import { describe, expect, it } from 'vitest';
import { curvatureAt, DEFAULT_WARP, warpViewPosition, type WarpParams } from './hyperbolic.ts';

const params = (integrity: number, extra: Partial<WarpParams> = {}): WarpParams => ({
  ...DEFAULT_WARP,
  integrity,
  time: 0,
  anchors: [],
  ...extra,
});

describe('warpViewPosition', () => {
  it('identitas saat integritas penuh', () => {
    const p = { x: 3, y: 1.5, z: -40 };
    expect(warpViewPosition(p, params(1))).toEqual(p);
    expect(curvatureAt(p, params(1))).toBe(0);
  });

  it('hampir tidak terlihat saat integritas sedikit turun (kurva 1.5)', () => {
    const p = { x: 0, y: 2, z: -30 };
    const q = warpViewPosition(p, params(0.9));
    expect(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)).toBeLessThan(0.6);
  });

  it('memampatkan geometri jauh semakin kuat saat integritas turun (pintu menjauh)', () => {
    const p = { x: 0, y: 0, z: -50 };
    const z1 = Math.abs(warpViewPosition(p, params(0.6)).z);
    const z2 = Math.abs(warpViewPosition(p, params(0.2)).z);
    expect(z1).toBeLessThan(50);
    expect(z2).toBeLessThan(z1);
    expect(z2).toBeGreaterThan(0);
  });

  it('langit-langit jauh mendesak turun, lantai jauh lebih sedikit', () => {
    const ceiling = warpViewPosition({ x: 0, y: 3, z: -55 }, params(0.1));
    const floor = warpViewPosition({ x: 0, y: -1.7, z: -55 }, params(0.1));
    expect(ceiling.y).toBeLessThan(3);
    expect(3 - ceiling.y).toBeGreaterThan(Math.abs(-1.7 - floor.y));
  });

  it('anchor konstitusional mempertahankan geometri Euclidean di dalam radiusnya', () => {
    const p = { x: 1, y: 1, z: -40 };
    const warped = warpViewPosition(p, params(0.1));
    const shielded = warpViewPosition(p, params(0.1, { anchors: [{ x: 1, y: 1, z: -40, r: 5 }] }));
    expect(shielded).toEqual(p);
    expect(warped).not.toEqual(p);
    // di tepi radius pengaruh mulai kembali
    const edge = warpViewPosition(p, params(0.1, { anchors: [{ x: 1, y: 1, z: -34, r: 5 }] }));
    expect(edge).not.toEqual(p);
  });

  it('geometri dekat kamera hampir tidak berubah walau integritas nol', () => {
    const p = { x: 0.5, y: 0.2, z: -1 };
    const q = warpViewPosition(p, params(0));
    expect(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)).toBeLessThan(0.05);
  });
});
