/**
 * Algoritma massa kata (PRD Bagian V, Dev Planning 05 #2).
 *
 * Massa setiap kata ditentukan multi-faktor, semuanya dari data terhitung atau
 * parameter desain berlabel:
 *  1. kelangkaan/keunikan kata dalam korpus UUD (tf-idf ternormalisasi)
 *  2. bobot normatif unit yang mengandungnya (hierarki norma, parameter desain)
 *  3. relevansi unit terhadap bab aktif (parameter desain)
 *  4. kompleksitas leksikal: panjang kata sebagai proksi sederhana
 *     (PRD menyebut model NLP di Web Worker; v1.0 memakai proksi ini secara jujur)
 *
 * Kata tugas ("dan", "dengan", "yang") ringan dan sangat elastis; kata
 * fundamental ("kedaulatan", "keadilan") berat dan hampir tidak memantul,
 * mencerminkan fleksibilitas interpretasi hukum (elastisitas).
 */
import { getKataWeight, getRelevance, getUnitWeight, normalizeWord } from '@data/pasalWeights.ts';

export interface WordPhysics {
  /** massa Matter.js (satuan relatif), 0.4 .. ~7 */
  mass: number;
  /** restitution 0..1: tinggi = interpretasi fleksibel */
  restitution: number;
  friction: number;
  frictionAir: number;
  /** kategori untuk styling */
  kategori: 'fungsional' | 'biasa' | 'fundamental';
  /** komponen untuk debugging/telemetri */
  komponen: { tfidf: number; normatif: number; relevansi: number; kompleksitas: number };
}

export const MASS_BASE = 0.6;
export const MASS_TFIDF = 2.4;
export const MASS_NORMATIF = 1.5;
export const MASS_RELEVANSI = 1.0;
export const MASS_KOMPLEKSITAS = 0.5;
export const FUNCTION_WORD_FACTOR = 0.25;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export function lexicalComplexity(word: string): number {
  const w = normalizeWord(word);
  // 4 huruf -> 0, 14+ huruf -> 1; kata majemuk berhubung dapat bonus kecil
  const base = clamp01((w.length - 4) / 10);
  const compound = w.includes('-') ? 0.1 : 0;
  return clamp01(base + compound);
}

export function computeWordPhysics(word: string, unitId: string, chapterId?: string): WordPhysics {
  const kw = getKataWeight(word);
  const uw = getUnitWeight(unitId);
  const tfidf = kw?.tfidfNorm ?? 0.3;
  const normatif = uw?.normatif ?? 0.7;
  const relevansi = getRelevance(chapterId, unitId);
  const kompleksitas = lexicalComplexity(word);
  const fungsional = kw?.fungsional ?? normalizeWord(word).length <= 3;

  let mass =
    MASS_BASE +
    MASS_TFIDF * tfidf +
    MASS_NORMATIF * normatif +
    MASS_RELEVANSI * relevansi +
    MASS_KOMPLEKSITAS * kompleksitas;

  let kategori: WordPhysics['kategori'] = 'biasa';
  if (fungsional) {
    mass *= FUNCTION_WORD_FACTOR;
    kategori = 'fungsional';
  } else if (tfidf >= 0.5 && normatif >= 0.85) {
    kategori = 'fundamental';
  }

  // elastisitas: kata tugas memantul, kata fundamental hampir mati (solid)
  const restitution = fungsional ? 0.6 : kategori === 'fundamental' ? 0.12 : 0.3;
  const friction = fungsional ? 0.05 : 0.2 + normatif * 0.3;
  const frictionAir = fungsional ? 0.03 : 0.012;

  return {
    mass: Math.round(mass * 1000) / 1000,
    restitution,
    friction,
    frictionAir,
    kategori,
    komponen: { tfidf, normatif, relevansi, kompleksitas },
  };
}

/** gravitasi Matter (y) dari integritas: kata jatuh makin cepat saat integritas turun */
export function gravityForIntegrity(integrity: number): number {
  const i = clamp01(integrity);
  return 0.35 + (1 - i) * 1.05;
}

/** ukuran font (px) dari jurisprudentialWeight dinamis (0 = 18 px, 8 -> ~40 px) */
export function fontSizeForWeight(jurisprudentialWeight: number): number {
  const w = Math.max(0, jurisprudentialWeight);
  return Math.round(Math.min(40, 18 + 7 * Math.log2(1 + w)));
}
