/**
 * GameDB — persistensi IndexedDB (PRD Bagian XVI, Dev Planning 14), dimajukan
 * untuk layar Masuk/Profil dan Beranda.
 *
 * Object store:
 *  player_profile         : profil pemain lokal (bisa lebih dari satu per perangkat)
 *  chapter_progress       : snapshot state terakhir per profil x bab
 *  pasal_mastery          : penguasaan pasal per profil x pasal
 *  constitutional_history : log append-only argumen yang pernah dibangun
 *  research_sessions      : catatan sesi untuk riset (hanya jika consent)
 *
 * Promise-based (idb), versi skema lewat upgrade, offline penuh, dan TIDAK
 * mengirim data ke mana pun: ekspor hanya lewat exportProfile() ke berkas.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ChapterOutcome } from '@core/engine/ConstitutionalEventBus.ts';
import type { ConstitutionalSnapshot, PasalMastery } from '@core/store/types.ts';

export const DB_NAME = 'pasal-frenzy';
export const DB_VERSION = 1;
export const ACTIVE_PROFILE_KEY = 'pasal-frenzy.activeProfile';

export interface PlayerProfile {
  id: string;
  name: string;
  /** warna avatar (hex) */
  color: string;
  createdAt: number;
  lastActiveAt: number;
  participantCode: string | null;
  totalPlayTimeMs: number;
}

export interface ChapterProgressRecord {
  key: string; // `${profileId}:${chapterId}`
  profileId: string;
  chapterId: string;
  lastState: ConstitutionalSnapshot | null;
  attempts: number;
  completedAt: number | null;
  outcome: ChapterOutcome | null;
  bestDurationMs: number | null;
  updatedAt: number;
}

export interface PasalMasteryRecord extends PasalMastery {
  key: string; // `${profileId}:${pasalId}`
  profileId: string;
}

export interface HistoryRecord {
  id?: number;
  profileId: string;
  chapterId: string;
  argumentChain: string[];
  outcome: 'berhasil' | 'gagal';
  strength: number;
  timestamp: number;
}

export interface ResearchEvent {
  t: number;
  type: string;
  data?: Record<string, unknown>;
}

export interface ResearchSessionRecord {
  id: string;
  profileId: string;
  participantCode: string | null;
  chapterId: string | null;
  startedAt: number;
  endedAt: number | null;
  appVersion: string;
  platform: string;
  events: ResearchEvent[];
}

interface PasalFrenzySchema extends DBSchema {
  player_profile: { key: string; value: PlayerProfile; indexes: { byLastActive: number } };
  chapter_progress: {
    key: string;
    value: ChapterProgressRecord;
    indexes: { byProfile: string };
  };
  pasal_mastery: { key: string; value: PasalMasteryRecord; indexes: { byProfile: string } };
  constitutional_history: {
    key: number;
    value: HistoryRecord;
    indexes: { byProfile: string };
  };
  research_sessions: {
    key: string;
    value: ResearchSessionRecord;
    indexes: { byProfile: string };
  };
}

export const AVATAR_COLORS = ['#dc2626', '#3b82f6', '#d4a017', '#10b981', '#a855f7', '#f97316'];

export function makeId(prefix = 'p'): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}

export interface ProfileExport {
  exportedAt: string;
  appVersion: string;
  profile: PlayerProfile;
  chapterProgress: ChapterProgressRecord[];
  pasalMastery: PasalMasteryRecord[];
  history: HistoryRecord[];
  researchSessions: ResearchSessionRecord[];
}

export class GameDB {
  private constructor(private readonly db: IDBPDatabase<PasalFrenzySchema>) {}

