/**
 * PortalSystem — portal antar argumen dengan render-to-texture (Dev Planning 03 #3).
 *
 * Setiap portal merender "sisi lain" dari kamera virtual (kamera utama yang
 * ditransformasi lewat pasangan portal) ke WebGLRenderTarget yang ukurannya
 * proporsional dengan area portal di layar, bukan layar penuh. Scissor test
 * membatasi fragmen ke kotak layar portal; bidang dekat kamera virtual dibuat
 * miring (oblique clipping) agar geometri di belakang portal tujuan tidak
 * bocor. Bentuk portal yang presisi dijamin oleh quad portal itu sendiri:
 * hanya fragmen quad yang mengambil sampel tekstur (masking per piksel),
 * sehingga stencil buffer tidak diperlukan untuk memotong bentuk. Stencil
 * tetap diaktifkan di renderer untuk efek retakan kaca (Case 1).
 */
import {
  DoubleSide,
  Frustum,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type Scene,
  type WebGLRenderer,
} from 'three';
import hyperbolicChunk from '@core/shaders/chunks/hyperbolic.glsl';
import { SCENE_LAYERS } from './ThreeEngine.ts';
import type { GlobalUniformSet } from './GlobalUniforms.ts';

export interface PortalOptions {
  width: number;
  height: number;
  /** warna tepi cahaya (rgb 0..1) */
  rim?: [number, number, number];
  /** batas resolusi render target (piksel), untuk hemat memori GPU */
  maxTextureSize?: number;
}

// Catatan penting: renderer memakai logarithmicDepthBuffer, jadi setiap ShaderMaterial
// kustom WAJIB menyertakan chunk logdepthbuf_* agar depth test-nya sepadan dengan
// material bawaan. Quad portal juga ikut warp hiperbolik agar menyatu dengan dinding.
const portalVertex = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
${hyperbolicChunk}
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  mvPosition.xyz = pfHyperbolicWarp(mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <logdepthbuf_vertex>
}
`;

const portalFragment = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D u_view;
uniform vec4 u_viewport; // x, y, w, h dalam piksel layar
uniform vec3 u_rim;
uniform float u_time;
uniform float u_constitutionalIntegrity;
varying vec2 vUv;
void main() {
  #include <logdepthbuf_fragment>
  vec2 uv = (gl_FragCoord.xy - u_viewport.xy) / u_viewport.zw;
  vec3 color = texture2D(u_view, clamp(uv, 0.0, 1.0)).rgb;
  // tepi bercahaya yang berdenyut mengikuti integritas
  float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float pulse = 0.5 + 0.5 * sin(u_time * (2.0 + 4.0 * (1.0 - u_constitutionalIntegrity)));
  float rim = smoothstep(0.06, 0.0, edge) * (0.6 + 0.4 * pulse);
  gl_FragColor = vec4(mix(color, u_rim, rim), 1.0);
}
`;

export class Portal {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly renderTarget: WebGLRenderTarget;
  readonly width: number;
  readonly height: number;
  destination: Portal | null = null;
  readonly maxTextureSize: number;
  /** kotak layar (px) terakhir; dipakai scissor dan sampling */
  readonly viewport = new Vector4();
  visibleThisFrame = false;

