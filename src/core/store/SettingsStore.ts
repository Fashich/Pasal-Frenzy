/**
 * SettingsStore — preferensi pemain yang bertahan lintas sesi dan tidak
 * termasuk state permainan (dipisah dari ConstitutionalStore agar lima slice
 * PRD tetap murni state game).
 */
import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import type { QualityPreset } from '@core/engine/ConstitutionalEventBus.ts';

export interface SettingsState {
  qualityPreset: QualityPreset;
  qualityAuto: boolean;
  reducedMotion: 'sistem' | 'aktif' | 'nonaktif';
  introSeen: boolean;
  /** persetujuan eksplisit pencatatan data riset (opt-in, default false) */
  researchConsent: boolean;
  researchConsentAt: number | null;
  participantCode: string | null;
  setQuality: (preset: QualityPreset, auto: boolean) => void;
  setReducedMotion: (mode: SettingsState['reducedMotion']) => void;
  setIntroSeen: (seen: boolean) => void;
  setResearchConsent: (consent: boolean, participantCode?: string | null) => void;
  hydrate: (data: Partial<SettingsSnapshot>) => void;
  serialize: () => SettingsSnapshot;
}

export interface SettingsSnapshot {
  qualityPreset: QualityPreset;
  qualityAuto: boolean;
  reducedMotion: SettingsState['reducedMotion'];
  introSeen: boolean;
  researchConsent: boolean;
  researchConsentAt: number | null;
  participantCode: string | null;
}

export const SETTINGS_STORAGE_KEY = 'pasal-frenzy.settings.v1';

export function createSettingsStore(now: () => number = () => Date.now()) {
  return createStore<SettingsState>()(
    subscribeWithSelector((set, get) => ({
      qualityPreset: 'sedang',
      qualityAuto: true,
      reducedMotion: 'sistem',
      introSeen: false,
      researchConsent: false,
      researchConsentAt: null,
      participantCode: null,

      setQuality: (preset, auto) => set({ qualityPreset: preset, qualityAuto: auto }),
      setReducedMotion: (mode) => set({ reducedMotion: mode }),
      setIntroSeen: (seen) => set({ introSeen: seen }),
      setResearchConsent: (consent, participantCode = null) =>
        set({
          researchConsent: consent,
          researchConsentAt: consent ? now() : null,
          participantCode: consent ? participantCode : null,
        }),

      hydrate: (data) => {
        const next: Partial<SettingsSnapshot> = {};
        if (
          data.qualityPreset === 'rendah' ||
          data.qualityPreset === 'sedang' ||
          data.qualityPreset === 'tinggi'
        )
          next.qualityPreset = data.qualityPreset;
        if (typeof data.qualityAuto === 'boolean') next.qualityAuto = data.qualityAuto;
        if (
          data.reducedMotion === 'sistem' ||
          data.reducedMotion === 'aktif' ||
          data.reducedMotion === 'nonaktif'
        )
          next.reducedMotion = data.reducedMotion;
        if (typeof data.introSeen === 'boolean') next.introSeen = data.introSeen;
        if (typeof data.researchConsent === 'boolean') next.researchConsent = data.researchConsent;
        if (typeof data.researchConsentAt === 'number' || data.researchConsentAt === null)
          next.researchConsentAt = data.researchConsentAt;
        if (typeof data.participantCode === 'string' || data.participantCode === null)
          next.participantCode = data.participantCode;
        set(next);
      },

      serialize: () => {
        const s = get();
        return {
          qualityPreset: s.qualityPreset,
          qualityAuto: s.qualityAuto,
          reducedMotion: s.reducedMotion,
          introSeen: s.introSeen,
          researchConsent: s.researchConsent,
          researchConsentAt: s.researchConsentAt,
          participantCode: s.participantCode,
        };
      },
    })),
  );
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;

export const settingsStore = createSettingsStore();

/** Persistensi ringan lewat localStorage (IndexedDB dipakai untuk state game). */
export function loadSettingsFromStorage(store: SettingsStore = settingsStore): void {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    store.getState().hydrate(JSON.parse(raw) as Partial<SettingsSnapshot>);
  } catch {
    /* localStorage bisa tidak tersedia (mode privat, kuota); abaikan */
  }
}

export function persistSettingsToStorage(store: SettingsStore = settingsStore): () => void {
  const write = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(store.getState().serialize()));
    } catch {
      /* abaikan */
    }
  };
  write();
  return store.subscribe((s) => s.serialize(), write, {
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
}
