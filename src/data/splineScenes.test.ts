import { describe, expect, it } from 'vitest';
import { hasAnySplineScene, resolveSplineScene } from './splineScenes.ts';

describe('registri scene Spline', () => {
  it('slot kosong -> null (fallback dipakai)', () => {
    expect(resolveSplineScene('beranda', '/', { beranda: null })).toBeNull();
    expect(resolveSplineScene('landing-hero', '/', {})).toBeNull();
    expect(hasAnySplineScene({ beranda: null, 'landing-hero': null })).toBe(false);
  });

  it('path relatif diawali base build (Pages subpath, Electron ./)', () => {
    expect(
      resolveSplineScene('beranda', '/Pasal-Frenzy/', { beranda: 'spline/beranda.splinecode' }),
    ).toBe('/Pasal-Frenzy/spline/beranda.splinecode');
    expect(resolveSplineScene('beranda', './', { beranda: '/spline/beranda.splinecode' })).toBe(
      './spline/beranda.splinecode',
    );
    expect(resolveSplineScene('beranda', '', { beranda: 'spline/x.splinecode' })).toBe(
      '/spline/x.splinecode',
    );
  });

  it('URL absolut diteruskan apa adanya', () => {
    const url = 'https://example.test/scene.splinecode';
    expect(resolveSplineScene('landing-hero', '/Pasal-Frenzy/', { 'landing-hero': url })).toBe(url);
    expect(hasAnySplineScene({ 'landing-hero': url })).toBe(true);
  });
});