  constructor(options: PortalOptions, uniforms: GlobalUniformSet) {
    this.width = options.width;
    this.height = options.height;
    this.maxTextureSize = options.maxTextureSize ?? 2048;
    this.renderTarget = new WebGLRenderTarget(64, 64, {
      type: HalfFloatType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    const material = new ShaderMaterial({
      uniforms: {
        u_view: { value: this.renderTarget.texture },
        u_viewport: { value: this.viewport },
        u_rim: { value: new Vector3(...(options.rim ?? [0.23, 0.51, 0.96])) },
        u_time: uniforms.u_time,
        u_constitutionalIntegrity: uniforms.u_constitutionalIntegrity,
        u_hyperbolaCurvature: uniforms.u_hyperbolaCurvature,
        u_spaceWarpSpeed: uniforms.u_spaceWarpSpeed,
        u_horizon: uniforms.u_horizon,
        u_anchorCount: uniforms.u_anchorCount,
        u_anchors: uniforms.u_anchors,
      },
      vertexShader: portalVertex,
      fragmentShader: portalFragment,
      side: DoubleSide,
    });
    this.mesh = new Mesh(new PlaneGeometry(options.width, options.height), material);
    this.mesh.frustumCulled = true;
    this.mesh.userData['portal'] = this;
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

const _frustum = new Frustum();
const _projScreen = new Matrix4();
const _corner = new Vector3();
const _srcInverse = new Matrix4();
const _flip = new Matrix4().makeRotationY(Math.PI);
const _plane = new Plane();
const _normal = new Vector3();
const _pos = new Vector3();
const _q = new Vector4();
const _clip = new Vector4();

export class PortalSystem {
  readonly portals: Portal[] = [];
  private readonly virtualCamera = new PerspectiveCamera();
  private readonly uniforms: GlobalUniformSet;
  /** batas atas total piksel RT per frame agar iGPU tetap 60 fps */
  pixelBudget = 1_600_000;
  /** oblique near-plane clipping (dimatikan hanya untuk debugging) */
  obliqueClipping = true;
  /** posisi & arah kamera virtual terakhir (debugging) */
  readonly lastVirtualPosition = new Vector3();
  readonly lastVirtualDirection = new Vector3();

  constructor(uniforms: GlobalUniformSet) {
    this.uniforms = uniforms;
  }

  createPair(a: PortalOptions, b: PortalOptions): [Portal, Portal] {
    const pa = new Portal(a, this.uniforms);
    const pb = new Portal(b, this.uniforms);
    pa.destination = pb;
    pb.destination = pa;
    this.portals.push(pa, pb);
    return [pa, pb];
  }

  remove(portal: Portal): void {
    const i = this.portals.indexOf(portal);
    if (i >= 0) this.portals.splice(i, 1);
    portal.dispose();
  }

  /**
   * Merender tekstur semua portal yang terlihat. Panggil sebelum render utama.
   * Mengembalikan jumlah portal yang dirender (untuk statistik performa).
   */
  render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): number {
    const size = renderer.getDrawingBufferSize(_tmpSize);
    camera.updateMatrixWorld();
    _projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreen);

    let rendered = 0;
    let budget = this.pixelBudget;
    const prevTarget = renderer.getRenderTarget();
    const prevScissor = renderer.getScissorTest();

    for (const portal of this.portals) {
      portal.visibleThisFrame = false;
      const dest = portal.destination;
      if (!dest || !portal.mesh.visible) continue;
      portal.mesh.updateMatrixWorld();
      const sphere = portal.mesh.geometry.boundingSphere;
      if (!sphere) portal.mesh.geometry.computeBoundingSphere();
      const bs = portal.mesh.geometry.boundingSphere;
      if (!bs) continue;
      const worldSphere = bs.clone().applyMatrix4(portal.mesh.matrixWorld);
      if (!_frustum.intersectsSphere(worldSphere)) continue;

      // kotak layar dari 4 sudut portal
      const half = { x: portal.width / 2, y: portal.height / 2 };
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let behind = 0;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        _corner.set(sx * half.x, sy * half.y, 0).applyMatrix4(portal.mesh.matrixWorld);
        _corner.applyMatrix4(camera.matrixWorldInverse);
        if (_corner.z > -camera.near) {
          behind += 1;
          continue;
        }
        _corner.applyMatrix4(camera.projectionMatrix);
        minX = Math.min(minX, _corner.x);
        maxX = Math.max(maxX, _corner.x);
        minY = Math.min(minY, _corner.y);
        maxY = Math.max(maxY, _corner.y);
      }
      if (behind === 4) continue;
      if (behind > 0) {
        minX = -1;
        maxX = 1;
        minY = -1;
        maxY = 1;
      }
      minX = Math.max(-1, minX);
      maxX = Math.min(1, maxX);
      minY = Math.max(-1, minY);
      maxY = Math.min(1, maxY);
      if (maxX <= minX || maxY <= minY) continue;

      const px = Math.floor(((minX + 1) / 2) * size.x);
      const py = Math.floor(((minY + 1) / 2) * size.y);
      const pw = Math.ceil(((maxX - minX) / 2) * size.x);
      const ph = Math.ceil(((maxY - minY) / 2) * size.y);
      if (pw < 2 || ph < 2) continue;
      portal.viewport.set(px, py, pw, ph);

      // RT proporsional area portal (bukan layar penuh), dibatasi anggaran piksel
      let scale = Math.min(1, Math.sqrt(budget / Math.max(1, pw * ph)));
      const rtW = Math.min(portal.maxTextureSize, Math.max(16, Math.round(pw * scale)));
      const rtH = Math.min(portal.maxTextureSize, Math.max(16, Math.round(ph * scale)));
      scale = rtW / pw;
      budget -= rtW * rtH;
      if (portal.renderTarget.width !== rtW || portal.renderTarget.height !== rtH) {
        portal.renderTarget.setSize(rtW, rtH);
      }

      // kamera virtual: M_dest * flipY * inverse(M_src) * M_cam
      _srcInverse.copy(portal.mesh.matrixWorld).invert();
      this.virtualCamera.matrixWorld
        .copy(dest.mesh.matrixWorld)
        .multiply(_flip)
        .multiply(_srcInverse)
        .multiply(camera.matrixWorld);
      this.virtualCamera.matrixWorld.decompose(
        this.virtualCamera.position,
        this.virtualCamera.quaternion,
        this.virtualCamera.scale,
      );
      this.virtualCamera.matrixWorldInverse.copy(this.virtualCamera.matrixWorld).invert();
      this.virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
      this.virtualCamera.near = camera.near;
      this.virtualCamera.far = camera.far;
      this.virtualCamera.layers.mask = camera.layers.mask;
      this.virtualCamera.layers.disable(SCENE_LAYERS.portalHidden);

      // oblique near plane pada bidang portal tujuan (konvensi Reflector three.js:
      // normal = arah depan portal, kamera virtual berada di sisi belakangnya)
      dest.mesh.getWorldDirection(_normal);
      _pos.setFromMatrixPosition(dest.mesh.matrixWorld);
      _plane.setFromNormalAndCoplanarPoint(_normal, _pos);
      _plane.applyMatrix4(this.virtualCamera.matrixWorldInverse);
      if (this.obliqueClipping) applyObliqueNearPlane(this.virtualCamera.projectionMatrix, _plane);
      this.lastVirtualPosition.copy(this.virtualCamera.position);
      this.virtualCamera.getWorldDirection(this.lastVirtualDirection);
      this.virtualCamera.projectionMatrixInverse.copy(this.virtualCamera.projectionMatrix).invert();

      // render sisi lain ke RT (portal sumber disembunyikan agar tidak rekursif)
      const prevSrcVisible = portal.mesh.visible;
      const prevDestVisible = dest.mesh.visible;
      portal.mesh.visible = false;
      dest.mesh.visible = false;
      // viewport milik render target (piksel RT), bukan renderer.setViewport yang
      // hanya berlaku untuk canvas: frame penuh digeser agar kotak portal jatuh di [0, rt]
      portal.renderTarget.viewport.set(-px * scale, -py * scale, size.x * scale, size.y * scale);
      portal.renderTarget.scissor.set(0, 0, rtW, rtH);
      renderer.setRenderTarget(portal.renderTarget);
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.render(scene, this.virtualCamera);
      portal.mesh.visible = prevSrcVisible;
      dest.mesh.visible = prevDestVisible;
      portal.visibleThisFrame = true;
      rendered += 1;
    }

    renderer.setRenderTarget(prevTarget);
    renderer.setScissorTest(prevScissor);
    return rendered;
  }

  dispose(): void {
    for (const p of this.portals) p.dispose();
    this.portals.length = 0;
  }
}

const _tmpSize = new Vector2();

/** Lengyel (2005): modifikasi baris ketiga matriks proyeksi agar near plane = bidang clip. */
export function applyObliqueNearPlane(projection: Matrix4, clipPlane: Plane): void {
  const m = projection.elements;
  const e = (i: number): number => m[i] ?? 0;
  _clip.set(clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z, clipPlane.constant);
  _q.set(
    (Math.sign(_clip.x) + e(8)) / e(0),
    (Math.sign(_clip.y) + e(9)) / e(5),
    -1,
    (1 + e(10)) / e(14),
  );
  const dot = _clip.x * _q.x + _clip.y * _q.y + _clip.z * _q.z + _clip.w * _q.w;
  const c = _clip.multiplyScalar(2 / dot);
  m[2] = c.x;
  m[6] = c.y;
  m[10] = c.z + 1;
  m[14] = c.w;
}
