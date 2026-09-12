/**
 * ConstitutionalEventBus — sistem saraf pusat Pasal Frenzy.
 *
 * Three.js, Phaser, A-Frame, Web Audio, dan DOM tidak berbagi model event.
 * Bus ini mendefinisikan satu bahasa event bertipe (tanpa magic string) yang
 * dipakai semua subsistem (PRD Bagian III). Setiap listener terisolasi: error
 * di satu listener tidak menghentikan listener lain.
 */

export type IntegrityLevel = 'stabil' | 'tertekan' | 'krisis' | 'runtuh';
export type FrenzyTrigger = 'ambang' | 'naratif';
export type FrenzyEndReason = 'teratasi' | 'gagal' | 'bab-selesai' | 'manual';
export type ChapterOutcome = 'menang' | 'kalah' | 'ditinggalkan';
export type InputMode = 'pointer' | 'touch' | 'gamepad' | 'xr';
export type QualityPreset = 'rendah' | 'sedang' | 'tinggi';
export type BrowserCorruptionStage = 1 | 2 | 3 | 4;

export interface ConstitutionalEvents {
  CONSTITUTIONAL_INTEGRITY_CHANGED: {
    value: number;
    previous: number;
    delta: number;
    level: IntegrityLevel;
    reason: string;
  };
  PSYCHOLOGICAL_STATE_CHANGED: {
    cognitiveLoad: number;
    argumentativeCoherence: number;
    constitutionalEmpathy: number;
    overallHealth: number;
  };
  FRENZY_MODE_ACTIVATED: { trigger: FrenzyTrigger; integrity: number; cognitiveLoad: number };
  FRENZY_MODE_DEACTIVATED: { reason: FrenzyEndReason; durationMs: number };
  PASAL_COLLECTED: { pasalId: string; unitId: string; source: string };
  ARGUMENT_CHAINED: { chainId: string; unitIds: string[]; strength: number; coherence: number };
  ARGUMENT_RESOLVED: {
    chainId: string;
    pasalIds: string[];
    success: boolean;
    strength: number;
    attackKind: string | null;
  };
  CHAPTER_STARTED: { chapterId: string; attempt: number };
  CHAPTER_COMPLETED: {
    chapterId: string;
    outcome: ChapterOutcome;
    durationMs: number;
    integrityAtEnd: number;
  };
  BROWSER_CORRUPTION_START: { stage: BrowserCorruptionStage; integrity: number };
  BROWSER_CORRUPTION_STOP: { reason: 'pulih' | 'bab-selesai' | 'aksesibilitas' };
  XR_SESSION_CHANGED: { active: boolean; mode: 'immersive-vr' | 'immersive-ar' | null };
  INPUT_MODE_CHANGED: { mode: InputMode };
  QUALITY_CHANGED: { preset: QualityPreset; auto: boolean };
  AUDIO_UNLOCKED: { at: number };
  SAVE_COMPLETED: { chapterId: string | null; at: number };
}

export type ConstitutionalEventName = keyof ConstitutionalEvents;

export type Listener<K extends ConstitutionalEventName> = (
  payload: ConstitutionalEvents[K],
  meta: { name: K; at: number },
) => void;

export interface EventRecord<K extends ConstitutionalEventName = ConstitutionalEventName> {
  name: K;
  payload: ConstitutionalEvents[K];
  at: number;
}

export interface EventBusOptions {
  /** sumber waktu (ms); default performance.now atau Date.now */
  now?: () => number;
  /** panjang riwayat event yang disimpan untuk debugging/telemetri */
  historySize?: number;
  /** penangan error listener; default console.error */
  onListenerError?: (error: unknown, record: EventRecord) => void;
}

const defaultNow = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export class ConstitutionalEventBus {
  private readonly listeners = new Map<ConstitutionalEventName, Set<Listener<never>>>();
  private readonly history: EventRecord[] = [];
  private readonly now: () => number;
  private readonly historySize: number;
  private readonly onListenerError: (error: unknown, record: EventRecord) => void;

  constructor(options: EventBusOptions = {}) {
    this.now = options.now ?? defaultNow;
    this.historySize = options.historySize ?? 256;
    this.onListenerError =
      options.onListenerError ??
      ((error, record) => {
        console.error(`[ConstitutionalEventBus] listener ${record.name} gagal`, error);
      });
  }

  on<K extends ConstitutionalEventName>(name: K, listener: Listener<K>): () => void {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(listener as Listener<never>);
    return () => this.off(name, listener);
  }

  once<K extends ConstitutionalEventName>(name: K, listener: Listener<K>): () => void {
    const wrapped: Listener<K> = (payload, meta) => {
      this.off(name, wrapped);
      listener(payload, meta);
    };
    return this.on(name, wrapped);
  }

  off<K extends ConstitutionalEventName>(name: K, listener: Listener<K>): void {
    const set = this.listeners.get(name);
    if (!set) return;
    set.delete(listener as Listener<never>);
    if (set.size === 0) this.listeners.delete(name);
  }

  emit<K extends ConstitutionalEventName>(name: K, payload: ConstitutionalEvents[K]): void {
    const record: EventRecord<K> = { name, payload, at: this.now() };
    this.history.push(record);
    if (this.history.length > this.historySize) this.history.shift();

    const set = this.listeners.get(name);
    if (!set || set.size === 0) return;
    // salin agar listener yang melepas diri saat dipanggil tidak mengganggu iterasi
    for (const listener of Array.from(set)) {
      try {
        (listener as Listener<K>)(payload, { name, at: record.at });
      } catch (error) {
        this.onListenerError(error, record);
      }
    }
  }

  /** Menunggu satu event; berguna untuk skrip naratif dan tes. */
  waitFor<K extends ConstitutionalEventName>(
    name: K,
    predicate?: (payload: ConstitutionalEvents[K]) => boolean,
  ): Promise<ConstitutionalEvents[K]> {
    return new Promise((resolve) => {
      const off = this.on(name, (payload) => {
        if (predicate && !predicate(payload)) return;
        off();
        resolve(payload);
      });
    });
  }

  listenerCount(name?: ConstitutionalEventName): number {
    if (name) return this.listeners.get(name)?.size ?? 0;
    let total = 0;
    for (const set of this.listeners.values()) total += set.size;
    return total;
  }

  getHistory(): readonly EventRecord[] {
    return this.history;
  }

  clearHistory(): void {
    this.history.length = 0;
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

/** Bus global aplikasi. Modul yang butuh isolasi (tes, timeline) membuat instance sendiri. */
export const constitutionalBus = new ConstitutionalEventBus();
