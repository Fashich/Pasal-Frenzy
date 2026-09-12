/**
 * CustomCursor — kursor premium (Dev Planning 09 #2).
 * Dua elemen: titik 4 px (mengikuti instan) + cincin 40 px (mengikuti dengan
 * lag lerp 0.1 per frame). Hover pada elemen interaktif: cincin membesar dan
 * terisi merah transparan; klik: cincin mengecil. Tidak aktif pada perangkat
 * sentuh (pointer: coarse), disembunyikan saat pointer lock/XR, dan tanpa lag
 * saat reduced motion.
 */

export const CURSOR_LERP = 0.1;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function isCoarsePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, select, textarea, label, [data-cursor]';

export class CustomCursor {
  private readonly dot: HTMLElement;
  private readonly ring: HTMLElement;
  private targetX = -100;
  private targetY = -100;
  private ringX = -100;
  private ringY = -100;
  private raf = 0;
  private active = false;
  private readonly reducedMotion: boolean;

  constructor(options: { reducedMotion?: boolean } = {}) {
    this.reducedMotion = options.reducedMotion ?? false;
    this.dot = document.createElement('div');
    this.dot.className = 'pf-cursor pf-cursor--dot is-hidden';
    this.ring = document.createElement('div');
    this.ring.className = 'pf-cursor pf-cursor--ring is-hidden';
    this.dot.setAttribute('aria-hidden', 'true');
    this.ring.setAttribute('aria-hidden', 'true');
  }

  get isActive(): boolean {
    return this.active;
  }

  start(): void {
    if (this.active || isCoarsePointer()) return;
    this.active = true;
    document.body.append(this.dot, this.ring);
    document.documentElement.classList.add('pf-has-cursor');
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerdown', this.onDown, { passive: true });
    window.addEventListener('pointerup', this.onUp, { passive: true });
    window.addEventListener('pointerover', this.onOver, { passive: true });
    document.addEventListener('pointerleave', this.onLeave);
    document.addEventListener('pointerlockchange', this.onLockChange);
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointerover', this.onOver);
    document.removeEventListener('pointerleave', this.onLeave);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    document.documentElement.classList.remove('pf-has-cursor');
    this.dot.remove();
    this.ring.remove();
  }

  setHidden(hidden: boolean): void {
    this.dot.classList.toggle('is-hidden', hidden);
    this.ring.classList.toggle('is-hidden', hidden);
  }

  private readonly onMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return;
    this.targetX = e.clientX;
    this.targetY = e.clientY;
    this.setHidden(false);
    this.dot.style.transform = `translate3d(${this.targetX}px, ${this.targetY}px, 0)`;
    if (this.reducedMotion) {
      this.ringX = this.targetX;
      this.ringY = this.targetY;
      this.ring.style.transform = `translate3d(${this.ringX}px, ${this.ringY}px, 0)`;
    }
  };

  private readonly onDown = (): void => {
    this.ring.classList.add('is-down');
  };

  private readonly onUp = (): void => {
    this.ring.classList.remove('is-down');
  };

  private readonly onOver = (e: PointerEvent): void => {
    const target = e.target;
    const hover = target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
    this.ring.classList.toggle('is-hover', hover);
  };

  private readonly onLeave = (): void => this.setHidden(true);

  private readonly onLockChange = (): void => {
    this.setHidden(document.pointerLockElement !== null);
  };

  private readonly tick = (): void => {
    if (!this.reducedMotion) {
      this.ringX = lerp(this.ringX, this.targetX, CURSOR_LERP);
      this.ringY = lerp(this.ringY, this.targetY, CURSOR_LERP);
      this.ring.style.transform = `translate3d(${this.ringX}px, ${this.ringY}px, 0)`;
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
