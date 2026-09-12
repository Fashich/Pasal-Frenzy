/**
 * Uniform global yang dibagikan ke semua material dan pass post-processing.
 * Satu objek uniform dipakai bersama (by reference), jadi cukup memperbarui
 * `.value` sekali per frame.
 */
import { Vector2, Vector4 } from 'three';
import { MAX_ANCHORS } from '@core/math/hyperbolic.ts';
import type { ConstitutionalState } from '@core/store/types.ts';

export interface GlobalUniformSet {
  u_time: { value: number };
  u_constitutionalIntegrity: { value: number };
  u_democracyPressure: { value: number };
  u_temporalFlux: { value: number };
  u_frenzy: { value: number };
  u_hyperbolaCurvature: { value: number };
  u_spaceWarpSpeed: { value: number };
  u_horizon: { value: number };
  u_anchorCount: { value: number };
  u_anchors: { value: Vector4[] };
  u_resolution: { value: Vector2 };
}

export function createGlobalUniforms(): GlobalUniformSet {
  return {
    u_time: { value: 0 },
    u_constitutionalIntegrity: { value: 1 },
    u_democracyPressure: { value: 0 },
    u_temporalFlux: { value: 0 },
    u_frenzy: { value: 0 },
    u_hyperbolaCurvature: { value: 1 },
    u_spaceWarpSpeed: { value: 1 },
    u_horizon: { value: 60 },
    u_anchorCount: { value: 0 },
    u_anchors: { value: Array.from({ length: MAX_ANCHORS }, () => new Vector4()) },
    u_resolution: { value: new Vector2(1, 1) },
  };
}

/** konstanta waktu penghalusan u_frenzy dan tekanan (detik) */
const FRENZY_TAU = 0.6;
const PRESSURE_TAU = 1.2;

export class GlobalUniforms {
  readonly set: GlobalUniformSet = createGlobalUniforms();
  /** tekanan naratif tambahan yang diatur bab (0..1), dijumlahkan ke turunan integritas */
  narrativePressure = 0;

  update(dt: number, elapsed: number, state: ConstitutionalState): void {
    const u = this.set;
    u.u_time.value = elapsed;
    u.u_constitutionalIntegrity.value = state.integrity;

    const frenzyTarget = state.frenzyActive ? 1 : 0;
    u.u_frenzy.value += (frenzyTarget - u.u_frenzy.value) * (1 - Math.exp(-dt / FRENZY_TAU));

    const pressureTarget = Math.min(
      1,
      (1 - state.integrity) * 0.6 + frenzyTarget * 0.4 + this.narrativePressure,
    );
    u.u_democracyPressure.value +=
      (pressureTarget - u.u_democracyPressure.value) * (1 - Math.exp(-dt / PRESSURE_TAU));
  }

  setResolution(width: number, height: number): void {
    this.set.u_resolution.value.set(width, height);
  }
}
