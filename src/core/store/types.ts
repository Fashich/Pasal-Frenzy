import type {
  ChapterOutcome,
  FrenzyEndReason,
  FrenzyTrigger,
  IntegrityLevel,
} from '@core/engine/ConstitutionalEventBus.ts';

/* ------------------------------------------------------------------ */
/* Integritas konstitusional                                           */
/* ------------------------------------------------------------------ */
export interface IntegrityEvent {
  at: number;
  delta: number;
  value: number;
  reason: string;
}

export interface IntegritySlice {
  /** nilai yang dirender (sudah dihaluskan), 0..1 */
  integrity: number;
  /** nilai tujuan; integrity mendekatinya tiap tick */
  integrityTarget: number;
  /** nilai terakhir yang dipancarkan ke bus (ambang perubahan 0.01) */
  integrityEmitted: number;
  integrityEvents: IntegrityEvent[];
  updateIntegrity: (delta: number, reason: string) => void;
  setIntegrity: (value: number, reason: string) => void;
  /** dipanggil setiap frame dengan delta waktu dalam detik */
  tickIntegrity: (dtSeconds: number) => void;
  getIntegrityLevel: () => IntegrityLevel;
}

/* ------------------------------------------------------------------ */
/* Kondisi psikologis                                                  */
/* ------------------------------------------------------------------ */
export interface PsychologicalState {
  /** beban kognitif dari kecepatan/akurasi respons, 0..1 (tinggi = buruk) */
  cognitiveLoad: number;
  /** kualitas argumen yang dibangun, 0..1 */
  argumentativeCoherence: number;
  /** kedalaman pemahaman konteks humanis, 0..1 */
  constitutionalEmpathy: number;
}

export interface PsychologicalSlice extends PsychologicalState {
  updatePsychological: (partial: Partial<PsychologicalState>) => void;
  nudgePsychological: (delta: Partial<PsychologicalState>) => void;
  getOverallPsychologicalHealth: () => number;
}

/* ------------------------------------------------------------------ */
/* Inventaris pasal                                                    */
/* ------------------------------------------------------------------ */
export interface PasalMastery {
  pasalId: string;
  /** 0..1, naik saat dipakai dalam konteks berbeda dan berhasil */
  masteryLevel: number;
  /** adjacency list: pasal lain yang pernah dipakai bersama dalam argumen sukses */
  contextualNetwork: Record<string, number>;
  /** naik dinamis saat berhasil memblokir serangan yang semakin kuat */
  jurisprudentialWeight: number;
  usageCount: number;
  successCount: number;
  /** id unit (ayat/pasal) yang pernah dikumpulkan */
  collectedUnits: string[];
  firstCollectedAt: number;
  lastUsedAt: number | null;
}

export interface PasalInventorySlice {
  inventory: Record<string, PasalMastery>;
  collectPasal: (pasalId: string, unitId: string, source: string) => void;
  recordArgumentUse: (pasalIds: string[], success: boolean, strength: number) => void;
  hasPasal: (pasalId: string) => boolean;
  getMastery: (pasalId: string) => number;
}

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */
export type SoundscapeLayer = 'foundation' | 'crisis' | 'frenzy';

export interface AudioSlice {
  masterVolume: number;
  sfxVolume: number;
  muted: boolean;
  audioUnlocked: boolean;
  activeLayers: Record<SoundscapeLayer, boolean>;
  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMuted: (muted: boolean) => void;
  setAudioUnlocked: (unlocked: boolean) => void;
  setLayer: (layer: SoundscapeLayer, active: boolean) => void;
}

/* ------------------------------------------------------------------ */
/* Progres                                                             */
/* ------------------------------------------------------------------ */
export interface ChapterCompletion {
  completedAt: number;
  outcome: ChapterOutcome;
  attempts: number;
  bestDurationMs: number | null;
}

export interface ProgressSlice {
  currentChapterId: string | null;
  chapterStartedAt: number | null;
  chapterAttempts: Record<string, number>;
  unlockedChapters: string[];
  completedChapters: Record<string, ChapterCompletion>;
  totalPlayTimeMs: number;
  startChapter: (chapterId: string) => void;
  completeChapter: (chapterId: string, outcome: ChapterOutcome) => void;
  unlockChapter: (chapterId: string) => void;
  addPlayTime: (ms: number) => void;
}

/* ------------------------------------------------------------------ */
/* Mode Frenzy (lintas slice)                                          */
/* ------------------------------------------------------------------ */
export interface FrenzySlice {
  frenzyActive: boolean;
  frenzyStartedAt: number | null;
  frenzyCount: number;
  /** mengevaluasi ambang PRD: integrity < 0.35 dan cognitiveLoad > 0.7 */
  evaluateFrenzy: () => void;
  activateFrenzy: (trigger: FrenzyTrigger) => void;
  deactivateFrenzy: (reason: FrenzyEndReason) => void;
}

export type ConstitutionalState = IntegritySlice &
  PsychologicalSlice &
  PasalInventorySlice &
  AudioSlice &
  ProgressSlice &
  FrenzySlice & {
    /** menggantikan seluruh data (tanpa fungsi) dari snapshot tersimpan */
    hydrate: (snapshot: ConstitutionalSnapshot) => void;
    /** mengembalikan salinan data murni untuk disimpan / timeline */
    serialize: () => ConstitutionalSnapshot;
    reset: () => void;
  };

/** Data murni store (tanpa fungsi) untuk IndexedDB dan TimelineEngine. */
export interface ConstitutionalSnapshot {
  version: 1;
  integrity: number;
  integrityTarget: number;
  integrityEvents: IntegrityEvent[];
  cognitiveLoad: number;
  argumentativeCoherence: number;
  constitutionalEmpathy: number;
  inventory: Record<string, PasalMastery>;
  masterVolume: number;
  sfxVolume: number;
  muted: boolean;
  activeLayers: Record<SoundscapeLayer, boolean>;
  currentChapterId: string | null;
  chapterAttempts: Record<string, number>;
  unlockedChapters: string[];
  completedChapters: Record<string, ChapterCompletion>;
  totalPlayTimeMs: number;
  frenzyActive: boolean;
  frenzyCount: number;
}

export const FRENZY_INTEGRITY_THRESHOLD = 0.35;
export const FRENZY_COGNITIVE_LOAD_THRESHOLD = 0.7;
/** histeresis keluar Frenzy: integritas pulih di atas 0.5 dan beban kognitif turun di bawah 0.5 */
export const FRENZY_RECOVER_INTEGRITY = 0.5;
export const FRENZY_RECOVER_COGNITIVE_LOAD = 0.5;
export const INTEGRITY_EMIT_THRESHOLD = 0.01;
/** konstanta waktu penghalusan integritas (detik) */
export const INTEGRITY_SMOOTHING_TAU = 0.35;
export const INTEGRITY_EVENT_LIMIT = 200;
