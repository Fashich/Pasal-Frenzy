import type { StateCreator } from 'zustand/vanilla';
import type { ConstitutionalState, ProgressSlice } from '../types.ts';
import type { SliceDeps } from './integritySlice.ts';

export const FIRST_CHAPTER_ID = 'prolog';

export const createProgressSlice =
  (deps: SliceDeps): StateCreator<ConstitutionalState, [], [], ProgressSlice> =>
  (set, get) => ({
    currentChapterId: null,
    chapterStartedAt: null,
    chapterAttempts: {},
    unlockedChapters: [FIRST_CHAPTER_ID],
    completedChapters: {},
    totalPlayTimeMs: 0,

    startChapter: (chapterId) => {
      const attempts = { ...get().chapterAttempts };
      const attempt = (attempts[chapterId] ?? 0) + 1;
      attempts[chapterId] = attempt;
      set({ currentChapterId: chapterId, chapterStartedAt: deps.now(), chapterAttempts: attempts });
      deps.bus.emit('CHAPTER_STARTED', { chapterId, attempt });
    },

    completeChapter: (chapterId, outcome) => {
      const now = deps.now();
      const startedAt = get().chapterStartedAt;
      const durationMs = startedAt === null ? 0 : Math.max(0, now - startedAt);
      const previous = get().completedChapters[chapterId];
      const attempts = get().chapterAttempts[chapterId] ?? 1;
      const bestDurationMs =
        outcome === 'menang'
          ? previous?.bestDurationMs === null || previous?.bestDurationMs === undefined
            ? durationMs
            : Math.min(previous.bestDurationMs, durationMs)
          : (previous?.bestDurationMs ?? null);
      set({
        completedChapters: {
          ...get().completedChapters,
          [chapterId]: { completedAt: now, outcome, attempts, bestDurationMs },
        },
        currentChapterId: null,
        chapterStartedAt: null,
      });
      if (get().frenzyActive) get().deactivateFrenzy('bab-selesai');
      deps.bus.emit('CHAPTER_COMPLETED', {
        chapterId,
        outcome,
        durationMs,
        integrityAtEnd: get().integrity,
      });
    },

    unlockChapter: (chapterId) => {
      if (get().unlockedChapters.includes(chapterId)) return;
      set({ unlockedChapters: [...get().unlockedChapters, chapterId] });
    },

    addPlayTime: (ms) => {
      if (!(ms > 0)) return;
      set({ totalPlayTimeMs: get().totalPlayTimeMs + ms });
    },
  });
