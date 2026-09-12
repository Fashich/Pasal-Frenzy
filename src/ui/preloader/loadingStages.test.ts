import { describe, expect, it } from 'vitest';
import { computeProgress, runLoadingStages, type LoadingStage } from './loadingStages.ts';

describe('computeProgress', () => {
  const stages = [{ weight: 1 }, { weight: 3 }, { weight: 1 }];

  it('menimbang tahap sesuai bobot', () => {
    expect(computeProgress(stages, 0, 0)).toBe(0);
    expect(computeProgress(stages, 0, 1)).toBeCloseTo(0.2);
    expect(computeProgress(stages, 1, 0.5)).toBeCloseTo(0.5);
    expect(computeProgress(stages, 2, 1)).toBe(1);
  });

  it('aman terhadap bobot nol dan fraksi di luar rentang', () => {
    expect(computeProgress([{ weight: 0 }], 0, 0.5)).toBe(1);
    expect(computeProgress(stages, 1, 5)).toBeCloseTo(0.8);
    expect(computeProgress(stages, 1, -1)).toBeCloseTo(0.2);
  });
});

describe('runLoadingStages', () => {
  const noSleep = { minStageMs: 0, now: () => 0, sleep: async () => undefined };

  it('menjalankan tahap berurutan dan melaporkan progres monoton hingga selesai', async () => {
    const order: string[] = [];
    const stages: LoadingStage[] = [
      {
        id: 'a',
        label: 'Tahap A',
        weight: 1,
        run: async (report) => {
          order.push('a');
          report(0.5);
        },
      },
      {
        id: 'b',
        label: 'Tahap B',
        weight: 1,
        run: async () => {
          order.push('b');
        },
      },
    ];
    const fractions: number[] = [];
    const result = await runLoadingStages(stages, (p) => fractions.push(p.fraction), noSleep);
    expect(order).toEqual(['a', 'b']);
    expect(result.ok).toBe(true);
    for (let i = 1; i < fractions.length; i++) {
      expect(fractions[i]).toBeGreaterThanOrEqual(fractions[i - 1] ?? 0);
    }
    expect(fractions.at(-1)).toBe(1);
  });

  it('melaporkan error tahap dan tetap melanjutkan', async () => {
    const stages: LoadingStage[] = [
      {
        id: 'gagal',
        label: 'Gagal',
        weight: 1,
        run: async () => {
          throw new Error('x');
        },
      },
      { id: 'ok', label: 'OK', weight: 1, run: async () => undefined },
    ];
    const seen: string[] = [];
    const result = await runLoadingStages(stages, (p) => seen.push(p.stageId), noSleep);
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.stageId).toBe('gagal');
    expect(seen).toContain('ok');
  });

  it('menghormati durasi minimum tahap', async () => {
    let t = 0;
    const slept: number[] = [];
    const stages: LoadingStage[] = [{ id: 'a', label: 'A', weight: 1, run: async () => undefined }];
    await runLoadingStages(stages, () => undefined, {
      minStageMs: 300,
      now: () => t,
      sleep: async (ms) => {
        slept.push(ms);
        t += ms;
      },
    });
    expect(slept).toEqual([300]);
  });
});
