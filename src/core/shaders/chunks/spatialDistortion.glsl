// spatialDistortion.glsl — distorsi organik permukaan (PRD Bagian XII).
// Disampel dalam ruang dunia agar mesh yang bersebelahan bergeser seragam
// (tidak ada celah di sambungan lantai-dinding).
//
// u_democracyPressure : akumulasi tekanan naratif yang belum diredakan (0..1)
// u_temporalFlux      : aktif di Case 3 untuk manipulasi waktu (0..1)
// Kombinasi keduanya menghasilkan pola yang tidak pernah sama di dua momen.

uniform float u_democracyPressure;
uniform float u_temporalFlux;

vec3 pfSpatialDistortion(vec3 worldPos, float time) {
  float amp = u_democracyPressure * 0.28 + u_temporalFlux * 0.18;
  if (amp <= 0.0005) return vec3(0.0);
  float t = time * (0.18 + u_temporalFlux * 0.9);
  vec3 q = worldPos * 0.22;
  float nx = pfSnoise(q + vec3(0.0, t, 13.7));
  float ny = pfSnoise(q + vec3(41.3, t * 0.8, 0.0));
  float nz = pfSnoise(q + vec3(0.0, 7.1, t * 1.1));
  // oktaf kedua yang lebih halus saat temporal flux tinggi (waktu "bergetar")
  float fine = pfSnoise(worldPos * 0.9 + vec3(t * 2.0)) * u_temporalFlux * 0.35;
  return vec3(nx, ny * 0.6, nz) * amp + vec3(fine);
}
