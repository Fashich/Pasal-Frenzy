/**
 * Cermin CPU dari fungsi GLSL `pfHyperbolicWarp` (src/core/shaders/chunks/hyperbolic.glsl).
 *
 * Dipakai oleh sistem navigasi/raycast agar perhitungan jalur di CPU sepadan
 * dengan geometri yang benar-benar dirender GPU (PRD Bagian IV). Rumus di sini
 * dan di GLSL harus tetap identik; tes unit menjaga invarian utamanya.
 *
 * Semua posisi dalam RUANG PANDANG (view space): kamera di titik asal,
 * sumbu -Z ke depan. Distorsi dengan sendirinya berpusat pada pemain.
 */

export const MAX_ANCHORS = 8;

export interface Anchor {
  x: number;
  y: number;
  z: number;
  /** radius pengaruh (view units); di dalam radius geometri tetap Euclidean */
  r: number;
}

export interface WarpParams {
  /** integritas konstitusional 0..1 */
  integrity: number;
  /** u_hyperbolaCurvature: kekuatan maksimum kelengkungan (default 1) */
  curvature: number;
  /** u_horizon: jarak (view units) yang dipetakan ke tepi cakram Poincaré */
  horizon: number;
  /** u_time (detik) */
  time: number;
  /** u_spaceWarpSpeed */
  warpSpeed: number;
  anchors: readonly Anchor[];
}

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** kelengkungan efektif di titik p: dasar dari integritas, diredam oleh anchor terdekat */
export function curvatureAt(p: Vec3Like, params: WarpParams): number {
  const base = params.curvature * Math.pow(Math.min(1, Math.max(0, 1 - params.integrity)), 1.5);
  let shield = 0;
  const n = Math.min(params.anchors.length, MAX_ANCHORS);
  for (let i = 0; i < n; i++) {
    const a = params.anchors[i];
    if (!a) continue;
    const d = Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z);
    shield = Math.max(shield, 1 - smoothstep(0, Math.max(a.r, 0.001), d));
  }
  return base * (1 - shield);
}

/** transformasi hiperbolik posisi view-space; identitas saat integritas 1 */
export function warpViewPosition(p: Vec3Like, params: WarpParams): Vec3Like {
  const c = curvatureAt(p, params);
  if (c <= 0) return { x: p.x, y: p.y, z: p.z };
  const horizon = Math.max(params.horizon, 1);
  const r = Math.hypot(p.x, p.z) / horizon;
  const k = 1 + 2 * c;
  const kr = Math.max(k * r, 1e-4);
  const radial = 1 + (Math.tanh(kr) / kr - 1) * c; // mix(1, tanh(kr)/kr, c)

  let x = p.x * radial;
  let y = p.y;
  const z = p.z * radial;

  const far = smoothstep(0, 1, r);
  const press = y > 0 ? 1 : 0.3;
  y -= c * 0.35 * y * far * press;

  const t = params.time * params.warpSpeed;
  x += c * 0.6 * horizon * r * r * Math.sin(t * 0.3 + p.z * 0.02);

  const ang = c * 0.25 * r * Math.sin(t * 0.2);
  const s = Math.sin(ang);
  const co = Math.cos(ang);
  const rx = co * x - s * y;
  const ry = s * x + co * y;
  return { x: rx, y: ry, z };
}

export const DEFAULT_WARP: Omit<WarpParams, 'integrity' | 'time' | 'anchors'> = {
  curvature: 1,
  horizon: 60,
  warpSpeed: 1,
};
