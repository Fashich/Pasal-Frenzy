import { describe, expect, it, vi } from 'vitest';
import { ConstitutionalEventBus } from '@core/engine/ConstitutionalEventBus.ts';
import { createConstitutionalStore } from './ConstitutionalStore.ts';
import { integrityLevelOf } from './slices/integritySlice.ts';
import { overallHealthOf } from './slices/psychologicalSlice.ts';

function setup() {
  let t = 0;
  const now = () => t;
  const bus = new ConstitutionalEventBus({ now });
  const store = createConstitutionalStore({ bus, now });
  return { store, bus, advance: (ms: number) => (t += ms) };
}

describe('integritySlice', () => {
  it('menghaluskan perubahan: target berubah seketika, nilai render mendekat per tick', () => {
    const { store } = setup();
    store.getState().updateIntegrity(-0.5, 'serangan');
    expect(store.getState().integrityTarget).toBeCloseTo(0.5);
    expect(store.getState().integrity).toBe(1);
    store.getState().tickIntegrity(0.1);
    const afterOne = store.getState().integrity;
    expect(afterOne).toBeLessThan(1);
    expect(afterOne).toBeGreaterThan(0.5);
    for (let i = 0; i < 60; i++) store.getState().tickIntegrity(0.1);
    expect(store.getState().integrity).toBeCloseTo(0.5, 3);
  });

  it('memancarkan CONSTITUTIONAL_INTEGRITY_CHANGED hanya saat berubah lebih dari 0.01', () => {
    const { store, bus } = setup();
    const listener = vi.fn();
    bus.on('CONSTITUTIONAL_INTEGRITY_CHANGED', listener);
    store.getState().updateIntegrity(-0.005, 'kecil');
    for (let i = 0; i < 30; i++) store.getState().tickIntegrity(0.1);
    expect(listener).not.toHaveBeenCalled();
    store.getState().setIntegrity(0.3, 'runtuh');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      value: 0.3,
      level: 'krisis',
      reason: 'runtuh',
    });
  });

  it('membatasi nilai ke 0..1 dan mencatat riwayat event', () => {
    const { store } = setup();
    store.getState().updateIntegrity(+3, 'bonus');
    expect(store.getState().integrityTarget).toBe(1);
    store.getState().updateIntegrity(-9, 'bencana');
    expect(store.getState().integrityTarget).toBe(0);
    expect(store.getState().integrityEvents.map((e) => e.reason)).toEqual(['bonus', 'bencana']);
  });

  it('tingkat integritas mengikuti ambang PRD', () => {
    expect(integrityLevelOf(0.95)).toBe('stabil');
    expect(integrityLevelOf(0.5)).toBe('tertekan');
    expect(integrityLevelOf(0.25)).toBe('krisis');
    expect(integrityLevelOf(0.1)).toBe('runtuh');
  });
});

describe('psychologicalSlice', () => {
  it('menghitung kesehatan tertimbang dan memancarkan event', () => {
    const { store, bus } = setup();
    const listener = vi.fn();
    bus.on('PSYCHOLOGICAL_STATE_CHANGED', listener);
    store
      .getState()
      .updatePsychological({
        cognitiveLoad: 0,
        argumentativeCoherence: 1,
        constitutionalEmpathy: 1,
      });
    expect(store.getState().getOverallPsychologicalHealth()).toBeCloseTo(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(
      overallHealthOf({ cognitiveLoad: 1, argumentativeCoherence: 0, constitutionalEmpathy: 0 }),
    ).toBe(0);
  });

  it('nudge menjumlahkan dan tetap dibatasi 0..1', () => {
    const { store } = setup();
    store.getState().nudgePsychological({ cognitiveLoad: +5 });
    expect(store.getState().cognitiveLoad).toBe(1);
  });
});

describe('frenzySlice', () => {
  it('aktif ketika integrity < 0.35 dan cognitiveLoad > 0.7, pulih dengan histeresis', () => {
    const { store, bus, advance } = setup();
    const on = vi.fn();
    const off = vi.fn();
    bus.on('FRENZY_MODE_ACTIVATED', on);
    bus.on('FRENZY_MODE_DEACTIVATED', off);

    store.getState().updatePsychological({ cognitiveLoad: 0.8 });
    expect(store.getState().frenzyActive).toBe(false);
    store.getState().setIntegrity(0.3, 'tekanan');
    expect(store.getState().frenzyActive).toBe(true);
    expect(store.getState().activeLayers.frenzy).toBe(true);
    expect(on).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'ambang', integrity: 0.3, cognitiveLoad: 0.8 }),
      expect.anything(),
    );

    // naik ke 0.45 belum cukup (histeresis 0.5)
    store.getState().setIntegrity(0.45, 'pulih sebagian');
    expect(store.getState().frenzyActive).toBe(true);
    advance(4000);
    store.getState().setIntegrity(0.6, 'pulih');
    expect(store.getState().frenzyActive).toBe(true); // cognitiveLoad masih 0.8
    store.getState().updatePsychological({ cognitiveLoad: 0.4 });
    expect(store.getState().frenzyActive).toBe(false);
    expect(off).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'teratasi', durationMs: 4000 }),
      expect.anything(),
    );
  });

  it('bisa dipicu naratif dan tidak aktif ganda', () => {
    const { store } = setup();
    store.getState().activateFrenzy('naratif');
    store.getState().activateFrenzy('naratif');
    expect(store.getState().frenzyCount).toBe(1);
  });
});

