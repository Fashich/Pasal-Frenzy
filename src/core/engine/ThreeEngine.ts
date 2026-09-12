/**
 * ThreeEngine — pengelola scene Three.js (PRD Bagian IV, Dev Planning 03).
 *
 * Tanggung jawab: renderer WebGL2, kamera, pipeline EffectComposer
 * (RenderPass → pass kustom → OutputPass), loop render dengan delta time,
 * resize responsif, pointer lock, raycaster, layer scene, dan uniform global.
 * Loop memakai renderer.setAnimationLoop agar kompatibel WebXR (feature/07).
 */
import type { Vector2 } from 'three';
import {
  ACESFilmicToneMapping,
  Color,
  HalfFloatType,
  PCFShadowMap,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Timer,
  WebGLRenderer,
  WebGLRenderTarget,
  type Intersection,
  type Object3D,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import type { Pass } from 'three/addons/postprocessing/Pass.js';
import { constitutionalBus, type ConstitutionalEventBus } from './ConstitutionalEventBus.ts';
import { GlobalUniforms } from './GlobalUniforms.ts';
import { constitutionalStore, type ConstitutionalStore } from '@core/store/ConstitutionalStore.ts';
import type { QualityPreset } from './ConstitutionalEventBus.ts';

export const SCENE_LAYERS = { gameplay: 0, ui: 1, debug: 2, portalHidden: 3 } as const;

export interface RenderQuality {
  preset: QualityPreset;
  pixelRatioCap: number;
  msaaSamples: number;
  shadows: boolean;
  shadowMapSize: number;
  postProcessing: boolean;
}

export const QUALITY_PRESETS: Record<QualityPreset, RenderQuality> = {
  rendah: {
    preset: 'rendah',
    pixelRatioCap: 1,
    msaaSamples: 0,
    shadows: false,
    shadowMapSize: 512,
    postProcessing: false,
  },
  sedang: {
    preset: 'sedang',
    pixelRatioCap: 1.5,
    msaaSamples: 2,
    shadows: true,
    shadowMapSize: 1024,
    postProcessing: true,
  },
  tinggi: {
    preset: 'tinggi',
    pixelRatioCap: 2,
    msaaSamples: 4,
    shadows: true,
    shadowMapSize: 2048,
    postProcessing: true,
  },
};

export interface ThreeEngineOptions {
  quality?: RenderQuality;
  store?: ConstitutionalStore;
  bus?: ConstitutionalEventBus;
  /** logarithmicDepthBuffer harus ditentukan saat renderer dibuat (PRD: aktif) */
  logarithmicDepthBuffer?: boolean;
  background?: number;
}

export type UpdateCallback = (dt: number, elapsed: number) => void;

/** delta time maksimum (detik) agar tab yang lama tersembunyi tidak melompat */
export const MAX_DELTA = 0.1;

export function computeRenderSize(
  width: number,
  height: number,
  devicePixelRatio: number,
  cap: number,
): { width: number; height: number; dpr: number } {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const dpr = Math.min(Math.max(devicePixelRatio, 0.5), cap);
  return { width: w, height: h, dpr };
}

export class ThreeEngine {
  readonly container: HTMLElement;
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly composer: EffectComposer;
  readonly uniforms = new GlobalUniforms();
  readonly timer = new Timer();
  readonly store: ConstitutionalStore;
  readonly bus: ConstitutionalEventBus;
  quality: RenderQuality;

  private readonly renderPass: RenderPass;
  private readonly outputPass: OutputPass;
  private readonly updateCallbacks = new Set<UpdateCallback>();
  private readonly afterRenderCallbacks = new Set<UpdateCallback>();
  private readonly raycaster = new Raycaster();
  private readonly resizeObserver: ResizeObserver | null;
  private running = false;
  private elapsed = 0;
  private frameCount = 0;
  private readonly onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
  };
  pointerLocked = false;
  /** true jika post-processing aktif; jika tidak, render langsung ke layar */
  usePostProcessing: boolean;

  constructor(container: HTMLElement, options: ThreeEngineOptions = {}) {
    this.container = container;
    this.store = options.store ?? constitutionalStore;
    this.bus = options.bus ?? constitutionalBus;
    this.quality = options.quality ?? QUALITY_PRESETS.sedang;
    this.usePostProcessing = this.quality.postProcessing;

    this.renderer = new WebGLRenderer({
      antialias: this.quality.msaaSamples > 0 && !this.quality.postProcessing,
      alpha: false,
      stencil: true,
      depth: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: options.logarithmicDepthBuffer ?? true,
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.setClearColor(new Color(options.background ?? 0x080810), 1);
    this.renderer.domElement.classList.add('pf-canvas', 'pf-canvas--three');
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.tabIndex = -1;
    container.appendChild(this.renderer.domElement);

    this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.layers.enable(SCENE_LAYERS.gameplay);
    this.camera.layers.enable(SCENE_LAYERS.ui);

    const target = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      samples: this.quality.msaaSamples,
      stencilBuffer: true,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.outputPass);

    this.resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
    this.resizeObserver?.observe(container);
    this.resize();

    // Timer terhubung ke Page Visibility API: delta tidak melompat saat tab tersembunyi
    this.timer.connect(document);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  /* ------------------------------------------------------------------ */
  /* Ukuran & kualitas                                                    */
  /* ------------------------------------------------------------------ */
  get size(): { width: number; height: number; dpr: number } {
    const rect = this.container.getBoundingClientRect();
    return computeRenderSize(
      rect.width || window.innerWidth,
      rect.height || window.innerHeight,
      window.devicePixelRatio || 1,
      this.quality.pixelRatioCap,
    );
  }

  resize(): void {
    const { width, height, dpr } = this.size;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.uniforms.setResolution(width * dpr, height * dpr);
  }

  setQuality(quality: RenderQuality, auto = false): void {
    this.quality = quality;
    this.usePostProcessing = quality.postProcessing;
    this.renderer.shadowMap.enabled = quality.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    const rt = this.composer.renderTarget1;
    rt.samples = quality.msaaSamples;
    this.composer.renderTarget2.samples = quality.msaaSamples;
    rt.dispose();
    this.composer.renderTarget2.dispose();
    this.resize();
    this.bus.emit('QUALITY_CHANGED', { preset: quality.preset, auto });
  }

  /* ------------------------------------------------------------------ */
  /* Pipeline                                                             */
  /* ------------------------------------------------------------------ */
  /** menyisipkan pass kustom sebelum OutputPass */
  addPass(pass: Pass): () => void {
    const passes = this.composer.passes;
    const index = passes.indexOf(this.outputPass);
    this.composer.insertPass(pass, index < 0 ? passes.length : index);
    return () => this.composer.removePass(pass);
  }

  /* ------------------------------------------------------------------ */
  /* Loop                                                                 */
  /* ------------------------------------------------------------------ */
  onUpdate(cb: UpdateCallback): () => void {
    this.updateCallbacks.add(cb);
    return () => this.updateCallbacks.delete(cb);
  }

  onAfterRender(cb: UpdateCallback): () => void {
    this.afterRenderCallbacks.add(cb);
    return () => this.afterRenderCallbacks.delete(cb);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.renderer.setAnimationLoop((timestamp: number) => this.frame(timestamp));
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  get isRunning(): boolean {
    return this.running;
  }

  get frames(): number {
    return this.frameCount;
  }

  private frame(timestamp: number): void {
    this.timer.update(timestamp);
    const dt = Math.min(this.timer.getDelta(), MAX_DELTA);
    this.elapsed += dt;
    this.frameCount += 1;

    const state = this.store.getState();
    state.tickIntegrity(dt);
    this.uniforms.update(dt, this.elapsed, this.store.getState());
    if (state.currentChapterId !== null) state.addPlayTime(dt * 1000);

    for (const cb of this.updateCallbacks) cb(dt, this.elapsed);

    if (this.usePostProcessing) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);

    for (const cb of this.afterRenderCallbacks) cb(dt, this.elapsed);
  }

  /* ------------------------------------------------------------------ */
  /* Interaksi                                                            */
  /* ------------------------------------------------------------------ */
  /** raycast dari koordinat NDC (-1..1); default layer gameplay */
  pick(ndc: Vector2, objects: Object3D[] = this.scene.children, recursive = true): Intersection[] {
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.layers.set(SCENE_LAYERS.gameplay);
    return this.raycaster.intersectObjects(objects, recursive);
  }

  async requestPointerLock(): Promise<boolean> {
    const el = this.renderer.domElement;
    if (typeof el.requestPointerLock !== 'function') return false;
    try {
      const result = el.requestPointerLock({ unadjustedMovement: true }) as
        Promise<void> | undefined;
      if (result && typeof result.then === 'function') await result;
      return true;
    } catch {
      try {
        const fallback = el.requestPointerLock() as Promise<void> | undefined;
        if (fallback && typeof fallback.catch === 'function') {
          fallback.catch(() => {
            /* ditolak oleh dokumen (iframe/WebView); tetap berjalan tanpa lock */
          });
        }
        return true;
      } catch {
        return false;
      }
    }
  }

  exitPointerLock(): void {
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
  }

  /* ------------------------------------------------------------------ */
  /* Pembersihan                                                          */
  /* ------------------------------------------------------------------ */
  dispose(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    this.timer.dispose();
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.updateCallbacks.clear();
    this.afterRenderCallbacks.clear();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
