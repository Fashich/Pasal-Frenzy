import { describe, expect, it } from 'vitest';
import { LocalStorageAdapter, type StorageLike } from './LocalStorageAdapter.ts';
import { verifyPin } from './pin.ts';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('LocalStorageAdapter (mode web, tanpa server)', () => {
  it('membuat akun, mengunci dengan PIN ter-hash, dan bertahan setelah dimuat ulang', async () => {
    const storage = memoryStorage();
    const a = new LocalStorageAdapter(storage);
    expect(a.mode).toBe('web');
    const p = await a.createProfile({ name: 'Fashich', pin: '1234' });
    expect(p.pinHash).toMatch(/^(sha256|fnv):/);
    expect(p.pinHash).not.toContain('1234');
    expect(await verifyPin('1234', p)).toBe(true);
    expect(await verifyPin('9999', p)).toBe(false);

    const again = new LocalStorageAdapter(storage);
    expect((await again.listProfiles()).map((x) => x.name)).toEqual(['Fashich']);
  });

  it('akun tanpa PIN selalu lolos verifikasi', async () => {
    const a = new LocalStorageAdapter(memoryStorage());
    const p = await a.createProfile({ name: 'Tamu' });
    expect(p.pinHash).toBeNull();
    expect(await verifyPin('', p)).toBe(true);
  });

  it('menyimpan progres, mastery, riwayat, sesi riset per akun dan ekspor tanpa hash PIN', async () => {
    const a = new LocalStorageAdapter(memoryStorage());
    const p = await a.createProfile({ name: 'Uji', pin: '2468', participantCode: 'P-01' });
    const q = await a.createProfile({ name: 'Lain' });
    await a.saveChapterProgress({
      profileId: p.id,
      chapterId: 'prolog',
      lastState: null,
      attempts: 2,
      completedAt: 1,
      outcome: 'menang',
      bestDurationMs: 3000,
    });
    await a.saveMastery(p.id, {
      '1': {
        pasalId: '1',
        masteryLevel: 0.5,
        contextualNetwork: {},
        jurisprudentialWeight: 0,
        usageCount: 1,
        successCount: 1,
        collectedUnits: ['1-3'],
        firstCollectedAt: 1,
        lastUsedAt: null,
      },
    });
    const id = await a.appendHistory({
      profileId: p.id,
      chapterId: 'prolog',
      argumentChain: ['1-3'],
      outcome: 'berhasil',
      strength: 0.7,
      timestamp: 2,
    });
    expect(id).toBe(1);
    await a.saveResearchSession({
      id: 's1',
      profileId: p.id,
      participantCode: 'P-01',
      chapterId: 'prolog',
      startedAt: 1,
      endedAt: 2,
      appVersion: '0.1.0',
      platform: 'test',
      events: [],
    });
    await a.addPlayTime(p.id, 60000);

    expect((await a.getChapterProgress(p.id, 'prolog'))?.outcome).toBe('menang');
    expect(await a.listChapterProgress(q.id)).toHaveLength(0);
    expect((await a.loadMastery(p.id))['1']?.masteryLevel).toBe(0.5);
    expect(await a.listHistory(p.id)).toHaveLength(1);
    expect(await a.listResearchSessions(p.id)).toHaveLength(1);
    expect((await a.getProfile(p.id))?.totalPlayTimeMs).toBe(60000);

    const exp = await a.exportProfile(p.id, '0.1.0');
    expect(exp?.profile.pinHash).toBeNull();
    expect(exp?.profile.pinSalt).toBeNull();
    expect(exp?.pasalMastery[0]?.profileId).toBe(p.id);

    await a.deleteResearchSessions(p.id);
    expect(await a.listResearchSessions(p.id)).toHaveLength(0);
    await a.deleteProfile(p.id);
    expect(await a.getProfile(p.id)).toBeUndefined();
    expect(await a.listChapterProgress(p.id)).toHaveLength(0);
    expect(await a.listHistory(p.id)).toHaveLength(0);
    expect((await a.listProfiles()).map((x) => x.id)).toEqual([q.id]);
  });

  it('tetap berjalan bila storage menolak (mode privat/kuota)', async () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => undefined,
    };
    const a = new LocalStorageAdapter(broken);
    const p = await a.createProfile({ name: 'Privat' });
    expect((await a.getProfile(p.id))?.name).toBe('Privat');
  });
});
