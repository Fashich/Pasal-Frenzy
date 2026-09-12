/**
 * SplineStage — pemuat scene Spline (.splinecode) yang di-host sendiri.
 *
 * Aturan proyek: tanpa CDN saat runtime dan harus bisa offline. Karena itu:
 *  - berkas .splinecode disimpan di public/spline/ (lihat spline-scenes.json),
 *  - modul WASM runtime disalin ke public/spline/wasm/ (npm run spline:sync),
 *  - runtime Spline diimpor dinamis hanya bila ada scene yang dikonfigurasi,
 *    sehingga build tanpa scene tidak memuat runtime sama sekali,
 *  - HTML content di dalam scene dimatikan (htmlContentMode: 'none'),
 *  - backend dipaksa WebGL agar perilaku sama di iGPU dan Android.
 * Bila pemuatan gagal (berkas hilang, GPU lemah), host diberi kelas is-failed dan
 * tampilan fallback (CSS/Three.js) tetap dipakai: tidak ada layar kosong.
 */
import type { Application } from '@splinetool/runtime';

export interface SplineStageOptions {
  /** URL .splinecode (relatif base atau absolut) */
  url: string;
  /** nilai awal variabel scene (mis. { integrity: 0.82 }) */
  variables?: Record<string, string | number | boolean>;
  renderMode?: 'auto' | 'continuous' | 'manual';
  /** true = scene menerima pointer (hover/klik); default false (dekoratif) */
  interactive?: boolean;
  onLoad?: (app: Application) => void;
  onError?: (error: unknown) => void;
}

export function splineWasmPath(base: string = import.meta.env.BASE_URL): string {
  return `${base}spline/wasm/`;
}

export class SplineStage {
  readonly canvas: HTMLCanvasElement;
  private app: Application | null = null;
  private resize: ResizeObserver | null = null;
  private visibility: IntersectionObserver | null = null;
  private disposed = false;
  private loaded = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly options: SplineStageOptions,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pf-spline-canvas';
    this.canvas.style.pointerEvents = options.interactive ? 'auto' : 'none';
    host.classList.add('pf-spline-host');
    host.appendChild(this.canvas);
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  get application(): Application | null {
    return this.app;
  }

  /** Memuat runtime + scene. Mengembalikan true bila berhasil. */
  async load(): Promise<boolean> {
    try {
      const { Application } = await import('@splinetool/runtime');
      if (this.disposed) return false;
      const app = new Application(this.canvas, {
        renderMode: this.options.renderMode ?? 'auto',
        wasmPath: splineWasmPath(),
        htmlContentMode: 'none',
        renderer: 'webgl',
      });
      this.app = app;
      await app.load(this.options.url, this.options.variables);
      if (this.disposed) {
        app.dispose();
        return false;
      }
      this.loaded = true;
      this.fit();
      this.observe();
      this.host.classList.add('is-loaded');
      this.options.onLoad?.(app);
      return true;
    } catch (error) {
      this.host.classList.add('is-failed');
      this.options.onError?.(error);
      return false;
    }
  }

  /** menyesuaikan ukuran canvas dengan host (dipanggil otomatis lewat ResizeObserver) */
  fit(): void {
    if (!this.app) return;
    const w = Math.max(1, Math.round(this.host.clientWidth));
    const h = Math.max(1, Math.round(this.host.clientHeight));
    this.app.setSize(w, h);
  }

  setVariables(variables: Record<string, string | number | boolean>): void {
    this.app?.setVariables(variables);
  }

  pause(): void {
    if (this.app && !this.app.isStopped) this.app.stop();
  }

  resume(): void {
    if (this.app?.isStopped) this.app.play();
  }

  private observe(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resize = new ResizeObserver(() => this.fit());
      this.resize.observe(this.host);
    }
    // hemat GPU: berhenti merender saat host tidak terlihat
    if (typeof IntersectionObserver !== 'undefined') {
      this.visibility = new IntersectionObserver(
        (entries) => {
          const visible = entries.some((e) => e.isIntersecting);
          if (visible) this.resume();
          else this.pause();
        },
        { threshold: 0.01 },
      );
      this.visibility.observe(this.host);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.resize?.disconnect();
    this.visibility?.disconnect();
    this.resize = null;
    this.visibility = null;
    this.app?.dispose();
    this.app = null;
    this.canvas.remove();
    this.host.classList.remove('pf-spline-host', 'is-loaded', 'is-failed');
  }
}
