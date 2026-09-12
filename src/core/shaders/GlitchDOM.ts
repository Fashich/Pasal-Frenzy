/**
 * GlitchDOMEffect — Browser Corruption Protocol (PRD Bagian X, Dev Planning 04/13).
 *
 * Distorsi realitas Case 3 meluber keluar canvas ke browser itu sendiri, dalam
 * empat tahap yang dikontrol integritas konstitusional:
 *
 *  Tahap 1 (< 0.40): judul tab disisipi karakter Unicode yang tampak seperti
 *                    artefak rendering yang rusak, secara periodik.
 *  Tahap 2 (< 0.30): scrollbar palsu muncul dan bergerak sendiri; elemen
 *                    bertanda [data-glitch-target] mengalami micro-tremor.
 *  Tahap 3 (< 0.20): clip-path "VHS tracking error" pada wrapper utama:
 *                    strip horizontal bergeser dengan fase berbeda.
 *  Tahap 4 (< 0.10): semua tahap aktif dengan intensitas maksimum.
 *
 * Aksesibilitas (tidak bisa dikompromikan):
 *  - prefers-reduced-motion / preferensi pemain: semua gerakan diganti fade
 *    opacity lambat; tidak ada tremor, tidak ada clip-path bergerak.
 *  - Tidak ada perubahan yang berulang lebih cepat dari 3 kali per detik
 *    (WCAG 2.1 SC 2.3.1): semua animasi berdurasi >= 400 ms.
 *  - Semua efek berjalan lewat Web Animations API (off-main-thread bila bisa)
 *    dan dapat dibatalkan; restore() mengembalikan DOM persis seperti semula.
 */
import {
  constitutionalBus,
  type BrowserCorruptionStage,
  type ConstitutionalEventBus,
} from '@core/engine/ConstitutionalEventBus.ts';

export type GlitchStage = 0 | BrowserCorruptionStage;

export const GLITCH_THRESHOLDS: readonly [number, number, number, number] = [0.4, 0.3, 0.2, 0.1];

/** tahap dari integritas: 0.40 -> 1, 0.30 -> 2, 0.20 -> 3, 0.10 -> 4 */
export function stageForIntegrity(integrity: number): GlitchStage {
  if (integrity < GLITCH_THRESHOLDS[3]) return 4;
  if (integrity < GLITCH_THRESHOLDS[2]) return 3;
  if (integrity < GLITCH_THRESHOLDS[1]) return 2;
  if (integrity < GLITCH_THRESHOLDS[0]) return 1;
  return 0;
}

/**
 * Karakter yang terlihat seperti artefak rendering (combining marks, zero-width,
 * box drawing), bukan teks yang sengaja ditulis.
 */
const ARTIFACT_CHARS = ['̵', '̶', '̷', '̸', '҉', '͓', '҉', '▒', '░', '​', '͏'];

export function corruptTitle(base: string, intensity: number, seed: number): string {
  if (intensity <= 0) return base;
  const chars = Array.from(base);
  const count = Math.max(1, Math.round(chars.length * Math.min(0.5, intensity * 0.35)));
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const at = Math.floor(rand() * chars.length);
    const glyph = ARTIFACT_CHARS[Math.floor(rand() * ARTIFACT_CHARS.length)] ?? '';
    chars[at] = `${chars[at] ?? ''}${glyph}`;
  }
  return chars.join('');
}

export interface GlitchDOMOptions {
  bus?: ConstitutionalEventBus;
  /** wrapper utama halaman (default #app) */
  wrapper?: HTMLElement | null;
  /** paksa mode reduced motion (selain media query) */
  reducedMotion?: boolean;
  document?: Document;
}

export class GlitchDOMEffect {
  private readonly bus: ConstitutionalEventBus;
  private readonly doc: Document;
  private readonly wrapper: HTMLElement | null;
  private readonly forceReduced: boolean;
  private stage: GlitchStage = 0;
  private baseTitle: string;
  private titleTimer: ReturnType<typeof setInterval> | null = null;
  private titleSeed = 1;
  private scrollbar: HTMLElement | null = null;
  private readonly animations: Animation[] = [];
  private readonly tremorTargets = new Set<Element>();
  private observer: IntersectionObserver | null = null;
  private lastIntegrity = 1;
  private prevHtmlOverflow = '';