  static async open(name = DB_NAME): Promise<GameDB> {
    const db = await openDB<PasalFrenzySchema>(name, DB_VERSION, {
      upgrade(database) {
        const profiles = database.createObjectStore('player_profile', { keyPath: 'id' });
        profiles.createIndex('byLastActive', 'lastActiveAt');
        const progress = database.createObjectStore('chapter_progress', { keyPath: 'key' });
        progress.createIndex('byProfile', 'profileId');
        const mastery = database.createObjectStore('pasal_mastery', { keyPath: 'key' });
        mastery.createIndex('byProfile', 'profileId');
        const history = database.createObjectStore('constitutional_history', {
          keyPath: 'id',
          autoIncrement: true,
        });
        history.createIndex('byProfile', 'profileId');
        const sessions = database.createObjectStore('research_sessions', { keyPath: 'id' });
        sessions.createIndex('byProfile', 'profileId');
      },
    });
    return new GameDB(db);
  }

  /* ------------------------------ profil ------------------------------ */
  async listProfiles(): Promise<PlayerProfile[]> {
    const all = await this.db.getAll('player_profile');
    return all.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }

  async getProfile(id: string): Promise<PlayerProfile | undefined> {
    return this.db.get('player_profile', id);
  }

  async createProfile(input: {
    name: string;
    color?: string;
    participantCode?: string | null;
  }): Promise<PlayerProfile> {
    const now = Date.now();
    const existing = await this.listProfiles();
    const color = input.color ?? AVATAR_COLORS[existing.length % AVATAR_COLORS.length] ?? '#dc2626';
    const profile: PlayerProfile = {
      id: makeId('p'),
      name: input.name.trim(),
      color,
      createdAt: now,
      lastActiveAt: now,
      participantCode: input.participantCode?.trim() || null,
      totalPlayTimeMs: 0,
    };
    await this.db.put('player_profile', profile);
    return profile;
  }

  async updateProfile(
    id: string,
    patch: Partial<Omit<PlayerProfile, 'id' | 'createdAt'>>,
  ): Promise<PlayerProfile | undefined> {
    const current = await this.db.get('player_profile', id);
    if (!current) return undefined;
    const next = { ...current, ...patch };
    await this.db.put('player_profile', next);
    return next;
  }

  async touchProfile(id: string): Promise<void> {
    await this.updateProfile(id, { lastActiveAt: Date.now() });
  }

  async addPlayTime(id: string, ms: number): Promise<void> {
    const current = await this.db.get('player_profile', id);
    if (!current || !(ms > 0)) return;
    await this.db.put('player_profile', {
      ...current,
      totalPlayTimeMs: current.totalPlayTimeMs + ms,
    });
  }

  /** menghapus profil beserta seluruh datanya */
  async deleteProfile(id: string): Promise<void> {
    const tx = this.db.transaction(
      [
        'player_profile',
        'chapter_progress',
        'pasal_mastery',
        'constitutional_history',
        'research_sessions',
      ],
      'readwrite',
    );
    await tx.objectStore('player_profile').delete(id);
    for (const store of ['chapter_progress', 'pasal_mastery', 'research_sessions'] as const) {
      const keys = await tx.objectStore(store).index('byProfile').getAllKeys(id);
      for (const k of keys) await tx.objectStore(store).delete(k);
    }
    const histKeys = await tx
      .objectStore('constitutional_history')
      .index('byProfile')
      .getAllKeys(id);
    for (const k of histKeys) await tx.objectStore('constitutional_history').delete(k);
    await tx.done;
  }

  /* --------------------------- progres bab --------------------------- */
  async saveChapterProgress(
    record: Omit<ChapterProgressRecord, 'key' | 'updatedAt'>,
  ): Promise<void> {
    await this.db.put('chapter_progress', {
      ...record,
      key: `${record.profileId}:${record.chapterId}`,
      updatedAt: Date.now(),
    });
  }

  async getChapterProgress(
    profileId: string,
    chapterId: string,
  ): Promise<ChapterProgressRecord | undefined> {
    return this.db.get('chapter_progress', `${profileId}:${chapterId}`);
  }

  async listChapterProgress(profileId: string): Promise<ChapterProgressRecord[]> {
    return this.db.getAllFromIndex('chapter_progress', 'byProfile', profileId);
  }

