// hyperbolic.glsl — transformasi ruang non-Euclidean (PRD Bagian IV).
// Disisipkan ke vertex shader semua material lewat applyConstitutionalWarp().
// Cermin CPU: src/core/math/hyperbolic.ts (rumus harus identik).
// Semua posisi dalam view space: kamera di titik asal, -Z ke depan.

#ifndef PF_MAX_ANCHORS
#define PF_MAX_ANCHORS 8
#endif

uniform float u_time;
uniform float u_constitutionalIntegrity;
uniform float u_hyperbolaCurvature;
uniform float u_spaceWarpSpeed;
uniform float u_horizon;
uniform int u_anchorCount;
uniform vec4 u_anchors[PF_MAX_ANCHORS];

float pfCurvatureAt(vec3 p) {
  float base = u_hyperbolaCurvature * pow(clamp(1.0 - u_constitutionalIntegrity, 0.0, 1.0), 1.5);
  float shield = 0.0;
  for (int i = 0; i < PF_MAX_ANCHORS; i++) {
    if (i >= u_anchorCount) break;
    vec4 a = u_anchors[i];
    float d = distance(p, a.xyz);
    shield = max(shield, 1.0 - smoothstep(0.0, max(a.w, 0.001), d));
  }
  return base * (1.0 - shield);
}

vec3 pfHyperbolicWarp(vec3 p) {
  float c = pfCurvatureAt(p);
  if (c <= 0.0) return p;
  float horizon = max(u_horizon, 1.0);
  float r = length(p.xz) / horizon;
  float k = 1.0 + 2.0 * c;
  float kr = max(k * r, 1e-4);
  float radial = mix(1.0, tanh(kr) / kr, c);

  vec3 q = p;
  q.xz *= radial;

  float far = smoothstep(0.0, 1.0, r);
  float press = (q.y > 0.0) ? 1.0 : 0.3;
  q.y -= c * 0.35 * q.y * far * press;

  float t = u_time * u_spaceWarpSpeed;
  q.x += c * 0.6 * horizon * r * r * sin(t * 0.3 + p.z * 0.02);

  float ang = c * 0.25 * r * sin(t * 0.2);
  float s = sin(ang);
  float co = cos(ang);
  q.xy = mat2(co, s, -s, co) * q.xy;
  return q;
}
