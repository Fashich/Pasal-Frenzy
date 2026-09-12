/**
 * Kumpulan kutipan untuk intro acak (4 alinea Pembukaan + unit pasal kunci).
 * Dimuat statis (kecil) agar intro tampil seketika. Dihasilkan parser dari PDF resmi.
 */
import raw from './intro-passages.json';
import type { KataPembukaan } from './uud1945.ts';

export interface IntroPassage {
  id: string;
  label: string;
  teks: string;
  kata: KataPembukaan[];
}

export interface IntroPassagesData {
  provenance: { sourceFile: string; sha256: string };
  passages: IntroPassage[];
}

export const introPassages: IntroPassagesData = raw as IntroPassagesData;

/** memilih satu kutipan acak; hindari kutipan yang sama dengan terakhir kali (localStorage) */
export function pickIntroPassage(random: () => number = Math.random): IntroPassage {
  const list = introPassages.passages;
  const fallback: IntroPassage = { id: 'kosong', label: '', teks: '', kata: [] };
  if (list.length === 0) return fallback;
  let lastId: string | null = null;
  try {
    lastId = localStorage.getItem('pasal-frenzy.lastIntro');
  } catch {
    /* abaikan */
  }
  const candidates = list.length > 1 ? list.filter((p) => p.id !== lastId) : list;
  const chosen = candidates[Math.floor(random() * candidates.length)] ?? list[0] ?? fallback;
  try {
    localStorage.setItem('pasal-frenzy.lastIntro', chosen.id);
  } catch {
    /* abaikan */
  }
  return chosen;
}
