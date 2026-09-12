import type { StateCreator } from 'zustand/vanilla';
import type { ConstitutionalState, PsychologicalSlice, PsychologicalState } from '../types.ts';
import { clamp01, type SliceDeps } from './integritySlice.ts';

/**
 * Bobot rata-rata tertimbang (PRD Bagian XI): koherensi argumen paling menentukan,
 * empati konstitusional menyusul, beban kognitif dihitung terbalik (beban tinggi = sehat rendah).
 */
export const PSYCH_WEIGHTS = { coherence: 0.4, empathy: 0.35, load: 0.25 } as const;

export function overallHealthOf(s: PsychologicalState): number {
  return clamp01(
    s.argumentativeCoherence * PSYCH_WEIGHTS.coherence +
      s.constitutionalEmpathy * PSYCH_WEIGHTS.empathy +
      (1 - s.cognitiveLoad) * PSYCH_WEIGHTS.load,
  );
}

export const createPsychologicalSlice =
  (deps: SliceDeps): StateCreator<ConstitutionalState, [], [], PsychologicalSlice> =>
  (set, get) => {
    const emit = () => {
      const { cognitiveLoad, argumentativeCoherence, constitutionalEmpathy } = get();
      deps.bus.emit('PSYCHOLOGICAL_STATE_CHANGED', {
        cognitiveLoad,
        argumentativeCoherence,
        constitutionalEmpathy,
        overallHealth: overallHealthOf({
          cognitiveLoad,
          argumentativeCoherence,
          constitutionalEmpathy,
        }),
      });
      get().evaluateFrenzy();
    };

    return {
      cognitiveLoad: 0.2,
      argumentativeCoherence: 0.6,
      constitutionalEmpathy: 0.5,

      updatePsychological: (partial) => {
        const next: Partial<PsychologicalState> = {};
        if (partial.cognitiveLoad !== undefined)
          next.cognitiveLoad = clamp01(partial.cognitiveLoad);
        if (partial.argumentativeCoherence !== undefined)
          next.argumentativeCoherence = clamp01(partial.argumentativeCoherence);
        if (partial.constitutionalEmpathy !== undefined)
          next.constitutionalEmpathy = clamp01(partial.constitutionalEmpathy);
        set(next);
        emit();
      },

      nudgePsychological: (delta) => {
        const s = get();
        get().updatePsychological({
          cognitiveLoad: s.cognitiveLoad + (delta.cognitiveLoad ?? 0),
          argumentativeCoherence: s.argumentativeCoherence + (delta.argumentativeCoherence ?? 0),
          constitutionalEmpathy: s.constitutionalEmpathy + (delta.constitutionalEmpathy ?? 0),
        });
      },

      getOverallPsychologicalHealth: () => overallHealthOf(get()),
    };
  };
