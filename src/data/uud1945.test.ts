import { describe, expect, it } from 'vitest';
import {
  createUudIndex,
  listKataPembukaan,
  listKutipanUnit,
  pasalToText,
  uud1945,
} from './uud1945.ts';

const index = createUudIndex();

describe('uud-1945.json: integritas struktural', () => {
  it('memiliki 4 alinea Pembukaan yang masing-masing diawali kata yang benar', () => {
    const alinea = uud1945.pembukaan.alinea;
    expect(alinea).toHaveLength(4);
    expect(alinea.map((a) => a.kata[0]?.bersih)).toEqual(['Bahwa', 'Dan', 'Atas', 'Kemudian']);
    for (const a of alinea) {
      expect(a.teks.endsWith('.')).toBe(true);
      expect(a.kata.length).toBeGreaterThan(10);
    }
  });

  it('memiliki 21 BAB dengan urutan resmi', () => {
    expect(uud1945.batangTubuh.bab.map((b) => b.nomor)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'VIIA',
      'VIIB',
      'VIII',
      'VIIIA',
      'IX',
      'IXA',
      'X',
      'XA',
      'XI',
      'XII',
      'XIII',
      'XIV',
      'XV',
      'XVI',
    ]);
  });

  it('memuat Pasal 1 sampai 37 dan pasal berhuruf hasil amandemen', () => {
    for (let n = 1; n <= 37; n++) expect(index.pasalById.has(String(n))).toBe(true);
    for (const id of [
      '6A',
      '7A',
      '7B',
      '7C',
      '18A',
      '18B',
      '20A',
      '22A',
      '22B',
      '22C',
      '22D',
      '22E',
      '23A',
      '23B',
      '23C',
      '23D',
      '23E',
      '23F',
      '23G',
      '24A',
      '24B',
      '24C',
      '25A',
      '28A',
      '28B',
      '28C',
      '28D',
      '28E',
      '28F',
      '28G',
      '28H',
      '28I',
      '28J',
      '36A',
      '36B',
      '36C',
    ]) {
      expect(index.pasalById.has(id), `Pasal ${id}`).toBe(true);
    }
  });

  it('pasal-pasal inti MVP memiliki jumlah ayat sesuai naskah', () => {
    expect(index.pasalById.get('22')?.pasal.ayat).toHaveLength(3);
    expect(index.pasalById.get('33')?.pasal.ayat).toHaveLength(5);
    expect(index.pasalById.get('28J')?.pasal.ayat).toHaveLength(2);
    expect(index.pasalById.get('28A')?.pasal.teks).toMatch(/^Setiap orang berhak untuk hidup/);
    expect(index.pasalById.get('1')?.pasal.ayat[2]?.teks).toBe(
      'Negara Indonesia adalah negara hukum.',
    );
  });

  it('penanda amandemen dipetakan ke angka 1-4', () => {
    const p1 = index.pasalById.get('1')?.pasal;
    expect(p1?.ayat[0]?.amandemen).toEqual([]);
    expect(p1?.ayat[1]?.amandemen).toEqual([3]);
    const p3 = index.pasalById.get('3')?.pasal;
    expect(p3?.ayat[1]?.amandemen).toEqual([3, 4]);
    expect(index.babByNomor.get('XA')?.amandemen).toEqual([2]);
    expect(index.pasalById.get('33')?.pasal.ayat[3]?.amandemen).toEqual([4]);
    // penanda yang berdiri sendiri di baris terpisah pada naskah sumber
    expect(uud1945.aturanPeralihan.pasal[2]?.amandemen).toEqual([4]);
    expect(index.pasalById.get('22C')?.pasal.ayat[2]?.amandemen).toEqual([3]);
  });

  it('BAB IV tercatat dihapus oleh Perubahan Keempat tanpa pasal', () => {
    const babIV = index.babByNomor.get('IV');
    expect(babIV?.judul).toBe('DEWAN PERTIMBANGAN AGUNG');
    expect(babIV?.dihapus).toBe(true);
    expect(babIV?.amandemen).toEqual([4]);
    expect(babIV?.pasal).toHaveLength(0);
    expect(uud1945.batangTubuh.bab.filter((b) => b.dihapus)).toHaveLength(1);
  });

  it('tidak ada noise ekstraksi di dalam teks', () => {
    const noise = /(jdih|­|\s{2,}|\*\)|[1-4]\)$)/;
    for (const unit of listKutipanUnit()) {
      expect(unit.teks, unit.id).not.toMatch(noise);
      expect(unit.teks.length, unit.id).toBeGreaterThan(0);
    }
    for (const bab of uud1945.batangTubuh.bab) expect(bab.judul).not.toMatch(noise);
  });

  it('Aturan Peralihan dan Aturan Tambahan lengkap', () => {
    expect(uud1945.aturanPeralihan.pasal.map((p) => p.nomor)).toEqual(['I', 'II', 'III']);
    expect(uud1945.aturanTambahan.pasal.map((p) => p.nomor)).toEqual(['I', 'II']);
  });

  it('provenance menunjuk ke berkas sumber dan hash SHA-256', () => {
    expect(uud1945.provenance.sourceFile).toBe('data-source/UUD-NRI-1945-Dalam-Satu-Naskah.pdf');
    expect(uud1945.provenance.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(uud1945.provenance.canonicalRendition).toBe('A');
  });
});

describe('pembukaan.json (salinan ringkas untuk shell)', () => {
  it('identik dengan Pembukaan di naskah penuh dan menunjuk sumber yang sama', async () => {
    const { pembukaan, kataAlinea } = await import('./pembukaan.ts');
    expect(pembukaan.alinea).toEqual(uud1945.pembukaan.alinea);
    expect(pembukaan.provenance.sha256).toBe(uud1945.provenance.sha256);
    expect(kataAlinea(1).map((k) => k.teks)).toEqual(
      uud1945.pembukaan.alinea[0]?.kata.map((k) => k.teks),
    );
  });
});

describe('pengindeks', () => {
  it('menyediakan id ayat yang stabil', () => {
    const ayat = index.ayatById.get('22-1');
    expect(ayat?.pasal.id).toBe('22');
    expect(ayat?.ayat.teks).toMatch(/kegentingan yang memaksa/);
  });

  it('pasalToText menggabungkan ayat dengan nomor', () => {
    const p22 = index.pasalById.get('22')?.pasal;
    expect(p22).toBeDefined();
    if (p22) expect(pasalToText(p22)).toMatch(/^\(1\) .* \(2\) .* \(3\) /);
  });

  it('listKataPembukaan memberi id unik per kata', () => {
    const kata = listKataPembukaan();
    const ids = new Set(kata.map((k) => k.id));
    expect(ids.size).toBe(kata.length);
    expect(kata.filter((k) => k.alinea === 1).length).toBeGreaterThan(20);
  });
});
