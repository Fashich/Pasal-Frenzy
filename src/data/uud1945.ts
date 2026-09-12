/**
 * Tipe dan pengindeks untuk `uud-1945.json`.
 *
 * JSON dihasilkan oleh `scripts/build-uud1945.py` dari naskah resmi MPR RI.
 * Modul ini tidak mengubah teks; ia hanya menyediakan akses terstruktur.
 */
import raw from './uud-1945.json';

export type Amandemen = 1 | 2 | 3 | 4;

export interface KataPembukaan {
  /** indeks kata di dalam alinea (0-based) */
  i: number;
  /** token persis seperti di naskah, termasuk tanda baca */
  teks: string;
  /** token tanpa tanda baca di awal/akhir */
  bersih: string;
}

export interface Alinea {
  nomor: number;
  teks: string;
  kata: KataPembukaan[];
}

export interface Ayat {
  id: string;
  nomor: number;
  teks: string;
  amandemen: Amandemen[];
}

export interface Pasal {
  id: string;
  nomor: string;
  amandemen: Amandemen[];
  /** terisi hanya jika pasal tidak memiliki ayat */
  teks: string | null;
  ayat: Ayat[];
}

export interface Bab {
  nomor: string;
  judul: string;
  amandemen: Amandemen[];
  /** true untuk BAB IV (Dewan Pertimbangan Agung) yang dihapus Perubahan Keempat */
  dihapus: boolean;
  pasal: Pasal[];
}

export interface Provenance {
  sourceFile: string;
  sourceTitle: string;
  sha256: string;
  pageCount: number;
  extractedAt: string;
  tool: string;
  python: string;
  script: string;
  canonicalRendition: string;
  renditionPages: { A: string; B: string };
  crossCheck: { unitDibandingkan: number; jumlahPerbedaan: number; laporan: string };
}

export interface Uud1945 {
  meta: {
    judul: string;
    edisi: string;
    penerbit: string;
    bahasa: string;
    keteranganAmandemen: Record<string, string>;
    catatan: string;
  };
  provenance: Provenance;
  pembukaan: { alinea: Alinea[] };
  batangTubuh: { bab: Bab[] };
  aturanPeralihan: { pasal: Pasal[] };
  aturanTambahan: { pasal: Pasal[] };
}

export const uud1945: Uud1945 = raw as Uud1945;

export interface PasalRef {
  pasal: Pasal;
  bab: Bab | null;
  bagian: 'batangTubuh' | 'aturanPeralihan' | 'aturanTambahan';
}

export interface UudIndex {
  pasalById: ReadonlyMap<string, PasalRef>;
  ayatById: ReadonlyMap<string, { ayat: Ayat; pasal: Pasal; bab: Bab | null }>;
  babByNomor: ReadonlyMap<string, Bab>;
}

export function createUudIndex(data: Uud1945 = uud1945): UudIndex {
  const pasalById = new Map<string, PasalRef>();
  const ayatById = new Map<string, { ayat: Ayat; pasal: Pasal; bab: Bab | null }>();
  const babByNomor = new Map<string, Bab>();

  for (const bab of data.batangTubuh.bab) {
    babByNomor.set(bab.nomor, bab);
    for (const pasal of bab.pasal) {
      pasalById.set(pasal.id, { pasal, bab, bagian: 'batangTubuh' });
      for (const ayat of pasal.ayat) ayatById.set(ayat.id, { ayat, pasal, bab });
    }
  }
  for (const pasal of data.aturanPeralihan.pasal) {
    pasalById.set(pasal.id, { pasal, bab: null, bagian: 'aturanPeralihan' });
    for (const ayat of pasal.ayat) ayatById.set(ayat.id, { ayat, pasal, bab: null });
  }
  for (const pasal of data.aturanTambahan.pasal) {
    pasalById.set(pasal.id, { pasal, bab: null, bagian: 'aturanTambahan' });
    for (const ayat of pasal.ayat) ayatById.set(ayat.id, { ayat, pasal, bab: null });
  }
  return { pasalById, ayatById, babByNomor };
}

/** Mengembalikan seluruh teks sebuah pasal sebagai satu string (ayat digabung). */
export function pasalToText(pasal: Pasal): string {
  if (pasal.teks !== null) return pasal.teks;
  return pasal.ayat.map((a) => `(${a.nomor}) ${a.teks}`).join(' ');
}

/** Unit teks terkecil yang bisa dikutip: ayat, atau pasal utuh jika tanpa ayat. */
export interface KutipanUnit {
  id: string;
  label: string;
  teks: string;
  amandemen: Amandemen[];
  pasalId: string;
  babNomor: string | null;
}

export function listKutipanUnit(data: Uud1945 = uud1945): KutipanUnit[] {
  const units: KutipanUnit[] = [];
  const push = (pasal: Pasal, babNomor: string | null, prefix: string) => {
    if (pasal.ayat.length === 0) {
      units.push({
        id: pasal.id,
        label: `${prefix}Pasal ${pasal.nomor}`,
        teks: pasal.teks ?? '',
        amandemen: pasal.amandemen,
        pasalId: pasal.id,
        babNomor,
      });
      return;
    }
    for (const ayat of pasal.ayat) {
      units.push({
        id: ayat.id,
        label: `${prefix}Pasal ${pasal.nomor} ayat (${ayat.nomor})`,
        teks: ayat.teks,
        amandemen: ayat.amandemen,
        pasalId: pasal.id,
        babNomor,
      });
    }
  };
  for (const bab of data.batangTubuh.bab) for (const p of bab.pasal) push(p, bab.nomor, '');
  for (const p of data.aturanPeralihan.pasal) push(p, null, 'Aturan Peralihan ');
  for (const p of data.aturanTambahan.pasal) push(p, null, 'Aturan Tambahan ');
  return units;
}

/** Semua kata Pembukaan dengan penanda alinea, untuk prolog. */
export interface KataPembukaanRef extends KataPembukaan {
  alinea: number;
  /** id stabil: `a{alinea}-k{i}` */
  id: string;
}

export function listKataPembukaan(data: Uud1945 = uud1945): KataPembukaanRef[] {
  const out: KataPembukaanRef[] = [];
  for (const alinea of data.pembukaan.alinea) {
    for (const k of alinea.kata) {
      out.push({ ...k, alinea: alinea.nomor, id: `a${alinea.nomor}-k${k.i}` });
    }
  }
  return out;
}
