import type { StateCreator } from 'zustand/vanilla';
import type { AudioSlice, ConstitutionalState } from '../types.ts';
import { clamp01, type SliceDeps } from './integritySlice.ts';

export const createAudioSlice =
  (deps: SliceDeps): StateCreator<ConstitutionalState, [], [], AudioSlice> =>
  (set, get) => ({
    masterVolume: 0.8,
    sfxVolume: 1,
    muted: false,
    audioUnlocked: false,
    activeLayers: { foundation: false, crisis: false, frenzy: false },

    setMasterVolume: (v) => set({ masterVolume: clamp01(v) }),
    setSfxVolume: (v) => set({ sfxVolume: clamp01(v) }),
    setMuted: (muted) => set({ muted }),
    setAudioUnlocked: (unlocked) => {
      if (get().audioUnlocked === unlocked) return;
      set({ audioUnlocked: unlocked });
      if (unlocked) deps.bus.emit('AUDIO_UNLOCKED', { at: deps.now() });
    },
    setLayer: (layer, active) => {
      if (get().activeLayers[layer] === active) return;
      set({ activeLayers: { ...get().activeLayers, [layer]: active } });
    },
  });
