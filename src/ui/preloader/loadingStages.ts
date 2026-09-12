/**
 * Tahapan pemuatan NYATA untuk preloader: progres dihitung dari bobot tahap
 * dan fraksi di dalam tahap, bukan animasi palsu. Setiap tahap adalah fungsi
 * async yang bisa melaporkan sub-progres.
 */

export interface LoadingStage {
  id: string;
  /** label yang ditampilkan di bawah bar */
  label: string;
  /** bobot relatif (mis. perkiraan waktu/ukuran) */
  weight: number;
  run: (report: (fraction: number, detail?: string) => void) => Promise<void>;
}

export interface LoadingProgress {
  /** 0..1 progres total tertimbang */
  fraction: number;
  stageIndex: number;
  stageId: string;
  label: string;
  /** item spesifik yang sedang dimuat (mis. nama font, modul, kata ke-N) */
  detail: string | null;
  done: boolean;
  error: unknown | null;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** progres total dari indeks tahap aktif dan fraksi di dalamnya */
export function computeProgress(
  stages: readonly Pick<LoadingStage, 'weight'>[],
  stageIndex: number,
  stageFraction: number,
): number {
  const total = stages.reduce((acc, s) => acc + Math.max(0, s.weight), 0);
  if (total <= 0) return 1;
  let acc = 0;
  for (let i = 0; i < stages.length; i++) {
    const w = Math.max(0, stages[i]?.weight ?? 0);
    if (i < stageIndex) acc += w;
    else if (i === stageIndex) acc += w * clamp01(stageFraction);
  }
  return clamp01(acc / total);
}

export interface RunOptions {
  /** durasi minimum per tahap (ms) agar label sempat terbaca; 0 = tanpa jeda */
  minStageMs?: number;
  /** tahap yang gagal dilaporkan lalu dilanjutkan (true) atau menghentikan (false) */
  continueOnError?: boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** menjalankan tahap berurutan; onProgress dipanggil setiap ada perubahan */
export async function runLoadingStages(
  stages: readonly LoadingStage[],
  onProgress: (p: LoadingProgress) => void,
  options: RunOptions = {},
): Promise<{ ok: boolean; errors: { stageId: string; error: unknown }[] }> {
  const minStageMs = options.minStageMs ?? 0;
  const now = options.now ?? (() => performance.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const errors: { stageId: string; error: unknown }[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (!stage) continue;
    const started = now();
    const emit = (fraction: number, error: unknown = null, detail: string | null = null) =>
      onProgress({
        fraction: computeProgress(stages, i, fraction),
        stageIndex: i,
        stageId: stage.id,
        label: stage.label,
        detail,
        done: false,
        error,
      });
    emit(0);
    try {
      await stage.run((f, detail) => emit(clamp01(f), null, detail ?? null));
    } catch (error) {
      errors.push({ stageId: stage.id, error });
      emit(1, error);
      if (!(options.continueOnError ?? true)) break;
    }
    const elapsed = now() - started;
    if (minStageMs > elapsed) await sleep(minStageMs - elapsed);
    emit(1);
  }

  const last = stages[stages.length - 1];
  onProgress({
    fraction: 1,
    stageIndex: Math.max(0, stages.length - 1),
    stageId: last?.id ?? '',
    label: last?.label ?? '',
    detail: null,
    done: true,
    error: null,
  });
  return { ok: errors.length === 0, errors };
}
