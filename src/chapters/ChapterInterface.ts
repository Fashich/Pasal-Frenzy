/**
 * ChapterInterface — kontrak yang wajib diimplementasikan setiap bab
 * (PRD Bagian XVI). Penambahan bab baru tidak boleh mengubah kode inti:
 * cukup daftarkan di registry.ts.
 */
import type { ThreeEngine } from '@core/engine/ThreeEngine.ts';
import type { ConstitutionalStore } from '@core/store/ConstitutionalStore.ts';
import type { ConstitutionalEventBus } from '@core/engine/ConstitutionalEventBus.ts';
import type { InputManager } from '@core/input/InputManager.ts';
import type { AudioEngine } from '@core/audio/AudioEngine.ts';
import type { ConstitutionalSnapshot } from '@core/store/types.ts';
import type { PhaserEngine } from '@core/engine/PhaserEngine.ts';

export interface ChapterContext {
  chapterId: string;
  engine: ThreeEngine;
  input: InputManager;
  store: ConstitutionalStore;
  bus: ConstitutionalEventBus;
  audio: AudioEngine;
  /** container DOM untuk HUD in-world (di atas canvas) */
  hud: HTMLElement;
  reducedMotion: boolean;
  lite: boolean;
  /** memuat Phaser overlay hanya jika bab membutuhkannya */
  loadPhaser: () => Promise<PhaserEngine>;
  /** melaporkan progres pemuatan aset bab (0..1) */
  reportProgress: (fraction: number, label?: string) => void;
}

export interface ChapterSaveData {
  version: number;
  store: ConstitutionalSnapshot;
  chapter: unknown;
}

export interface Chapter {
  readonly id: string;
  readonly judul: string;
  /** menyiapkan aset & state; resolve hanya setelah semuanya siap */
  initialize(ctx: ChapterContext): Promise<void>;
  /** mulai bermain (setelah transisi masuk selesai) */
  start(): void;
  /** dipanggil tiap frame oleh engine */
  update(dt: number, elapsed: number): void;
  /** jeda / lanjut */
  pause(): void;
  resume(): void;
  /** serialisasi state bab untuk IndexedDB */
  serialize(): unknown;
  deserialize(data: unknown): void;
  /** membersihkan semua resource (scene, listener, audio) */
  dispose(): void;
}

export type ChapterFactory = () => Promise<Chapter>;
