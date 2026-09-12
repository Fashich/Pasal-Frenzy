import type { StateCreator } from 'zustand/vanilla';
import type {
  ConstitutionalEventBus,
  IntegrityLevel,
} from '@core/engine/ConstitutionalEventBus.ts';
import {
  INTEGRITY_EMIT_THRESHOLD,
  INTEGRITY_EVENT_LIMIT,
  INTEGRITY_SMOOTHING_TAU,
  type ConstitutionalState,
  type IntegritySlice,
} from '../types.ts';

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export function integrityLevelOf(value: number): IntegrityLevel {
  if (value >= 0.7) return 'stabil';
  if (value >= 0.4) return 'tertekan';
  if (value >= 0.2) return 'krisis';
  return 'runtuh';
}

export interface SliceDeps {
  bus: ConstitutionalEventBus;
  now: () => number;
}

export const createIntegritySlice =
  (deps: SliceDeps): StateCreator<ConstitutionalState, [], [], IntegritySlice> =>
  (set, get) => {
    const pushEvent = (delta: number, value: number, reason: string) => {
      const events = get().integrityEvents.concat({ at: deps.now(), delta, value, reason });
      if (events.length > INTEGRITY_EVENT_LIMIT)
        events.splice(0, events.length - INTEGRITY_EVENT_LIMIT);
      return events;
    };

    const maybeEmit = (reason: string) => {
      const { integrity, integrityEmitted } = get();
      const delta = integrity - integrityEmitted;
      if (Math.abs(delta) <= INTEGRITY_EMIT_THRESHOLD) return;
      set({ integrityEmitted: integrity });
      deps.bus.emit('CONSTITUTIONAL_INTEGRITY_CHANGED', {
        value: integrity,
        previous: integrityEmitted,
        delta,
        level: integrityLevelOf(integrity),
        reason,
      });
      get().evaluateFrenzy();
    };

    return {
      integrity: 1,
      integrityTarget: 1,
      integrityEmitted: 1,
      integrityEvents: [],

      updateIntegrity: (delta, reason) => {
        const target = clamp01(get().integrityTarget + delta);
        set({ integrityTarget: target, integrityEvents: pushEvent(delta, target, reason) });
      },

      setIntegrity: (value, reason) => {
        const v = clamp01(value);
        const delta = v - get().integrityTarget;
        set({
          integrity: v,
          integrityTarget: v,
          integrityEvents: pushEvent(delta, v, reason),
        });
        maybeEmit(reason);
      },

      tickIntegrity: (dtSeconds) => {
        const { integrity, integrityTarget } = get();
        if (integrity === integrityTarget) return;
        const dt = dtSeconds > 0 ? dtSeconds : 0;
        const alpha = 1 - Math.exp(-dt / INTEGRITY_SMOOTHING_TAU);
        let next = integrity + (integrityTarget - integrity) * alpha;
        if (Math.abs(integrityTarget - next) < 0.0005) next = integrityTarget;
        set({ integrity: next });
        const last = get().integrityEvents.at(-1);
        maybeEmit(last?.reason ?? 'smoothing');
      },

      getIntegrityLevel: () => integrityLevelOf(get().integrity),
    };
  };
