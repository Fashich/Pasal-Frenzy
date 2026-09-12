/**
 * ChromaticAberrationPass — indikator utama tekanan konstitusional (PRD Bagian XII).
 *
 * Pass terakhir sebelum OutputPass. Tiga sampel RGB dengan offset yang membesar
 * saat integritas turun (kurva eksponensial, maksimum 15 px pada integritas 0),
 * arah radial dari pusat (seperti lensa nyata) plus komponen global. Saat Mode
 * Frenzy aktif ada jitter kecil; u_temporalFlux (Case 3, Constitutional Rewind)
 * menambah offset. Warna juga didesaturasi bertahap: dunia kehilangan warnanya
 * seiring erosi demokrasi (PRD Bagian XIV).
 */
import { ShaderMaterial, UniformsUtils, Vector2 } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { GlobalUniformSet } from '@core/engine/GlobalUniforms.ts';

export const MAX_ABERRATION_PX = 15;

/** offset piksel per kanal untuk integritas tertentu; kurva eksponensial (bukan linear) */
export function aberrationOffsetPx(
  integrity: number,
  maxPx = MAX_ABERRATION_PX,
  frenzy = 0,
  temporalFlux = 0,
): number {
  const stress = Math.min(1, Math.max(0, 1 - integrity));
  const curve = (Math.exp(stress * 3) - 1) / (Math.exp(3) - 1); // 0 -> 0, 1 -> 1, cembung
  const boost = 1 + frenzy * 0.35 + temporalFlux * 0.6;
  return Math.min(maxPx * 2, curve * maxPx * boost);
}

/** desaturasi 0..1 mengikuti erosi integritas */
export function desaturationOf(integrity: number): number {
  const stress = Math.min(1, Math.max(0, 1 - integrity));
  return Math.min(0.7, stress * stress * 0.8);
}

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 u_resolution;
uniform float u_offsetPx;
uniform float u_desaturate;
uniform float u_frenzy;
uniform float u_time;
varying vec2 vUv;

float pfHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  vec2 fromCenter = vUv - 0.5;
  float radial = length(fromCenter) * 2.0;
  // 40% global (seluruh layar) + 60% radial (lebih kuat di tepi)
  vec2 dir = normalize(fromCenter + vec2(1e-5)) * (0.4 + 0.6 * radial);
  // jitter halus saat Frenzy: frekuensi rendah (di bawah 3 Hz, WCAG 2.1)
  float jitter = u_frenzy * (pfHash(vec2(floor(u_time * 2.5), 1.0)) - 0.5) * 0.8;
  vec2 offset = dir * (u_offsetPx * (1.0 + jitter)) * texel;

  float r = texture2D(tDiffuse, vUv + offset).r;
  vec4 g = texture2D(tDiffuse, vUv);
  float b = texture2D(tDiffuse, vUv - offset).b;
  vec3 color = vec3(r, g.g, b);

  // desaturasi: erosi demokrasi = dunia kehilangan warna
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, vec3(luma), u_desaturate);

  gl_FragColor = vec4(color, g.a);
}
`;

export class ChromaticAberrationPass extends ShaderPass {
  private readonly global: GlobalUniformSet;
  maxOffsetPx = MAX_ABERRATION_PX;

  constructor(global: GlobalUniformSet) {
    const material = new ShaderMaterial({
      uniforms: UniformsUtils.clone({
        tDiffuse: { value: null },
        u_resolution: { value: new Vector2(1, 1) },
        u_offsetPx: { value: 0 },
        u_desaturate: { value: 0 },
        u_frenzy: { value: 0 },
        u_time: { value: 0 },
      }),
      vertexShader,
      fragmentShader,
    });
    super(material, 'tDiffuse');
    this.global = global;
    this.material.uniforms['u_frenzy'] = global.u_frenzy;
    this.material.uniforms['u_time'] = global.u_time;
    this.material.uniforms['u_resolution'] = global.u_resolution;
  }

  /** dipanggil tiap frame sebelum composer.render */
  update(): void {
    const integrity = this.global.u_constitutionalIntegrity.value;
    const u = this.material.uniforms;
    if (u['u_offsetPx']) {
      u['u_offsetPx'].value = aberrationOffsetPx(
        integrity,
        this.maxOffsetPx,
        this.global.u_frenzy.value,
        this.global.u_temporalFlux.value,
      );
    }
    if (u['u_desaturate']) u['u_desaturate'].value = desaturationOf(integrity);
  }
}
