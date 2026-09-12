/**
 * Kontrak penyimpanan yang sama untuk dua mode produk (keputusan pemilik proyek,
 * 12 Sep 2026):
 *  - web : akun & progres disimpan di browser ini saja (localStorage), tanpa
 *          server dan tanpa basis data. Cukup untuk masuk/daftar lokal.
 *  - app : versi Electron/Capacitor; akun & progres disimpan di basis data
 *          perangkat (IndexedDB lewat GameDB).
 * Layar Masuk/Daftar, Beranda, dan GameScreen hanya berbicara dengan kontrak ini.
 */
import type { PasalMastery } from '@core/store/types.ts';
import type {
  ChapterProgressRecord,
  HistoryRecord,
  PlayerProfile,
  ProfileExport,
  ResearchSessionRecord,
} from './GameDB.ts';

export type PersistenceMode = 'app' | 'web';

export interface CreateProfileInput {
  name: string;
  color?: string;
  participantCode?: string | null;
  /** PIN opsional (4-6 digit) untuk mengunci profil di perangkat ini */
  pin?: string | null;
}

export interface PersistenceAdapter {
  readonly mode: PersistenceMode;

  listProfiles(): Promise<PlayerProfile[]>;
  getProfile(id: string): Promise<PlayerProfile | undefined>;
  createProfile(input: CreateProfileInput): Promise<PlayerProfile>;
  updateProfile(
    id: string,
    patch: Partial<Omit<PlayerProfile, 'id' | 'createdAt'>>,
  ): Promise<PlayerProfile | undefined>;
  touchProfile(id: string): Promise<void>;
  addPlayTime(id: string, ms: number): Promise<void>;
  deleteProfile(id: string): Promise<void>;

  saveChapterProgress(record: Omit<ChapterProgressRecord, 'key' | 'updatedAt'>): Promise<void>;
  getChapterProgress(
    profileId: string,
    chapterId: string,
  ): Promise<ChapterProgressRecord | undefined>;
  listChapterProgress(profileId: string): Promise<ChapterProgressRecord[]>;

  saveMastery(profileId: string, inventory: Record<string, PasalMastery>): Promise<void>;
  loadMastery(profileId: string): Promise<Record<string, PasalMastery>>;

  appendHistory(record: Omit<HistoryRecord, 'id'>): Promise<number>;
  listHistory(profileId: string): Promise<HistoryRecord[]>;

  saveResearchSession(session: ResearchSessionRecord): Promise<void>;
  listResearchSessions(profileId: string): Promise<ResearchSessionRecord[]>;
  deleteResearchSessions(profileId: string): Promise<void>;

  exportProfile(profileId: string, appVersion: string): Promise<ProfileExport | null>;
}
