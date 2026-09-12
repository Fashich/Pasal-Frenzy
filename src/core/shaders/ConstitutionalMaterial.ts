/**
 * Menyuntikkan transformasi hiperbolik ke vertex shader material Three.js bawaan
 * (MeshStandard/Physical/Basic/Lambert/Phong) lewat onBeforeCompile, sehingga
 * seluruh geometri scene mengikuti kelengkungan yang sama tanpa menulis ulang
 * pencahayaan (PRD Bagian IV: "vertex shader yang diaplikasikan secara global").
 */
import type { Material, Object3D, WebGLProgramParametersWithUniforms } from 'three';
import hyperbolicChunk from './chunks/hyperbolic.glsl';
import type { GlobalUniformSet } from '@core/engine/GlobalUniforms.ts';

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

const WARP_KEY = 'pf-hyperbolic-v1';

export interface WarpableMaterial extends Material {
  userData: Record<string, unknown> & { pfWarp?: boolean };
}

/**
 * Mengaktifkan warp pada material. Aman dipanggil berulang.
 * Uniform dibagikan by-reference dengan `uniforms` global engine.
 */
export function applyConstitutionalWarp<T extends Material>(
  material: T,
  uniforms: GlobalUniformSet,
): T {
  const m = material as unknown as WarpableMaterial;
  if (m.userData.pfWarp) return material;
  m.userData.pfWarp = true;

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

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${hyperbolicChunk}`)
      .replace('#include <project_vertex>', PROJECT_VERTEX_WARPED);
  };

  const previousKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () =>
    `${previousKey ? previousKey.call(material) : ''}|${WARP_KEY}`;
  material.needsUpdate = true;
  return material;
}

/** Menerapkan warp ke semua material di bawah sebuah Object3D. */
export function applyConstitutionalWarpDeep(root: Object3D, uniforms: GlobalUniformSet): void {
  root.traverse((obj) => {
    const mat = (obj as { material?: Material | Material[] }).material;
    if (!mat) return;
    if (Array.isArray(mat)) mat.forEach((mm) => applyConstitutionalWarp(mm, uniforms));
    else applyConstitutionalWarp(mat, uniforms);
  });
}
