/**
 * Pemilih penyimpanan sesuai target build:
 *  - build 'app' (Electron/Capacitor) -> basis data perangkat (IndexedDB, GameDB)
 *  - build web/pages                  -> localStorage browser (LocalStorageAdapter)
 * Ditambah sesi aktif (profil yang sedang masuk) yang disimpan di localStorage
 * agar tetap masuk setelah muat ulang.
 */
import { IS_APP_BUILD } from '../../buildInfo.ts';
import { gameDB, getActiveProfileId, setActiveProfileId, type PlayerProfile } from './GameDB.ts';
import { LocalStorageAdapter } from './LocalStorageAdapter.ts';
import type { PersistenceAdapter, PersistenceMode } from './PersistenceAdapter.ts';

export const persistenceMode: PersistenceMode = IS_APP_BUILD ? 'app' : 'web';

let adapter: Promise<PersistenceAdapter> | null = null;

/** instance bersama aplikasi (dibuka sekali) */
export function getPersistence(): Promise<PersistenceAdapter> {
  adapter ??=
    persistenceMode === 'app'
      ? gameDB().then((db) => db as PersistenceAdapter)
      : Promise.resolve(new LocalStorageAdapter());
  return adapter;
}

/** hanya untuk pengujian: mengganti adapter bersama */
export function setPersistenceForTests(next: PersistenceAdapter | null): void {
  adapter = next ? Promise.resolve(next) : null;
}

export interface ActiveSession {
  adapter: PersistenceAdapter;
  profile: PlayerProfile;
}

/** profil yang sedang masuk, atau null bila belum masuk / profil sudah dihapus */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const id = getActiveProfileId();
  if (!id) return null;
  const store = await getPersistence();
  const profile = await store.getProfile(id);
  if (!profile) {
    setActiveProfileId(null);
    return null;
  }
  return { adapter: store, profile };
}

export function signIn(profileId: string): void {
  setActiveProfileId(profileId);
}

export function signOut(): void {
  setActiveProfileId(null);
}

export function isSignedIn(): boolean {
  return getActiveProfileId() !== null;
}
