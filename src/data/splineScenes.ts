/** Registri slot scene Spline (self-hosted). Lihat spline-scenes.json dan BRIEF-spline.md. */
import scenes from './spline-scenes.json';

export type SplineSlot = 'landing-hero' | 'beranda';

type SceneMap = Partial<Record<SplineSlot, string | null>>;

/**
 * URL .splinecode untuk sebuah slot, atau null bila slot kosong.
 * Path relatif diawali base build (mis. /Pasal-Frenzy/ di GitHub Pages);
 * URL absolut http(s) diteruskan apa adanya (hanya untuk uji lokal).
 */
export function resolveSplineScene(
  slot: SplineSlot,
  base: string = import.meta.env.BASE_URL,
  map: SceneMap = scenes as SceneMap,
): string | null {
  const value = map[slot];
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}${value.replace(/^\/+/, '')}`;
}

/** true bila minimal satu slot terisi (dipakai untuk memutuskan precache runtime) */
export function hasAnySplineScene(map: SceneMap = scenes as SceneMap): boolean {
  return Object.values(map).some((v) => typeof v === 'string' && v.length > 0);
}
