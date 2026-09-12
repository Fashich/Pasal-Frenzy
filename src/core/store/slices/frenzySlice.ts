import type { StateCreator } from 'zustand/vanilla';
import {
  FRENZY_COGNITIVE_LOAD_THRESHOLD,
  FRENZY_INTEGRITY_THRESHOLD,
  FRENZY_RECOVER_COGNITIVE_LOAD,
  FRENZY_RECOVER_INTEGRITY,
  type ConstitutionalState,
  type FrenzySlice,
} from '../types.ts';
import type { SliceDeps } from './integritySlice.ts';

export const createFrenzySlice =
  (deps: SliceDeps): StateCreator<ConstitutionalState, [], [], FrenzySlice> =>
  (set, get) => ({
    frenzyActive: false,
    frenzyStartedAt: null,
    frenzyCount: 0,

    evaluateFrenzy: () => {
      const { frenzyActive, integrity, cognitiveLoad } = get();
      if (
        !frenzyActive &&
        integrity < FRENZY_INTEGRITY_THRESHOLD &&
        cognitiveLoad > FRENZY_COGNITIVE_LOAD_THRESHOLD
      ) {
        get().activateFrenzy('ambang');
        return;
      }
      if (
        frenzyActive &&
        integrity >= FRENZY_RECOVER_INTEGRITY &&
        cognitiveLoad <= FRENZY_RECOVER_COGNITIVE_LOAD
      ) {
        get().deactivateFrenzy('teratasi');
      }
    },

    activateFrenzy: (trigger) => {
      if (get().frenzyActive) return;
      set({ frenzyActive: true, frenzyStartedAt: deps.now(), frenzyCount: get().frenzyCount + 1 });
      get().setLayer('frenzy', true);
      deps.bus.emit('FRENZY_MODE_ACTIVATED', {
        trigger,
        integrity: get().integrity,
        cognitiveLoad: get().cognitiveLoad,
      });
    },

    deactivateFrenzy: (reason) => {
      if (!get().frenzyActive) return;
      const startedAt = get().frenzyStartedAt ?? deps.now();
      set({ frenzyActive: false, frenzyStartedAt: null });
      get().setLayer('frenzy', false);
      deps.bus.emit('FRENZY_MODE_DEACTIVATED', {
        reason,
        durationMs: Math.max(0, deps.now() - startedAt),
      });
    },
  });
