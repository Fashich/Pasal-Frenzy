import { describe, expect, it } from 'vitest';
import { KASUS, KUTIPAN, STATISTIK } from './content.ts';

describe('konten landing berasal dari naskah', () => {
  it('kutipan cocok dengan teks resmi', () => {
    expect(KUTIPAN.pasal1ayat3.teks).toBe('Negara Indonesia adalah negara hukum.');
    expect(KUTIPAN.pasal22ayat1.teks).toMatch(/^Dalam hal ihwal kegentingan yang memaksa/);
    expect(KUTIPAN.pasal33ayat2.teks).toMatch(/^Cabang-cabang produksi/);
    expect(KUTIPAN.pasal28A.teks).toMatch(/^Setiap orang berhak untuk hidup/);
  });

  it('statistik dihitung dari data', () => {
    expect(STATISTIK.bab).toBe(21);
    expect(STATISTIK.pasal).toBeGreaterThan(37);
    expect(STATISTIK.alinea).toBe(4);
    expect(STATISTIK.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('tiga kasus memakai id bab yang dikenal router', () => {
    expect(KASUS.map((k) => k.id)).toEqual(['case-1-ham', 'case-2-pasal33', 'case-3-perppu']);
  });
});
