/**
 * Preloader — pengalaman pemuatan yang merupakan bagian dari narasi
 * (Dev Planning 09 #1 + permintaan: intro sebelum landing, bar progres dengan
 * deskripsi di bawahnya).
 *
 * Fase A (intro)  : kata-kata alinea pertama Pembukaan datang dari kehampaan dan
 *                   menyusun kalimatnya, lalu beresonansi (cahaya) dan memudar.
 * Fase B (brand)  : logotype PASAL FRENZY per karakter (SplitText, stagger 0.03 s),
 *                   bar progres tipis merah->putih dengan progres NYATA dari
 *                   loadingStages; di bawahnya label tahap + deskripsi produk.
 * Selesai         : logotype zoom out + scene reveal dengan circular clip-path wipe.
 *
 * Reduced motion: tanpa gerakan, hanya opacity fade lambat. Tombol "Lewati intro"
 * tersedia (selalu untuk keyboard; ditampilkan setelah kunjungan pertama).
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { LoadingProgress } from './loadingStages.ts';

gsap.registerPlugin(SplitText);

export interface PreloaderOptions {
  /** kata-kata alinea intro (mis. alinea I Pembukaan) */
  introWords: string[];
  /** referensi teks intro untuk aria */
  introLabel?: string;
  description: string;
  reducedMotion?: boolean;
  /** tampilkan tombol lewati sejak awal (kunjungan berikutnya) */
  showSkip?: boolean;
  onSkip?: () => void;
}

export class Preloader {
  readonly element: HTMLElement;
  private readonly intro: HTMLElement;
  private readonly alinea: HTMLElement;
  private readonly brand: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly pct: HTMLElement;
  private readonly skipButton: HTMLButtonElement;
  private readonly logotype: HTMLElement;
  private readonly options: PreloaderOptions;
  private timeline: gsap.core.Timeline | null = null;
  private introDone: Promise<void>;
  private resolveIntro: () => void = () => undefined;
  private skipped = false;
  private finished = false;
  private lastFraction = 0;

  constructor(options: PreloaderOptions) {
    this.options = options;
    this.introDone = new Promise<void>((resolve) => {
      this.resolveIntro = resolve;
    });

    const el = document.createElement('div');
    el.className = 'pf-preloader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Memuat Pasal Frenzy');
    el.innerHTML = `
      <div class="pf-preloader__noise" aria-hidden="true"></div>
      <div class="pf-preloader__intro" aria-hidden="true">
        <p class="pf-preloader__alinea"></p>
      </div>
      <div class="pf-preloader__brand">
        <h1 class="pf-logotype" aria-label="Pasal Frenzy">
          <span class="pf-logotype__pasal">PASAL</span><span class="pf-logotype__frenzy">FRENZY</span>
        </h1>
        <div class="pf-preloader__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="pf-preloader__fill"></div>
        </div>
        <div class="pf-preloader__meta">
          <span class="pf-preloader__stage">Menyiapkan…</span>
          <span class="pf-preloader__pct">0%</span>
        </div>
        <p class="pf-preloader__desc"></p>
      </div>
      <button type="button" class="pf-btn pf-btn--ghost pf-preloader__skip">Lewati intro</button>
    `;
    this.element = el;
    this.intro = must(el, '.pf-preloader__intro');
    this.alinea = must(el, '.pf-preloader__alinea');
    this.brand = must(el, '.pf-preloader__brand');
    this.fill = must(el, '.pf-preloader__fill');
    this.stage = must(el, '.pf-preloader__stage');
    this.pct = must(el, '.pf-preloader__pct');
    this.logotype = must(el, '.pf-logotype');
    this.skipButton = must(el, '.pf-preloader__skip') as HTMLButtonElement;
    must(el, '.pf-preloader__desc').textContent = options.description;

    for (const word of options.introWords) {
      const span = document.createElement('span');
      span.textContent = word;
      this.alinea.appendChild(span);
      this.alinea.appendChild(document.createTextNode(' '));
    }
    if (options.introLabel) this.alinea.setAttribute('aria-label', options.introLabel);

