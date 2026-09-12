import type { StateCreator } from 'zustand/vanilla';
import type { ConstitutionalState, PasalInventorySlice, PasalMastery } from '../types.ts';
import { clamp01, type SliceDeps } from './integritySlice.ts';

/** kenaikan mastery per penggunaan sukses; menurun saat gagal (tidak sampai nol) */
export const MASTERY_GAIN_SUCCESS = 0.1;
export const MASTERY_LOSS_FAILURE = 0.03;
/** bonus mastery jika pasal dipakai bersama pasal yang belum pernah menjadi tetangganya (konteks baru) */
export const MASTERY_NEW_CONTEXT_BONUS = 0.04;

export const createPasalInventorySlice =
  (deps: SliceDeps): StateCreator<ConstitutionalState, [], [], PasalInventorySlice> =>
  (set, get) => ({
    inventory: {},

    collectPasal: (pasalId, unitId, source) => {
      const now = deps.now();
      const current = get().inventory[pasalId];
      const entry: PasalMastery = current
        ? {
            ...current,
            collectedUnits: current.collectedUnits.includes(unitId)
              ? current.collectedUnits
              : [...current.collectedUnits, unitId],
          }
        : {
            pasalId,
            masteryLevel: 0,
            contextualNetwork: {},
            jurisprudentialWeight: 0,
            usageCount: 0,
            successCount: 0,
            collectedUnits: [unitId],
            firstCollectedAt: now,
            lastUsedAt: null,
          };
      set({ inventory: { ...get().inventory, [pasalId]: entry } });
      deps.bus.emit('PASAL_COLLECTED', { pasalId, unitId, source });
    },

    recordArgumentUse: (pasalIds, success, strength) => {
      const now = deps.now();
      const ids = Array.from(new Set(pasalIds));
      const inventory = { ...get().inventory };
      for (const id of ids) {
        const base: PasalMastery = inventory[id] ?? {
          pasalId: id,
          masteryLevel: 0,
          contextualNetwork: {},
          jurisprudentialWeight: 0,
          usageCount: 0,
          successCount: 0,
          collectedUnits: [],
          firstCollectedAt: now,
          lastUsedAt: null,
        };
        const network = { ...base.contextualNetwork };
        let newContexts = 0;
        if (success) {
          for (const other of ids) {
            if (other === id) continue;
            if (!(other in network)) newContexts += 1;
            network[other] = (network[other] ?? 0) + 1;
          }
        }
        const masteryDelta = success
          ? MASTERY_GAIN_SUCCESS + MASTERY_NEW_CONTEXT_BONUS * newContexts
          : -MASTERY_LOSS_FAILURE;
        inventory[id] = {
          ...base,
          masteryLevel: clamp01(base.masteryLevel + masteryDelta),
          contextualNetwork: network,
          jurisprudentialWeight: success
            ? base.jurisprudentialWeight + Math.max(0, strength)
            : base.jurisprudentialWeight,
          usageCount: base.usageCount + 1,
          successCount: base.successCount + (success ? 1 : 0),
          lastUsedAt: now,
        };
      }
      set({ inventory });
    },

    hasPasal: (pasalId) => pasalId in get().inventory,
    getMastery: (pasalId) => get().inventory[pasalId]?.masteryLevel ?? 0,
  });
