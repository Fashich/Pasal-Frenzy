/**
 * LocalStorageAdapter — mode web: akun dan progres disimpan sebagai satu
 * dokumen JSON di localStorage browser ini. Tanpa server, tanpa basis data,
 * tidak ada data yang keluar dari perangkat. Cocok untuk masuk/daftar lokal;
 * lintas perangkat tidak didukung (dinyatakan jujur di antarmuka).
 */
import type { PasalMastery } from '@core/store/types.ts';
import {
  AVATAR_COLORS,
  makeId,
  type ChapterProgressRecord,
  type HistoryRecord,
  type PasalMasteryRecord,
  type PlayerProfile,
  type ProfileExport,
  type ResearchSessionRecord,
} from './GameDB.ts';
import type { CreateProfileInput, PersistenceAdapter } from './PersistenceAdapter.ts';
import { hashPin, makeSalt } from './pin.ts';

export const LOCAL_STORAGE_KEY = 'pasal-frenzy.akun.v1';

interface LocalDocument {
  profiles: Record<string, PlayerProfile>;
  chapterProgress: Record<string, ChapterProgressRecord>;
  mastery: Record<string, PasalMasteryRecord>;
  history: HistoryRecord[];
  historySeq: number;
  researchSessions: Record<string, ResearchSessionRecord>;
}

/** salinan record tanpa entri yang memenuhi predikat */
function omitBy<T>(map: Record<string, T>, drop: (value: T) => boolean): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(map)) if (!drop(v)) out[k] = v;
  return out;
}

