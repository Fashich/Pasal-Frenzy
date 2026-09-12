/**
 * ConstitutionalStore — root state Zustand (vanilla, tanpa React).
 *
 * Lima slice sesuai PRD Bagian XI (integritas, psikologis, inventaris pasal,
 * audio, progres) ditambah slice Frenzy yang bekerja lintas slice. Setiap
 * subsistem berlangganan dengan selector (`subscribeWithSelector`) sehingga
 * update di satu slice tidak membangunkan subsistem yang tidak berkepentingan.
 */
import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  constitutionalBus,
  type ConstitutionalEventBus,
} from '@core/engine/ConstitutionalEventBus.ts';
import { createAudioSlice } from './slices/audioSlice.ts';
import { createFrenzySlice } from './slices/frenzySlice.ts';
import { createIntegritySlice, type SliceDeps } from './slices/integritySlice.ts';
import { createPasalInventorySlice } from './slices/pasalInventorySlice.ts';
import { createProgressSlice, FIRST_CHAPTER_ID } from './slices/progressSlice.ts';
import { createPsychologicalSlice } from './slices/psychologicalSlice.ts';
import type { ConstitutionalSnapshot, ConstitutionalState } from './types.ts';

export interface StoreOptions {
  bus?: ConstitutionalEventBus;
  now?: () => number;
}

const defaultNow = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createConstitutionalStore(options: StoreOptions = {}) {
  const deps: SliceDeps = {
    bus: options.bus ?? constitutionalBus,
    now: options.now ?? defaultNow,
  };

  return createStore<ConstitutionalState>()(
    subscribeWithSelector((set, get, api) => ({
      ...createIntegritySlice(deps)(set, get, api),
      ...createPsychologicalSlice(deps)(set, get, api),
      ...createPasalInventorySlice(deps)(set, get, api),
      ...createAudioSlice(deps)(set, get, api),
      ...createProgressSlice(deps)(set, get, api),
      ...createFrenzySlice(deps)(set, get, api),

      serialize: (): ConstitutionalSnapshot => {
        const s = get();
        return structuredCloneSafe({
          version: 1,
          integrity: s.integrity,
          integrityTarget: s.integrityTarget,
          integrityEvents: s.integrityEvents,
          cognitiveLoad: s.cognitiveLoad,
          argumentativeCoherence: s.argumentativeCoherence,
          constitutionalEmpathy: s.constitutionalEmpathy,
          inventory: s.inventory,
          masterVolume: s.masterVolume,
          sfxVolume: s.sfxVolume,
          muted: s.muted,
          activeLayers: s.activeLayers,
          currentChapterId: s.currentChapterId,
          chapterAttempts: s.chapterAttempts,
          unlockedChapters: s.unlockedChapters,
          completedChapters: s.completedChapters,
          totalPlayTimeMs: s.totalPlayTimeMs,
          frenzyActive: s.frenzyActive,
          frenzyCount: s.frenzyCount,
        });
      },

      hydrate: (snapshot) => {
        if (snapshot.version !== 1) {
          throw new Error(`Versi snapshot tidak dikenal: ${String(snapshot.version)}`);
        }
        const data = structuredCloneSafe(snapshot);
        set({
          integrity: data.integrity,
          integrityTarget: data.integrityTarget,
          integrityEmitted: data.integrity,
          integrityEvents: data.integrityEvents,
          cognitiveLoad: data.cognitiveLoad,
          argumentativeCoherence: data.argumentativeCoherence,
          constitutionalEmpathy: data.constitutionalEmpathy,
          inventory: data.inventory,
          masterVolume: data.masterVolume,
          sfxVolume: data.sfxVolume,
          muted: data.muted,
          activeLayers: data.activeLayers,
          currentChapterId: data.currentChapterId,
          chapterStartedAt: data.currentChapterId ? deps.now() : null,
          chapterAttempts: data.chapterAttempts,
          unlockedChapters: data.unlockedChapters.length
            ? data.unlockedChapters
            : [FIRST_CHAPTER_ID],
          completedChapters: data.completedChapters,
          totalPlayTimeMs: data.totalPlayTimeMs,
          frenzyActive: data.frenzyActive,
          frenzyStartedAt: data.frenzyActive ? deps.now() : null,
          frenzyCount: data.frenzyCount,
        });
      },

      reset: () => {
        const fresh = createConstitutionalStore(options).getState().serialize();
        get().hydrate(fresh);
      },
    })),
  );
}

export type ConstitutionalStore = ReturnType<typeof createConstitutionalStore>;

/** Store global aplikasi. */
export const constitutionalStore: ConstitutionalStore = createConstitutionalStore();
