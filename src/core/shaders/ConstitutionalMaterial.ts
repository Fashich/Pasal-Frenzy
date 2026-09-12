/**
 * Menyuntikkan transformasi hiperbolik dan distorsi spasial ke vertex shader
 * material Three.js bawaan (MeshStandard/Physical/Basic/Lambert/Phong) lewat
 * onBeforeCompile, sehingga seluruh geometri scene mengikuti kelengkungan yang
 * sama tanpa menulis ulang pencahayaan (PRD Bagian IV dan XII).
 *
 * Urutan di vertex shader:
 *  1. begin_vertex   : posisi objek -> + distorsi simplex (ruang dunia)
 *  2. project_vertex : ke view space -> warp hiperbolik -> proyeksi
 */
import type { Material, Object3D, WebGLProgramParametersWithUniforms } from 'three';
import hyperbolicChunk from './chunks/hyperbolic.glsl';
import simplexChunk from './chunks/simplexNoise.glsl';
import distortionChunk from './chunks/spatialDistortion.glsl';
import type { GlobalUniformSet } from '@core/engine/GlobalUniforms.ts';

/** salinan chunk `begin_vertex` three r184 + distorsi spasial */
const BEGIN_VERTEX_DISTORTED = /* glsl */ `
vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif
{
  vec4 pfWorld = modelMatrix * vec4( position, 1.0 );
  #ifdef USE_INSTANCING
    pfWorld = modelMatrix * instanceMatrix * vec4( position, 1.0 );
  #endif
  vec3 pfDisp = pfSpatialDistortion( pfWorld.xyz, u_time );
  // kembalikan ke ruang objek: abaikan skala non-uniform (distorsi kecil)
  transformed += ( inverse( mat3( modelMatrix ) ) * pfDisp );
}
`;

/** salinan chunk `project_vertex` three r184 + satu baris warp di view space */
const PROJECT_VERTEX_WARPED = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
mvPosition.xyz = pfHyperbolicWarp( mvPosition.xyz );
gl_Position = projectionMatrix * mvPosition;
`;

const WARP_KEY = 'pf-warp-v2';

export interface WarpOptions {
  /** warp hiperbolik (default true) */
  hyperbolic?: boolean;
  /** distorsi simplex permukaan (default true) */
  distortion?: boolean;
}

export interface WarpableMaterial extends Material {
  userData: Record<string, unknown> & { pfWarp?: string };
}

/**
 * Mengaktifkan warp pada material. Aman dipanggil berulang.
 * Uniform dibagikan by-reference dengan `uniforms` global engine.
 */
export function applyConstitutionalWarp<T extends Material>(
  material: T,
  uniforms: GlobalUniformSet,
  options: WarpOptions = {},
): T {
  const hyperbolic = options.hyperbolic ?? true;
  const distortion = options.distortion ?? true;
  const key = `${WARP_KEY}|h${hyperbolic ? 1 : 0}|d${distortion ? 1 : 0}`;
  const m = material as unknown as WarpableMaterial;
  if (m.userData.pfWarp === key) return material;
  m.userData.pfWarp = key;

  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms['u_time'] = uniforms.u_time;
    shader.uniforms['u_constitutionalIntegrity'] = uniforms.u_constitutionalIntegrity;
    shader.uniforms['u_hyperbolaCurvature'] = uniforms.u_hyperbolaCurvature;
    shader.uniforms['u_spaceWarpSpeed'] = uniforms.u_spaceWarpSpeed;
    shader.uniforms['u_horizon'] = uniforms.u_horizon;
    shader.uniforms['u_anchorCount'] = uniforms.u_anchorCount;
    shader.uniforms['u_anchors'] = uniforms.u_anchors;
    shader.uniforms['u_democracyPressure'] = uniforms.u_democracyPressure;
    shader.uniforms['u_temporalFlux'] = uniforms.u_temporalFlux;

    let pars = '';
    if (hyperbolic) pars += `\n${hyperbolicChunk}`;
    if (distortion) pars += `\n${simplexChunk}\n${distortionChunk}`;
    if (distortion && !hyperbolic) pars += '\nuniform float u_time;';

    let vs = shader.vertexShader.replace('#include <common>', `#include <common>${pars}`);
    if (distortion) vs = vs.replace('#include <begin_vertex>', BEGIN_VERTEX_DISTORTED);
    if (hyperbolic) vs = vs.replace('#include <project_vertex>', PROJECT_VERTEX_WARPED);
    shader.vertexShader = vs;
  };

  const previousKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${previousKey ? previousKey.call(material) : ''}|${key}`;
  material.needsUpdate = true;
  return material;
}

/** Menerapkan warp ke semua material di bawah sebuah Object3D. */
export function applyConstitutionalWarpDeep(
  root: Object3D,
  uniforms: GlobalUniformSet,
  options: WarpOptions = {},
): void {
  root.traverse((obj) => {
    const mat = (obj as { material?: Material | Material[] }).material;
    if (!mat) return;
    if (Array.isArray(mat)) mat.forEach((mm) => applyConstitutionalWarp(mm, uniforms, options));
    else applyConstitutionalWarp(mat, uniforms, options);
  });
}