function emptyDocument(): LocalDocument {
  return {
    profiles: {},
    chapterProgress: {},
    mastery: {},
    history: [],
    historySeq: 0,
    researchSessions: {},
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class LocalStorageAdapter implements PersistenceAdapter {
  readonly mode = 'web' as const;
  private doc: LocalDocument;

  constructor(
    private readonly storage: StorageLike = localStorage,
    private readonly key: string = LOCAL_STORAGE_KEY,
  ) {
    this.doc = this.read();
  }

  private read(): LocalDocument {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return emptyDocument();
      const parsed = JSON.parse(raw) as Partial<LocalDocument>;
      return { ...emptyDocument(), ...parsed };
    } catch {
      return emptyDocument();
    }
  }

  private write(): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.doc));
    } catch {
      /* kuota penuh / mode privat: data tetap hidup di memori sesi ini */
    }
  }

  /* ------------------------------ profil ------------------------------ */
  async listProfiles(): Promise<PlayerProfile[]> {
    return Object.values(this.doc.profiles).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  }

  async getProfile(id: string): Promise<PlayerProfile | undefined> {
    return this.doc.profiles[id];
  }

  async createProfile(input: CreateProfileInput): Promise<PlayerProfile> {
    const now = Date.now();
    const count = Object.keys(this.doc.profiles).length;
    const color = input.color ?? AVATAR_COLORS[count % AVATAR_COLORS.length] ?? '#dc2626';
    const pin = input.pin?.trim() || null;
    const pinSalt = pin ? makeSalt() : null;
    const pinHash = pin && pinSalt ? await hashPin(pin, pinSalt) : null;
    const profile: PlayerProfile = {
      id: makeId('w'),
      name: input.name.trim(),
      color,
      createdAt: now,
      lastActiveAt: now,
      participantCode: input.participantCode?.trim() || null,
      totalPlayTimeMs: 0,
      pinHash,
      pinSalt,
    };
    this.doc.profiles[profile.id] = profile;
    this.write();
    return profile;
  }

  async updateProfile(
    id: string,
    patch: Partial<Omit<PlayerProfile, 'id' | 'createdAt'>>,
  ): Promise<PlayerProfile | undefined> {
    const current = this.doc.profiles[id];
    if (!current) return undefined;
    const next = { ...current, ...patch };
    this.doc.profiles[id] = next;
    this.write();
    return next;
  }

  async touchProfile(id: string): Promise<void> {
    await this.updateProfile(id, { lastActiveAt: Date.now() });
  }

  async addPlayTime(id: string, ms: number): Promise<void> {
    const current = this.doc.profiles[id];
    if (!current || !(ms > 0)) return;
    current.totalPlayTimeMs += ms;
    this.write();
  }

  async deleteProfile(id: string): Promise<void> {
    this.doc.profiles = omitBy(this.doc.profiles, (p) => p.id === id);
    this.doc.chapterProgress = omitBy(this.doc.chapterProgress, (r) => r.profileId === id);
    this.doc.mastery = omitBy(this.doc.mastery, (r) => r.profileId === id);
    this.doc.history = this.doc.history.filter((h) => h.profileId !== id);
    this.doc.researchSessions = omitBy(this.doc.researchSessions, (r) => r.profileId === id);
    this.write();
  }

  /* --------------------------- progres bab --------------------------- */
  async saveChapterProgress(
    record: Omit<ChapterProgressRecord, 'key' | 'updatedAt'>,
  ): Promise<void> {
    const key = `${record.profileId}:${record.chapterId}`;
    this.doc.chapterProgress[key] = { ...record, key, updatedAt: Date.now() };
    this.write();
  }

  async getChapterProgress(
    profileId: string,
    chapterId: string,
  ): Promise<ChapterProgressRecord | undefined> {
    return this.doc.chapterProgress[`${profileId}:${chapterId}`];
  }

  async listChapterProgress(profileId: string): Promise<ChapterProgressRecord[]> {
    return Object.values(this.doc.chapterProgress).filter((p) => p.profileId === profileId);
  }

  /* --------------------------- mastery pasal ------------------------- */
  async saveMastery(profileId: string, inventory: Record<string, PasalMastery>): Promise<void> {
    for (const m of Object.values(inventory)) {
      const key = `${profileId}:${m.pasalId}`;
      this.doc.mastery[key] = { ...m, key, profileId };
    }
    this.write();
  }

  async loadMastery(profileId: string): Promise<Record<string, PasalMastery>> {
    const out: Record<string, PasalMastery> = {};
    for (const r of Object.values(this.doc.mastery)) {
      if (r.profileId !== profileId) continue;
      const { key: _key, profileId: _pid, ...rest } = r;
      out[rest.pasalId] = rest;
    }
    return out;
  }

  /* ----------------------------- riwayat ----------------------------- */
  async appendHistory(record: Omit<HistoryRecord, 'id'>): Promise<number> {
    const id = ++this.doc.historySeq;
    this.doc.history.push({ ...record, id });
    this.write();
    return id;
  }

  async listHistory(profileId: string): Promise<HistoryRecord[]> {
    return this.doc.history.filter((h) => h.profileId === profileId);
  }

  /* ----------------------------- riset ------------------------------- */
  async saveResearchSession(session: ResearchSessionRecord): Promise<void> {
    this.doc.researchSessions[session.id] = session;
    this.write();
  }

  async listResearchSessions(profileId: string): Promise<ResearchSessionRecord[]> {
    return Object.values(this.doc.researchSessions).filter((s) => s.profileId === profileId);
  }

  async deleteResearchSessions(profileId: string): Promise<void> {
    this.doc.researchSessions = omitBy(this.doc.researchSessions, (r) => r.profileId === profileId);
    this.write();
  }

  /* ----------------------------- ekspor ------------------------------ */
  async exportProfile(profileId: string, appVersion: string): Promise<ProfileExport | null> {
    const profile = this.doc.profiles[profileId];
    if (!profile) return null;
    const { pinHash: _h, pinSalt: _s, ...publicProfile } = profile;
    return {
      exportedAt: new Date().toISOString(),
      appVersion,
      profile: { ...publicProfile, pinHash: null, pinSalt: null },
      chapterProgress: await this.listChapterProgress(profileId),
      pasalMastery: Object.values(this.doc.mastery).filter((m) => m.profileId === profileId),
      history: await this.listHistory(profileId),
      researchSessions: await this.listResearchSessions(profileId),
    };
  }
}
