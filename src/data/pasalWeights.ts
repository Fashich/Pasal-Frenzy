/**
 * Akses terstruktur ke `pasal-weights.json` (dibuat `scripts/build-pasal-weights.py`)
 * dan `case-relevance.json` (parameter desain).
 */
import weightsRaw from './pasal-weights.json';
import relevanceRaw from './case-relevance.json';

export interface KataWeight {
  tf: number;
  df: number;
  dfRatio: number;
  idf: number;
  tfidf: number;
  tfidfNorm: number;
  fungsional: boolean;
  panjang: number;
}

export interface UnitWeight {
  bagian: 'pembukaan' | 'batangTubuh' | 'aturanPeralihan' | 'aturanTambahan';
  pasalId: string | null;
  babNomor: string | null;
  amandemen: number[];
  jumlahKata: number;
  /** parameter desain: hierarki norma 0..1 */
  normatif: number;
}

export interface PasalWeights {
  provenance: Record<string, string>;
  catatan: string;
  korpus: { unit: number; kosakata: number; token: number };
  normatifSkema: Record<string, number>;
  unit: Record<string, UnitWeight>;
  kata: Record<string, KataWeight>;
  mkCitations: null;
  catatanMkCitations: string;
}

export interface ChapterRelevance {
  judul: string;
  bagian: Record<string, number>;
  pasal: Record<string, number>;
  ayat?: Record<string, number>;
  antagonis: string[];
}

export interface CaseRelevance {
  catatan: string;
  chapters: Record<string, ChapterRelevance>;
}

export const pasalWeights: PasalWeights = weightsRaw as PasalWeights;
export const caseRelevance: CaseRelevance = relevanceRaw as CaseRelevance;

/** normalisasi token: huruf kecil, buang tanda baca di tepi, pertahankan tanda hubung/garis miring */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
    .trim();
}

export function getKataWeight(word: string): KataWeight | null {
  return pasalWeights.kata[normalizeWord(word)] ?? null;
}

export function getUnitWeight(unitId: string): UnitWeight | null {
  return pasalWeights.unit[unitId] ?? null;
}

/**
 * Relevansi unit teks terhadap bab (0..1). Urutan prioritas: ayat spesifik,
 * pasal, bagian; 0 jika bab tidak dikenal atau tidak relevan.
 */
export function getRelevance(chapterId: string | undefined, unitId: string): number {
  if (!chapterId) return 0;
  const ch = caseRelevance.chapters[chapterId];
  if (!ch) return 0;
  const ayat = ch.ayat?.[unitId];
  if (ayat !== undefined) return ayat;
  const unit = getUnitWeight(unitId);
  const pasalId = unit?.pasalId ?? unitId.split('-')[0] ?? unitId;
  const pasal = ch.pasal[pasalId];
  if (pasal !== undefined) return pasal;
  if (unit && ch.bagian[unit.bagian] !== undefined) return ch.bagian[unit.bagian] ?? 0;
  if (unitId.startsWith('pembukaan') && ch.bagian['pembukaan'] !== undefined) {
    return ch.bagian['pembukaan'] ?? 0;
  }
  return 0;
}

export function isAntagonisUnit(chapterId: string | undefined, unitId: string): boolean {
  if (!chapterId) return false;
  return caseRelevance.chapters[chapterId]?.antagonis.includes(unitId) ?? false;
}
