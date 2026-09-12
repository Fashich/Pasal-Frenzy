/**
 * Registry bab: setiap bab adalah chunk terpisah (dynamic import) yang hanya
 * dimuat saat pemain memasukinya (PRD Bagian III).
 */
import type { ChapterFactory } from './ChapterInterface.ts';
import type { ChapterId } from '../shell/router.ts';

const registry: Partial<Record<ChapterId, ChapterFactory>> = {
  // diisi di Fase 5: prolog, case-1-ham, case-2-pasal33, case-3-perppu
};

export function getChapterFactory(id: ChapterId): ChapterFactory | null {
  return registry[id] ?? null;
}

export function registerChapter(id: ChapterId, factory: ChapterFactory): void {
  registry[id] = factory;
}
