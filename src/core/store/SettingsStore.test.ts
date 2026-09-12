import { describe, expect, it } from 'vitest';
import {
  createSettingsStore,
  loadSettingsFromStorage,
  persistSettingsToStorage,
  SETTINGS_STORAGE_KEY,
} from './SettingsStore.ts';

describe('SettingsStore', () => {
  it('consent riset opt-in mencatat waktu dan kode partisipan, dan bisa dicabut', () => {
    const store = createSettingsStore(() => 1234);
    expect(store.getState().researchConsent).toBe(false);
    store.getState().setResearchConsent(true, 'P-001');
    expect(store.getState()).toMatchObject({
      researchConsent: true,
      researchConsentAt: 1234,
      participantCode: 'P-001',
    });
    store.getState().setResearchConsent(false);
    expect(store.getState()).toMatchObject({
      researchConsent: false,
      researchConsentAt: null,
      participantCode: null,
    });
  });

  it('hydrate mengabaikan nilai yang tidak valid', () => {
    const store = createSettingsStore();
    store.getState().hydrate({
      qualityPreset: 'ultra' as never,
      reducedMotion: 'aktif',
      introSeen: 'ya' as never,
    });
    expect(store.getState().qualityPreset).toBe('sedang');
    expect(store.getState().reducedMotion).toBe('aktif');
    expect(store.getState().introSeen).toBe(false);
  });

  it('persistensi localStorage menulis saat berubah dan memuat kembali', () => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    const store = createSettingsStore();
    const stop = persistSettingsToStorage(store);
    store.getState().setQuality('tinggi', false);
    store.getState().setIntroSeen(true);
    stop();
    const fresh = createSettingsStore();
    loadSettingsFromStorage(fresh);
    expect(fresh.getState().qualityPreset).toBe('tinggi');
    expect(fresh.getState().qualityAuto).toBe(false);
    expect(fresh.getState().introSeen).toBe(true);
  });
});
