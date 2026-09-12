/**
 * Konten landing page: semua kutipan diambil dari uud-1945.json (naskah resmi),
 * angka statistik dihitung dari data, bukan diketik manual.
 */
import { createUudIndex, uud1945 } from '@data/uud1945.ts';
import { PRODUCT_TAGLINE } from '../shell/copy.ts';

const index = createUudIndex();

function ayat(id: string): string {
  const ref = index.ayatById.get(id);
  if (!ref) throw new Error(`Ayat ${id} tidak ditemukan di naskah`);
  return ref.ayat.teks;
}

function pasal(id: string): string {
  const ref = index.pasalById.get(id);
  if (!ref) throw new Error(`Pasal ${id} tidak ditemukan di naskah`);
  return ref.pasal.teks ?? ref.pasal.ayat.map((a) => `(${a.nomor}) ${a.teks}`).join(' ');
}

export interface Kutipan {
  label: string;
  teks: string;
}

export const KUTIPAN = {
  pasal1ayat3: { label: 'Pasal 1 ayat (3)', teks: ayat('1-3') },
  pasal28A: { label: 'Pasal 28A', teks: pasal('28A') },
  pasal33ayat3: { label: 'Pasal 33 ayat (3)', teks: ayat('33-3') },
  pasal28Jayat2: { label: 'Pasal 28J ayat (2)', teks: ayat('28J-2') },
  pasal33ayat2: { label: 'Pasal 33 ayat (2)', teks: ayat('33-2') },
  pasal22ayat1: { label: 'Pasal 22 ayat (1)', teks: ayat('22-1') },
  pasal1ayat2: { label: 'Pasal 1 ayat (2)', teks: ayat('1-2') },
} as const satisfies Record<string, Kutipan>;

const babBatang = uud1945.batangTubuh.bab;
export const STATISTIK = {
  bab: babBatang.length,
  pasal: babBatang.reduce((n, b) => n + b.pasal.length, 0),
  ayat: babBatang.reduce((n, b) => n + b.pasal.reduce((m, p) => m + p.ayat.length, 0), 0),
  alinea: uud1945.pembukaan.alinea.length,
  kasus: 3,
  sha256: uud1945.provenance.sha256,
  sumber: uud1945.meta.penerbit,
};

export interface KasusInfo {
  id: 'case-1-ham' | 'case-2-pasal33' | 'case-3-perppu';
  nomor: string;
  judul: string;
  tema: string;
  kutipan: Kutipan;
  deskripsi: string;
  mekanik: string;
  aksen: 'biru' | 'hijau' | 'merah';
}

export const KASUS: KasusInfo[] = [
  {
    id: 'case-1-ham',
    nomor: '01',
    judul: 'Labirinto Hakiki',
    tema: 'Hak asasi manusia berhadapan dengan keamanan negara',
    kutipan: KUTIPAN.pasal28Jayat2,
    deskripsi:
      'Kamu terjebak di labirin kaca Pasal 28A sampai 28J. Entitas bayangan memakai klausul pembatasan untuk meretakkan panel demi panel.',
    mekanik:
      'Pantulkan cahaya argumen antar panel kaca, bangun perimeter hukum, rangkai ulang fragmen teks yang jatuh.',
    aksen: 'biru',
  },
  {
    id: 'case-2-pasal33',
    nomor: '02',
    judul: 'Oligarki dalam Kabut Digital',
    tema: 'Pasal 33 sebagai gravitasi konstitusional di era data',
    kutipan: KUTIPAN.pasal33ayat2,
    deskripsi:
      'Arena tercemar kabut partikel digital. Node monopoli tumbuh sebagai jaringan tanpa skala yang terus beregenerasi.',
    mekanik:
      'Tanam jangkar gravitasi bermuatan Pasal 33, murnikan partikel, hancurkan hub yang menopang jaringan.',
    aksen: 'hijau',
  },
  {
    id: 'case-3-perppu',
    nomor: '03',
    judul: 'Singularitas Perppu',
    tema: 'Kegentingan yang memaksa atau kenyamanan eksekutif',
    kutipan: KUTIPAN.pasal22ayat1,
    deskripsi:
      'Integritas konstitusional runtuh dan browser ikut retak: judul tab, scrollbar, lalu layar terkoyak. Kamu punya satu alat: memutar waktu.',
    mekanik:
      'Rangkai Pasal 22 ayat (3) untuk membuka Constitutional Rewind, pulihkan garis waktu sebelum Perppu mengunci realitas.',
    aksen: 'merah',
  },
];

export const LANGKAH = [
  {
    nomor: '1',
    judul: 'Temukan resonansi',
    teks: 'Kata-kata Pembukaan tersebar di ruang hampa. Dekatkan dua kata yang berhubungan dan lihat cahaya mengalir di antaranya.',
  },
  {
    nomor: '2',
    judul: 'Rangkai argumen',
    teks: 'Kata punya massa. Kata fundamental berat dan solid, kata tugas ringan dan elastis. Rantai yang koheren jadi perisai.',
  },
  {
    nomor: '3',
    judul: 'Tahan serangan',
    teks: 'Partikel koruptif datang dari segala arah. Ketika integritas jatuh, ruang melengkung dan Mode Frenzy dimulai.',
  },
];

export const HERO = {
  eyebrow: 'Permainan web 3D · UUD NRI 1945',
  tagline: PRODUCT_TAGLINE,
  lead: 'Rangkai Pembukaan di ruang hampa, lalu pertahankan integritas konstitusional dalam tiga kasus yang membuat ruang melengkung, kata bermassa, dan browser ikut retak.',
};
