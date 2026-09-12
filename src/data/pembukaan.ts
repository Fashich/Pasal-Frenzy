/**
 * Pembukaan UUD 1945 versi ringkas (4 alinea + kata ber-id) yang dimuat STATIS
 * oleh shell agar intro tampil seketika tanpa menunggu naskah penuh (uud-1945.json).
 * Dihasilkan oleh scripts/build-uud1945.py dari PDF resmi yang sama.
 */
import raw from './pembukaan.json';
import type { Alinea, KataPembukaanRef } from './uud1945.ts';

export interface PembukaanData {
  provenance: { sourceFile: string; sha256: string };
  alinea: Alinea[];
}

export const pembukaan: PembukaanData = raw as PembukaanData;

export function kataAlinea(nomor: 1 | 2 | 3 | 4): KataPembukaanRef[] {
  const alinea = pembukaan.alinea.find((a) => a.nomor === nomor);
  if (!alinea) return [];
  return alinea.kata.map((k) => ({ ...k, alinea: alinea.nomor, id: `a${alinea.nomor}-k${k.i}` }));
}