  constructor(options: GlitchDOMOptions = {}) {
    this.bus = options.bus ?? constitutionalBus;
    this.doc = options.document ?? document;
    this.wrapper = options.wrapper === undefined ? this.doc.getElementById('app') : options.wrapper;
    this.forceReduced = options.reducedMotion ?? false;
    this.baseTitle = this.doc.title;
  }

  get currentStage(): GlitchStage {
    return this.stage;
  }

  get reducedMotion(): boolean {
    if (this.forceReduced) return true;
    const w = this.doc.defaultView;
    return (
      !!w &&
      typeof w.matchMedia === 'function' &&
      w.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /** dipanggil oleh bab (Case 3) setiap kali integritas berubah */
  applyIntegrity(integrity: number): void {
    this.lastIntegrity = integrity;
    this.setStage(stageForIntegrity(integrity));
  }

  setStage(stage: GlitchStage): void {
    if (stage === this.stage) return;
    const previous = this.stage;
    this.stage = stage;

    if (stage === 0) {
      this.restore();
      if (previous !== 0) this.bus.emit('BROWSER_CORRUPTION_STOP', { reason: 'pulih' });
      return;
    }

    // tahap lebih rendah -> bangun ulang dari awal agar intensitas konsisten
    this.teardownEffects();
    if (stage >= 1) this.startTitleCorruption(stage);
    if (stage >= 2) this.startScrollbarAndTremor(stage);
    if (stage >= 3) this.startClipPath(stage);
    this.bus.emit('BROWSER_CORRUPTION_START', { stage, integrity: this.lastIntegrity });
  }

  /** mengembalikan DOM persis seperti semula */
  restore(): void {
    this.teardownEffects();
    this.stage = 0;
  }

  dispose(): void {
    const wasActive = this.stage !== 0;
    this.restore();
    if (wasActive) this.bus.emit('BROWSER_CORRUPTION_STOP', { reason: 'bab-selesai' });
  }

  /* ---------------------------- tahap 1 ------------------------------ */
  private startTitleCorruption(stage: GlitchStage): void {
    this.baseTitle = this.doc.title;
    const intensity = 0.25 + (stage - 1) * 0.25;
    // periode >= 1.2 s: jauh di bawah 3 perubahan per detik
    const period = Math.max(1200, 2600 - stage * 350);
    const tick = () => {
      this.titleSeed = (this.titleSeed + 7919) % 1_000_003;
      const glitched = this.titleSeed % 3 === 0;
      this.doc.title = glitched
        ? corruptTitle(this.baseTitle, intensity, this.titleSeed)
        : this.baseTitle;
    };
    tick();
    this.titleTimer = setInterval(tick, period);
  }

  /* ---------------------------- tahap 2 ------------------------------ */
  private startScrollbarAndTremor(stage: GlitchStage): void {
    const reduced = this.reducedMotion;
    const body = this.doc.body;

    // scrollbar palsu: elemen tipis di tepi kanan yang "bergulir" sendiri
    const bar = this.doc.createElement('div');
    bar.className = 'pf-glitch-scrollbar';
    bar.setAttribute('aria-hidden', 'true');
    bar.style.cssText =
      'position:fixed;top:0;right:0;width:10px;height:100vh;z-index:2147483000;pointer-events:none;background:rgba(255,255,255,0.06);';
    const thumb = this.doc.createElement('div');
    thumb.style.cssText =
      'position:absolute;left:1px;right:1px;top:0;height:18%;border-radius:4px;background:rgba(220,38,38,0.55);';
    bar.appendChild(thumb);
    body.appendChild(bar);
    this.scrollbar = bar;

    if (reduced) {
      this.animate(bar, [{ opacity: 0 }, { opacity: 1 }], { duration: 2400, fill: 'forwards' });
    } else {
      this.animate(thumb, [{ top: '0%' }, { top: '82%' }, { top: '0%' }], {
        duration: Math.max(6000, 14000 - stage * 1500),
        iterations: Infinity,
        easing: 'ease-in-out',
      });
    }

    // micro-tremor pada elemen bertanda, hanya yang ada di viewport
    const targets = Array.from(this.doc.querySelectorAll('[data-glitch-target]'));
    if (targets.length && !reduced) {
      const amplitude = 0.3 + (stage - 2) * 0.25; // derajat
      const start = (el: Element) => {
        if (this.tremorTargets.has(el) || !(el instanceof HTMLElement)) return;
        this.tremorTargets.add(el);
        this.animate(
          el,
          [
            { transform: 'rotate(0deg) translate(0,0)' },
            { transform: `rotate(${amplitude}deg) translate(0.4px,-0.3px)` },
            { transform: `rotate(${-amplitude}deg) translate(-0.3px,0.4px)` },
            { transform: 'rotate(0deg) translate(0,0)' },
          ],
          { duration: 900, iterations: Infinity, easing: 'ease-in-out' },
        );
      };
      if (typeof IntersectionObserver === 'function') {
        this.observer = new IntersectionObserver((entries) => {
          for (const e of entries) if (e.isIntersecting) start(e.target);
        });
        targets.forEach((t) => this.observer?.observe(t));
      } else {
        targets.forEach(start);
      }
    }
  }

  /* ---------------------------- tahap 3 ------------------------------ */
  private startClipPath(stage: GlitchStage): void {
    const wrapper = this.wrapper;
    if (!wrapper) return;
    const reduced = this.reducedMotion;
    if (reduced) {
      // versi aksesibel: fade lambat sangat halus, tanpa gerakan
      this.animate(wrapper, [{ opacity: 1 }, { opacity: 0.82 }, { opacity: 1 }], {
        duration: 4000,
        iterations: Infinity,
        easing: 'ease-in-out',
      });
      return;
    }
    const shift = stage >= 4 ? 3.2 : 1.6; // persen lebar
    const steps = stage >= 4 ? 8 : 6;
    // "VHS tracking error": sebuah strip horizontal (posisi berubah tiap keyframe)
    // terkoyak ke kanan lewat clip-path polygon 8 titik, sementara seluruh wrapper
    // bergeser kecil dengan easing steps() agar terasa seperti sinkronisasi hilang.
    // Durasi >= 1.6 s dengan <= 8 langkah: perubahan < 3 kali per detik (WCAG 2.1).
    const clipFrames: Keyframe[] = [];
    const translateFrames: Keyframe[] = [];
    for (let f = 0; f < steps; f++) {
      const phase = (f / steps) * Math.PI * 2;
      const top = 12 + ((f * 37) % 70); // posisi strip berpindah-pindah
      const height = 6 + (f % 3) * 4;
      const bottom = Math.min(98, top + height);
      const dx = (0.6 + 0.4 * Math.sin(phase)) * shift;
      clipFrames.push({
        clipPath: `polygon(0% 0%, 100% 0%, 100% ${top}%, ${dx}% ${top}%, ${dx}% ${bottom}%, 100% ${bottom}%, 100% 100%, 0% 100%)`,
        offset: f / (steps - 1),
      });
      translateFrames.push({
        transform: `translateX(${Math.sin(phase) * shift * 0.35}%)`,
        offset: f / (steps - 1),
      });
    }
    const duration = stage >= 4 ? 1600 : 2400;
    this.animate(wrapper, clipFrames, {
      duration,
      iterations: Infinity,
      easing: `steps(${steps}, jump-none)`,
    });
    this.animate(wrapper, translateFrames, {
      duration,
      iterations: Infinity,
      easing: `steps(${steps}, jump-none)`,
      composite: 'add',
    });
    this.prevHtmlOverflow = this.doc.documentElement.style.overflowX;
    this.doc.documentElement.style.overflowX = 'hidden';
  }

  /* --------------------------- utilitas ------------------------------ */
  private animate(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): void {
    if (typeof (el as HTMLElement).animate !== 'function') return;
    try {
      const anim = (el as HTMLElement).animate(keyframes, options);
      // cancel() menolak promise `finished`; tangani agar tidak jadi unhandled rejection
      anim.finished.catch(() => undefined);
      this.animations.push(anim);
    } catch {
      /* lingkungan tanpa Web Animations API */
    }
  }

  private teardownEffects(): void {
    if (this.titleTimer !== null) {
      clearInterval(this.titleTimer);
      this.titleTimer = null;
      this.doc.title = this.baseTitle;
    }
    for (const a of this.animations) {
      try {
        a.cancel();
      } catch {
        /* abaikan */
      }
    }
    this.animations.length = 0;
    this.observer?.disconnect();
    this.observer = null;
    this.tremorTargets.clear();
    if (this.scrollbar) {
      this.scrollbar.remove();
      this.scrollbar = null;
    }
    if (this.wrapper) this.wrapper.style.transform = '';
    this.doc.documentElement.style.overflowX = this.prevHtmlOverflow;
  }
}
