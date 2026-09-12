import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameDB, researchSessionsToCsv } from './GameDB.ts';

let counter = 0;

describe('GameDB (IndexedDB)', () => {
  let db: GameDB;

  beforeEach(async () => {
    counter += 1;
    db = await GameDB.open(`pf-test-${counter}`);
  });

  it('membuat dan mendaftar profil, terbaru di depan', async () => {
    const a = await db.createProfile({ name: 'Fashich' });
    const b = await db.createProfile({ name: 'Peserta 02', participantCode: 'P-002' });
    await db.touchProfile(a.id);
    const list = await db.listProfiles();
    expect(list.map((p) => p.name)).toEqual(['Fashich', 'Peserta 02']);
    expect(b.participantCode).toBe('P-002');
    expect(a.color).not.toBe(b.color);
  });

  it('menyimpan progres bab, mastery, riwayat, dan sesi riset per profil', async () => {
    const p = await db.createProfile({ name: 'Uji' });
    await db.saveChapterProgress({
      profileId: p.id,
      chapterId: 'prolog',
      lastState: null,
      attempts: 2,
      completedAt: 123,
      outcome: 'menang',
      bestDurationMs: 4000,
    });
    await db.saveMastery(p.id, {
      '28A': {
        pasalId: '28A',
        masteryLevel: 0.4,
        contextualNetwork: { '28J': 1 },
        jurisprudentialWeight: 1.2,
        usageCount: 3,
        successCount: 2,
        collectedUnits: ['28A'],
        firstCollectedAt: 1,
        lastUsedAt: 2,
      },
    });
    await db.appendHistory({
      profileId: p.id,
      chapterId: 'prolog',
      argumentChain: ['28A', '28J-2'],
      outcome: 'berhasil',
      strength: 0.8,
      timestamp: 5,
    });
    await db.saveResearchSession({
      id: 's1',
      profileId: p.id,
      participantCode: null,
      chapterId: 'prolog',
      startedAt: 10,
      endedAt: 20,
      appVersion: '0.1.0',
      platform: 'test',
      events: [{ t: 0, type: 'mulai' }],
    });

    expect((await db.getChapterProgress(p.id, 'prolog'))?.outcome).toBe('menang');
    expect((await db.loadMastery(p.id))['28A']?.masteryLevel).toBe(0.4);
    expect(await db.listHistory(p.id)).toHaveLength(1);
    const exp = await db.exportProfile(p.id, '0.1.0');
    expect(exp?.researchSessions).toHaveLength(1);
    expect(exp?.pasalMastery[0]?.profileId).toBe(p.id);
  });

  it('menyimpan PIN sebagai hash dan tidak mengekspornya', async () => {
    const p = await db.createProfile({ name: 'Kunci', pin: '1234' });
    expect(p.pinHash).toMatch(/^(sha256|fnv):/);
    expect(p.pinSalt).toHaveLength(32);
    const exp = await db.exportProfile(p.id, '0.1.0');
    expect(exp?.profile.pinHash).toBeNull();
    expect((await db.createProfile({ name: 'Bebas' })).pinHash).toBeNull();
  });

  it('menghapus profil beserta seluruh datanya', async () => {
    const p = await db.createProfile({ name: 'Hapus' });
    await db.saveChapterProgress({
      profileId: p.id,
      chapterId: 'prolog',
      lastState: null,
      attempts: 1,
      completedAt: null,
      outcome: null,
      bestDurationMs: null,
    });
    await db.deleteProfile(p.id);
    expect(await db.getProfile(p.id)).toBeUndefined();
    expect(await db.listChapterProgress(p.id)).toHaveLength(0);
  });
});

describe('researchSessionsToCsv', () => {
  it('menghasilkan satu baris per event dengan escaping', () => {
    const csv = researchSessionsToCsv([
      {
        id: 's1',
        profileId: 'p',
        participantCode: 'P-1',
        chapterId: 'prolog',
        startedAt: 0,
        endedAt: 1,
        appVersion: '0.1.0',
        platform: 'web',
        events: [{ t: 12, type: 'kata,dipilih', data: { teks: 'Bahwa' } }],
      },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"kata,dipilih"');
    expect(lines[1]).toContain('P-1');
  });
});
