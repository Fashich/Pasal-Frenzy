import { describe, expect, it } from 'vitest';
import { parseHash, routeToHash, sameRoute } from './router.ts';

describe('router hash', () => {
  it('memetakan hash ke rute dan sebaliknya', () => {
    expect(parseHash('')).toEqual({ name: 'landing' });
    expect(parseHash('#/')).toEqual({ name: 'landing' });
    expect(parseHash('#/masuk')).toEqual({ name: 'masuk' });
    expect(parseHash('#/daftar')).toEqual({ name: 'daftar' });
    expect(routeToHash({ name: 'daftar' })).toBe('#/daftar');
    expect(parseHash('#/beranda/')).toEqual({ name: 'beranda' });
    expect(parseHash('#/main/case-2-pasal33')).toEqual({
      name: 'main',
      chapterId: 'case-2-pasal33',
    });
    expect(routeToHash({ name: 'main', chapterId: 'prolog' })).toBe('#/main/prolog');
  });

  it('bab tak dikenal atau path asing kembali ke landing', () => {
    expect(parseHash('#/main/bab-palsu')).toEqual({ name: 'landing' });
    expect(parseHash('#/apa-ini')).toEqual({ name: 'landing' });
  });

  it('sameRoute membandingkan lewat hash', () => {
    expect(sameRoute({ name: 'beranda' }, parseHash('#/beranda'))).toBe(true);
    expect(sameRoute({ name: 'masuk' }, { name: 'landing' })).toBe(false);
  });
});