describe('pasalInventorySlice', () => {
  it('mengumpulkan pasal dan menaikkan mastery serta jaringan kontekstual saat argumen sukses', () => {
    const { store, bus } = setup();
    const collected = vi.fn();
    bus.on('PASAL_COLLECTED', collected);
    store.getState().collectPasal('28A', '28A', 'labirin');
    store.getState().collectPasal('28J', '28J-2', 'labirin');
    store.getState().collectPasal('28A', '28A', 'labirin');
    expect(collected).toHaveBeenCalledTimes(3);
    expect(Object.keys(store.getState().inventory)).toEqual(['28A', '28J']);

    store.getState().recordArgumentUse(['28A', '28J'], true, 0.8);
    const a = store.getState().inventory['28A'];
    expect(a?.masteryLevel).toBeCloseTo(0.14); // 0.1 + bonus konteks baru 0.04
    expect(a?.contextualNetwork).toEqual({ '28J': 1 });
    expect(a?.jurisprudentialWeight).toBeCloseTo(0.8);
    expect(a?.successCount).toBe(1);

    store.getState().recordArgumentUse(['28A'], false, 1);
    expect(store.getState().inventory['28A']?.masteryLevel).toBeCloseTo(0.11);
    expect(store.getState().inventory['28A']?.jurisprudentialWeight).toBeCloseTo(0.8);
    expect(store.getState().getMastery('33')).toBe(0);
  });
});

describe('progressSlice', () => {
  it('mencatat percobaan, durasi, dan hasil bab; menutup Frenzy saat bab selesai', () => {
    const { store, bus, advance } = setup();
    const done = vi.fn();
    bus.on('CHAPTER_COMPLETED', done);
    store.getState().startChapter('case-1');
    store.getState().activateFrenzy('naratif');
    advance(12_000);
    store.getState().completeChapter('case-1', 'menang');
    expect(store.getState().completedChapters['case-1']).toMatchObject({
      outcome: 'menang',
      attempts: 1,
      bestDurationMs: 12_000,
    });
    expect(store.getState().frenzyActive).toBe(false);
    expect(done).toHaveBeenCalledWith(
      expect.objectContaining({ chapterId: 'case-1', durationMs: 12_000 }),
      expect.anything(),
    );
    store.getState().startChapter('case-1');
    expect(store.getState().chapterAttempts['case-1']).toBe(2);
  });

  it('membuka bab sekali saja dan menjumlahkan waktu main', () => {
    const { store } = setup();
    store.getState().unlockChapter('case-1');
    store.getState().unlockChapter('case-1');
    expect(store.getState().unlockedChapters).toEqual(['prolog', 'case-1']);
    store.getState().addPlayTime(500);
    store.getState().addPlayTime(-5);
    expect(store.getState().totalPlayTimeMs).toBe(500);
  });
});

describe('serialize / hydrate', () => {
  it('menghasilkan snapshot murni yang bisa dimuat kembali ke store lain', () => {
    const { store } = setup();
    store.getState().setIntegrity(0.42, 'uji');
    store.getState().collectPasal('33', '33-2', 'smog');
    store.getState().unlockChapter('case-2');
    store.getState().setMasterVolume(0.3);
    const snapshot = store.getState().serialize();
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);

    const other = setup().store;
    other.getState().hydrate(snapshot);
    expect(other.getState().integrity).toBeCloseTo(0.42);
    expect(other.getState().inventory['33']?.collectedUnits).toEqual(['33-2']);
    expect(other.getState().unlockedChapters).toEqual(['prolog', 'case-2']);
    expect(other.getState().masterVolume).toBe(0.3);
    expect(typeof other.getState().updateIntegrity).toBe('function');
  });

  it('subscribeWithSelector hanya memanggil listener slice yang berubah', () => {
    const { store } = setup();
    const audioListener = vi.fn();
    const integrityListener = vi.fn();
    store.subscribe((s) => s.masterVolume, audioListener);
    store.subscribe((s) => s.integrity, integrityListener);
    store.getState().setIntegrity(0.7, 'uji');
    expect(integrityListener).toHaveBeenCalledTimes(1);
    expect(audioListener).not.toHaveBeenCalled();
  });
});
