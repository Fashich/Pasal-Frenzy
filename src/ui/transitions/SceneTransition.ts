/**
 * SceneTransition — transisi antar bab bergaya Webflow (Dev Planning 09 #2).
 *
 *  constitutional-dive : kamera "masuk ke dalam teks pasal" — kutipan membesar
 *                        dan memblur di overlay, hook cameraDolly untuk engine
 *  void-collapse       : lubang hitam menyusut (clip-path circle) lalu mengembang
 *  chromatic-shatter   : aberasi kromatik maksimum (hook setAberration) -> cut
 *
 * Durasi standar 800 ms. Setiap transisi memanggil hook audio agar punya
 * tanda tangan suara sendiri. Reduced motion: crossfade opacity saja.
 * onMidpoint dipanggil saat layar tertutup penuh: tempat menukar scene.
 */
import { gsap } from 'gsap';

export type TransitionKind = 'constitutional-dive' | 'void-collapse' | 'chromatic-shatter';

export interface TransitionHooks {
  /** dipanggil saat layar tertutup; boleh async (menukar scene) */
  onMidpoint?: () => void | Promise<void>;
  /** 0..1 intensitas aberasi kromatik (chromatic-shatter) */
  setAberration?: (v: number) => void;
  /** 0..1 progres dolly kamera (constitutional-dive) */
  cameraDolly?: (t: number) => void;
  /** tanda tangan audio per jenis */
  audio?: (kind: TransitionKind, phase: 'mulai' | 'tengah' | 'selesai') => void;
}

export interface TransitionOptions {
  /** total durasi (ms), default 800 */
  duration?: number;
  /** teks kutipan untuk constitutional-dive */
  text?: string;
  reducedMotion?: boolean;
}

export const DEFAULT_TRANSITION_MS = 800;

export class SceneTransition {
  readonly element: HTMLElement;
  private readonly text: HTMLElement;
  private running = false;

  constructor(parent: HTMLElement = document.body) {
    this.element = document.createElement('div');
    this.element.className = 'pf-transition';
    this.element.setAttribute('aria-hidden', 'true');
    this.text = document.createElement('p');
    this.text.className = 'pf-transition__text';
    this.element.appendChild(this.text);
    parent.appendChild(this.element);
  }

  get isRunning(): boolean {
    return this.running;
  }

  async play(
    kind: TransitionKind,
    hooks: TransitionHooks = {},
    options: TransitionOptions = {},
  ): Promise<void> {
    if (this.running) return;
    this.running = true;
    const total = (options.duration ?? DEFAULT_TRANSITION_MS) / 1000;
    const half = total / 2;
    this.element.classList.add('is-active');
    hooks.audio?.(kind, 'mulai');

    const midpoint = async () => {
      hooks.audio?.(kind, 'tengah');
      await hooks.onMidpoint?.();
    };

    if (options.reducedMotion) {
      await gsap.to(this.element, { opacity: 1, duration: half, ease: 'none' });
      await midpoint();
      await gsap.to(this.element, { opacity: 0, duration: half, ease: 'none' });
    } else if (kind === 'void-collapse') {
      // overlay hitam dengan lubang transparan berbentuk lingkaran di tengah:
      // lubang menyusut ke titik singular (dunia runtuh), lalu mengembang lagi
      const hole = { r: 150 };
      const applyHole = () => this.setHole(hole.r);
      this.element.style.opacity = '1';
      applyHole();
      await gsap.to(hole, { r: 0, duration: half, ease: 'power3.in', onUpdate: applyHole });
      await midpoint();
      await gsap.to(hole, { r: 150, duration: half, ease: 'power3.out', onUpdate: applyHole });
      this.setHole(null);
      this.element.style.opacity = '0';
    } else if (kind === 'constitutional-dive') {
      this.text.textContent = options.text ?? '';
      gsap.set(this.text, { opacity: 0, scale: 0.8, filter: 'blur(0px)' });
      const dolly = { t: 0 };
      await Promise.all([
        gsap.to(this.element, { opacity: 1, duration: half * 0.7, ease: 'power2.in' }),
        gsap.to(this.text, { opacity: 1, scale: 1.6, duration: half, ease: 'power2.in' }),
        gsap.to(dolly, {
          t: 1,
          duration: half,
          ease: 'power2.in',
          onUpdate: () => hooks.cameraDolly?.(dolly.t),
        }),
      ]);
      await midpoint();
      await Promise.all([
        gsap.to(this.text, {
          opacity: 0,
          scale: 2.4,
          filter: 'blur(14px)',
          duration: half,
          ease: 'power2.out',
        }),
        gsap.to(this.element, { opacity: 0, duration: half, ease: 'power2.out' }),
      ]);
    } else {
      // chromatic-shatter: aberasi naik ke maksimum, cut hitam 60 ms, aberasi turun
      const ab = { v: 0 };
      await gsap.to(ab, {
        v: 1,
        duration: half,
        ease: 'power3.in',
        onUpdate: () => hooks.setAberration?.(ab.v),
      });
      this.element.style.opacity = '1';
      await midpoint();
      await new Promise<void>((r) => setTimeout(r, 60));
      this.element.style.opacity = '0';
      await gsap.to(ab, {
        v: 0,
        duration: half,
        ease: 'power2.out',
        onUpdate: () => hooks.setAberration?.(ab.v),
      });
    }

    this.element.classList.remove('is-active');
    this.element.style.opacity = '0';
    hooks.audio?.(kind, 'selesai');
    this.running = false;
  }

  /** lubang transparan radial (persen); null = tanpa mask */
  private setHole(radiusPercent: number | null): void {
    const style = this.element.style as CSSStyleDeclaration & { webkitMaskImage?: string };
    const value =
      radiusPercent === null
        ? ''
        : `radial-gradient(circle at 50% 50%, transparent ${radiusPercent}%, #000 ${radiusPercent + 0.6}%)`;
    style.maskImage = value;
    style.webkitMaskImage = value;
  }

  destroy(): void {
    this.element.remove();
  }
}