    this.skipButton.addEventListener('click', () => this.skip());
    if (options.showSkip) this.skipButton.style.opacity = '1';
  }

  mount(parent: HTMLElement = document.body): void {
    parent.appendChild(this.element);
  }

  get introFinished(): Promise<void> {
    return this.introDone;
  }

  /** memainkan intro (fase A) lalu brand (fase B); resolve saat fase B siap */
  playIntro(): Promise<void> {
    const reduced = this.options.reducedMotion ?? false;
    const words = Array.from(this.alinea.querySelectorAll('span'));
    const tl = gsap.timeline({
      onComplete: () => this.resolveIntro(),
    });
    this.timeline = tl;

    if (reduced) {
      tl.set(words, { opacity: 0 })
        .to(words, { opacity: 1, duration: 1.2, stagger: 0.02, ease: 'none' })
        .to(this.intro, { opacity: 0, duration: 0.8 }, '+=1.0')
        .to(this.brand, { opacity: 1, duration: 0.9 }, '<0.4');
      tl.to(this.skipButton, { opacity: 1, duration: 0.4 }, 0.5);
      return this.introDone;
    }

    // Fase A: kata datang dari posisi acak, blur, lalu menyusun kalimat
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    tl.set(words, {
      opacity: 0,
      filter: 'blur(10px)',
      x: () => (Math.random() - 0.5) * vw * 0.7,
      y: () => (Math.random() - 0.5) * vh * 0.6,
      rotation: () => (Math.random() - 0.5) * 30,
    });
    tl.to(words, {
      opacity: 1,
      filter: 'blur(0px)',
      x: 0,
      y: 0,
      rotation: 0,
      duration: 1.6,
      ease: 'power3.out',
      stagger: { each: 0.045, from: 'random' },
    });
    // resonansi: kalimat utuh bercahaya sejenak (metafora penemuan koneksi semantik)
    tl.to(
      this.alinea,
      {
        textShadow: '0 0 28px rgba(59,130,246,0.9), 0 0 60px rgba(59,130,246,0.45)',
        color: '#ffffff',
        duration: 0.5,
        ease: 'power2.out',
      },
      '+=0.15',
    );
    tl.to(this.alinea, {
      textShadow: '0 0 0px rgba(59,130,246,0)',
      opacity: 0,
      filter: 'blur(6px)',
      duration: 0.7,
      ease: 'power2.in',
    });

    // Fase B: logotype per karakter dari bawah (y 40 -> 0), stagger 0.03 s
    const split = new SplitText(this.logotype, {
      type: 'chars',
      charsClass: 'pf-preloader__logotype-char',
    });
    tl.set(this.brand, { opacity: 1 }, '-=0.2');
    tl.set(split.chars, { yPercent: 60, opacity: 0 });
    tl.set(
      [
        this.fill.parentElement,
        this.stage.parentElement,
        this.brand.querySelector('.pf-preloader__desc'),
      ],
      {
        opacity: 0,
      },
    );
    tl.to(split.chars, {
      yPercent: 0,
      opacity: 1,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.03,
    });
    tl.to(
      [
        this.fill.parentElement,
        this.stage.parentElement,
        this.brand.querySelector('.pf-preloader__desc'),
      ],
      { opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.08 },
      '-=0.25',
    );
    tl.to(this.skipButton, { opacity: 1, duration: 0.4 }, 0.6);
    return this.introDone;
  }

  /** lompat ke akhir intro (tetap menunggu pemuatan nyata) */
  skip(): void {
    if (this.skipped || this.finished) return;
    this.skipped = true;
    this.options.onSkip?.();
    if (this.timeline) {
      this.timeline.progress(1);
    } else {
      this.intro.style.opacity = '0';
      this.brand.style.opacity = '1';
      this.resolveIntro();
    }
    this.skipButton.style.opacity = '0';
    this.skipButton.disabled = true;
  }

  /** progres NYATA dari runLoadingStages */
  setProgress(progress: LoadingProgress): void {
    this.lastFraction = Math.max(this.lastFraction, progress.fraction);
    const pctValue = Math.round(this.lastFraction * 100);
    gsap.to(this.fill, {
      scaleX: this.lastFraction,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    this.pct.textContent = `${pctValue}%`;
    this.fill.parentElement?.setAttribute('aria-valuenow', String(pctValue));
    this.stage.textContent = progress.error
      ? `${progress.label} (gagal, dilanjutkan)`
      : progress.done
        ? 'Siap.'
        : progress.label;
  }

  /** logotype zoom out + reveal circular clip-path wipe; menghapus elemen di akhir */
  async finish(): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    await this.introDone;
    const reduced = this.options.reducedMotion ?? false;
    const clip = { r: 150 };
    await new Promise<void>((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      if (reduced) {
        tl.to(this.element, { opacity: 0, duration: 0.9, ease: 'none' });
      } else {
        tl.to(this.logotype, { scale: 1.12, duration: 0.9, ease: 'power2.inOut' }, 0);
        tl.to(
          [this.brand, this.skipButton],
          { opacity: 0, duration: 0.5, ease: 'power2.in' },
          0.15,
        );
        tl.to(
          clip,
          {
            r: 0,
            duration: 0.9,
            ease: 'power3.inOut',
            onUpdate: () => {
              this.element.style.clipPath = `circle(${clip.r}% at 50% 50%)`;
            },
          },
          0.2,
        );
      }
    });
    this.element.remove();
  }

  destroy(): void {
    this.timeline?.kill();
    this.element.remove();
  }
}

function must(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector(selector);
  if (!(el instanceof HTMLElement)) throw new Error(`Elemen ${selector} tidak ditemukan`);
  return el;
}