  /* --------------------------- mastery pasal ------------------------- */
  async saveMastery(profileId: string, inventory: Record<string, PasalMastery>): Promise<void> {
    const tx = this.db.transaction('pasal_mastery', 'readwrite');
    for (const m of Object.values(inventory)) {
      await tx.store.put({ ...m, key: `${profileId}:${m.pasalId}`, profileId });
    }
    await tx.done;
  }

  async loadMastery(profileId: string): Promise<Record<string, PasalMastery>> {
    const rows = await this.db.getAllFromIndex('pasal_mastery', 'byProfile', profileId);
    const out: Record<string, PasalMastery> = {};
    for (const r of rows) {
      const { key: _key, profileId: _pid, ...rest } = r;
      out[rest.pasalId] = rest;
    }
    return out;
  }

  /* ----------------------------- riwayat ----------------------------- */
  async appendHistory(record: Omit<HistoryRecord, 'id'>): Promise<number> {
    return this.db.add('constitutional_history', record as HistoryRecord);
  }

  async listHistory(profileId: string): Promise<HistoryRecord[]> {
    return this.db.getAllFromIndex('constitutional_history', 'byProfile', profileId);
  }

  /* ----------------------------- riset ------------------------------- */
  async saveResearchSession(session: ResearchSessionRecord): Promise<void> {
    await this.db.put('research_sessions', session);
  }

  async listResearchSessions(profileId: string): Promise<ResearchSessionRecord[]> {
    return this.db.getAllFromIndex('research_sessions', 'byProfile', profileId);
  }

  async deleteResearchSessions(profileId: string): Promise<void> {
    const tx = this.db.transaction('research_sessions', 'readwrite');
    const keys = await tx.store.index('byProfile').getAllKeys(profileId);
    for (const k of keys) await tx.store.delete(k);
    await tx.done;
  }

  /* ----------------------------- ekspor ------------------------------ */
  async exportProfile(profileId: string, appVersion: string): Promise<ProfileExport | null> {
    const profile = await this.getProfile(profileId);
    if (!profile) return null;
    return {
      exportedAt: new Date().toISOString(),
      appVersion,
      profile,
      chapterProgress: await this.listChapterProgress(profileId),
      pasalMastery: await this.db.getAllFromIndex('pasal_mastery', 'byProfile', profileId),
      history: await this.listHistory(profileId),
      researchSessions: await this.listResearchSessions(profileId),
    };
  }

  close(): void {
    this.db.close();
  }
}

/* --------------------------- profil aktif ------------------------------ */
export function getActiveProfileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
  } catch {
    return null;
  }
}

export function setActiveProfileId(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(ACTIVE_PROFILE_KEY);
    else localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch {
    /* localStorage tidak tersedia */
  }
}

/** ekspor sesi riset ke CSV datar (satu baris per event) */
export function researchSessionsToCsv(sessions: ResearchSessionRecord[]): string {
  const header = [
    'session_id',
    'participant_code',
    'chapter_id',
    'started_at',
    'event_t_ms',
    'event_type',
    'event_data_json',
  ];
  const rows = [header.join(',')];
  const esc = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  for (const s of sessions) {
    if (s.events.length === 0) {
      rows.push(
        [s.id, s.participantCode, s.chapterId, new Date(s.startedAt).toISOString(), '', '', '']
          .map(esc)
          .join(','),
      );
      continue;
    }
    for (const e of s.events) {
      rows.push(
        [
          s.id,
          s.participantCode,
          s.chapterId,
          new Date(s.startedAt).toISOString(),
          e.t,
          e.type,
          JSON.stringify(e.data ?? {}),
        ]
          .map(esc)
          .join(','),
      );
    }
  }
  return rows.join('\n');
}

let singleton: Promise<GameDB> | null = null;
/** instance bersama aplikasi (dibuka sekali) */
export function gameDB(): Promise<GameDB> {
  singleton ??= GameDB.open();
  return singleton;
}
