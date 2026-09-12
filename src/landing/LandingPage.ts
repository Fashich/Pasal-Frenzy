/**
 * LandingPage — halaman utama in-world: hero 3D di belakang (HeroScene),
 * konten di depan dengan Lenis smooth scroll + reveal GSAP ScrollTrigger.
 * Semua kutipan dari naskah resmi (content.ts). Responsif: mobile menu,
 * grid adaptif, panel kaca tilt hanya di pointer halus, reduced motion dihormati.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import './landing.css';
import { HERO, KASUS, KUTIPAN, LANGKAH, STATISTIK } from './content.ts';
import { HeroScene } from './HeroScene.ts';
import { APP_VERSION, IS_APP_BUILD } from '../buildInfo.ts';
import { PRODUCT_DESCRIPTION, SOURCE_STATEMENT } from '../shell/copy.ts';

gsap.registerPlugin(ScrollTrigger);

export interface LandingOptions {
  reducedMotion: boolean;
  lite: boolean;
  /** "Mulai Bermain": ke beranda jika sudah masuk, jika belum ke layar Masuk */
  onStart: () => void;
  onMasuk: () => void;
  onDaftar: () => void;
}

export interface LandingSession {
  name: string;
  color: string;
}

const RELEASES_URL = 'https://github.com/Fashich/Pasal-Frenzy/releases/latest';
const REPO_URL = 'https://github.com/Fashich/Pasal-Frenzy';

export class LandingPage {
  readonly element: HTMLElement;
  readonly hero: HeroScene;
  private readonly options: LandingOptions;
  private lenis: Lenis | null = null;
  private session: LandingSession | null = null;
  private triggers: ScrollTrigger[] = [];
  private rafTicker: ((time: number) => void) | null = null;
  private readonly pointerHandler = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    this.hero.setPointer(nx, ny);
  };

  constructor(root: HTMLElement, options: LandingOptions) {
    this.options = options;
    this.element = document.createElement('div');
    this.element.className = 'pf-landing';
    if (options.reducedMotion) this.element.classList.add('pf-no-motion');
    this.element.innerHTML = this.template();
    root.appendChild(this.element);

    const canvasHost = this.element.querySelector('.pf-landing__hero-canvas') as HTMLElement;
    this.hero = new HeroScene(canvasHost, {
      reducedMotion: options.reducedMotion,
      lite: options.lite,
    });
    this.bind();
  }

  private template(): string {
    const kutipanPanel = [KUTIPAN.pasal1ayat3, KUTIPAN.pasal28A, KUTIPAN.pasal33ayat3];
    const panels = kutipanPanel
      .map(
        (k, i) => `
        <article class="pf-glass pf-panel" data-tilt data-reveal style="--i:${i}">
          <span class="pf-panel__glow" aria-hidden="true"></span>
          <p class="pf-quote">${escapeHtml(k.teks)}<span class="pf-quote__ref">${escapeHtml(k.label)}</span></p>
          <p class="pf-eyebrow">${['Negara hukum', 'Hak untuk hidup', 'Kekayaan alam'][i]}</p>
        </article>`,
      )
      .join('');

    const cases = KASUS.map(
      (k) => `
      <article class="pf-glass pf-case" data-reveal>
        <div class="pf-case__body">
          <span class="pf-case__nomor" aria-hidden="true">${k.nomor}</span>
          <p class="pf-eyebrow">Kasus ${k.nomor} · ${escapeHtml(k.tema)}</p>
          <h3 class="pf-h2">${escapeHtml(k.judul)}</h3>
          <p class="pf-body">${escapeHtml(k.deskripsi)}</p>
          <p class="pf-case__mekanik">${escapeHtml(k.mekanik)}</p>
        </div>
        <div class="pf-case__visual pf-case__visual--${k.aksen}" aria-hidden="true">
          <p class="pf-quote">${escapeHtml(k.kutipan.teks)}<span class="pf-quote__ref">${escapeHtml(k.kutipan.label)}</span></p>
        </div>
      </article>`,
    ).join('');

    const steps = LANGKAH.map(
      (l) => `
      <div class="pf-step" data-reveal>
        <span class="pf-step__nomor">${l.nomor} / 3</span>
        <h3 class="pf-h3">${escapeHtml(l.judul)}</h3>
        <p class="pf-body">${escapeHtml(l.teks)}</p>
      </div>`,
    ).join('');

    const unduh = IS_APP_BUILD
      ? `<div class="pf-glass pf-download" data-reveal>
           <h3 class="pf-h3">Kamu memakai versi aplikasi</h3>
           <p class="pf-body">Seluruh aset sudah tersimpan di perangkat. Pasal Frenzy berjalan tanpa internet.</p>
         </div>`
      : `<article class="pf-glass pf-download" data-reveal>
           <div>
             <p class="pf-eyebrow">Windows</p>
             <h3 class="pf-h3">Installer .exe</h3>
             <p class="pf-download__meta">Electron 44, 64-bit. Tanpa penandatanganan kode: SmartScreen akan menampilkan peringatan penerbit tidak dikenal.</p>
           </div>
           <a class="pf-btn pf-btn--secondary" href="${RELEASES_URL}" target="_blank" rel="noopener">Unduh dari GitHub Releases</a>
         </article>
         <article class="pf-glass pf-download" data-reveal>
           <div>
             <p class="pf-eyebrow">Android</p>
             <h3 class="pf-h3">Paket .apk</h3>
             <p class="pf-download__meta">Capacitor 8, Android 9 ke atas. Izinkan pemasangan dari sumber tidak dikenal.</p>
           </div>
           <a class="pf-btn pf-btn--secondary" href="${RELEASES_URL}" target="_blank" rel="noopener">Unduh dari GitHub Releases</a>
         </article>
         <article class="pf-glass pf-download" data-reveal>
           <div>
             <p class="pf-eyebrow">Web</p>
             <h3 class="pf-h3">Mainkan di browser</h3>
             <p class="pf-download__meta">Setelah dibuka sekali, permainan tersimpan di browser dan bisa dimainkan tanpa internet.</p>
           </div>
           <button type="button" class="pf-btn pf-btn--primary" data-action="mulai">Mulai Bermain</button>
         </article>`;

    return `
      <a class="pf-skip-link" href="#pf-main">Lewati ke konten</a>
      <div class="pf-landing__hero-canvas" aria-hidden="true"></div>
      <div class="pf-landing__scrim" aria-hidden="true"></div>
      <div class="pf-landing__content">
        <header class="pf-nav">
          <a class="pf-logotype pf-nav__brand" href="#/" aria-label="Pasal Frenzy">
            <span class="pf-logotype__pasal">PASAL</span><span class="pf-logotype__frenzy">FRENZY</span>
          </a>
          <button type="button" class="pf-btn pf-btn--ghost pf-nav__toggle" aria-expanded="false" aria-controls="pf-nav-links">Menu</button>
          <ul class="pf-nav__links" id="pf-nav-links">
            <li><a href="#konsep">Konsep</a></li>
            <li><a href="#kasus">Kasus</a></li>
            <li><a href="#cara">Cara bermain</a></li>
            <li><a href="#riset">Riset</a></li>
            <li><a href="#unduh">Unduh</a></li>
            <li class="pf-nav__links-auth"><button type="button" data-action="masuk">Masuk</button></li>
            <li class="pf-nav__links-auth"><button type="button" data-action="daftar">Daftar</button></li>
          </ul>
          <div class="pf-nav__auth" data-nav-auth>${this.authTemplate()}</div>
        </header>

        <main id="pf-main">
          <section class="pf-hero pf-container" id="hero">
            <p class="pf-eyebrow" data-reveal>${escapeHtml(HERO.eyebrow)}</p>
            <h1 class="pf-logotype" data-reveal>
              <span class="pf-logotype__pasal">PASAL</span><span class="pf-logotype__frenzy">FRENZY</span>
            </h1>
            <p class="pf-hero__tagline" data-reveal>${escapeHtml(HERO.tagline)}</p>
            <p class="pf-lead pf-hero__lead" data-reveal>${escapeHtml(HERO.lead)}</p>
            <div class="pf-hero__cta" data-reveal data-hero-cta>${this.heroCtaTemplate()}</div>
            <ul class="pf-hero__stats" data-reveal>
              <li><strong>${STATISTIK.alinea}</strong><span>alinea Pembukaan</span></li>
              <li><strong>${STATISTIK.pasal}</strong><span>pasal dalam ${STATISTIK.bab} bab</span></li>
              <li><strong>${STATISTIK.ayat}</strong><span>ayat</span></li>
              <li><strong>${STATISTIK.kasus}</strong><span>kasus kritis</span></li>
            </ul>
            <div class="pf-hero__scroll" aria-hidden="true">Gulir</div>
          </section>

          <section class="pf-section pf-section--band" id="konsep">
            <div class="pf-container">
              <div class="pf-section__head">
                <p class="pf-eyebrow" data-reveal>Singularitas Konstitusional</p>
                <h2 class="pf-h1" data-reveal>Hukum menjadi ruang. Pasal menjadi fisika.</h2>
                <p class="pf-lead" data-reveal>Tidak ada menu yang mengambang di atas dunia. Kesehatan konstitusi tercatat pada tebal dinding di sekelilingmu, inventaris pasal melayang sebagai konstelasi, dan ketika integritas jatuh, koridor yang lurus mulai melengkung.</p>
              </div>
              <div class="pf-panels">${panels}</div>
            </div>
          </section>

          <section class="pf-section" id="kasus">
            <div class="pf-container">
              <div class="pf-section__head">
                <p class="pf-eyebrow" data-reveal>Tiga kasus kritis</p>
                <h2 class="pf-h1" data-reveal>Setiap kasus adalah ketegangan nyata dalam konstitusi.</h2>
              </div>
              <div class="pf-cases">${cases}</div>
            </div>
          </section>

          <section class="pf-section pf-section--band" id="cara">
            <div class="pf-container">
              <div class="pf-section__head">
                <p class="pf-eyebrow" data-reveal>Cara bermain</p>
                <h2 class="pf-h1" data-reveal>Tidak ada tutorial. Ruang yang mengajarkanmu.</h2>
              </div>
              <div class="pf-steps">${steps}</div>
            </div>
          </section>

          <section class="pf-section" id="riset">
            <div class="pf-container">
              <div class="pf-section__head">
                <p class="pf-eyebrow" data-reveal>Riset &amp; data</p>
                <h2 class="pf-h1" data-reveal>Teks asli. Data tetap di perangkatmu.</h2>
                <p class="pf-lead" data-reveal>${escapeHtml(SOURCE_STATEMENT)} Progres dan catatan sesi tetap di perangkatmu dan hanya menjadi berkas ekspor jika kamu ikut riset.</p>
              </div>
              <div class="pf-glass pf-provenance" data-reveal>
                <p class="pf-eyebrow">Kartu provenance</p>
                <dl>
                  <dt>Sumber</dt><dd>${escapeHtml(STATISTIK.sumber)}</dd>
                  <dt>Berkas</dt><dd>data-source/UUD-NRI-1945-Dalam-Satu-Naskah.pdf</dd>
                  <dt>SHA-256</dt><dd>${STATISTIK.sha256}</dd>
                  <dt>Laporan validasi</dt><dd><a href="${REPO_URL}/blob/main/docs/data-validation/uud-1945-report.md" target="_blank" rel="noopener">docs/data-validation/uud-1945-report.md</a></dd>
                </dl>
              </div>
            </div>
          </section>

          <section class="pf-section pf-section--band" id="unduh">
            <div class="pf-container">
              <div class="pf-section__head">
                <p class="pf-eyebrow" data-reveal>Unduh</p>
                <h2 class="pf-h1" data-reveal>Bisa dimainkan tanpa internet.</h2>
              </div>
              <div class="pf-downloads">${unduh}</div>
            </div>
          </section>
        </main>

        <footer class="pf-footer">
          <div class="pf-container pf-footer__row">
            <p>${escapeHtml(PRODUCT_DESCRIPTION)}</p>
            <p>Kode sumber <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a> · Lisensi MIT · v${APP_VERSION}</p>
          </div>
        </footer>
      </div>
    `;
  }

  /** tombol Masuk/Daftar di nav; setelah masuk berganti menjadi chip akun + Beranda */
  private authTemplate(): string {
    if (this.session) {
      return `
        <span class="pf-nav__user" title="${escapeHtml(this.session.name)}">
          <span class="pf-avatar pf-avatar--sm" style="background:${this.session.color}" aria-hidden="true">${escapeHtml(this.session.name.charAt(0).toUpperCase())}</span>
          <span class="pf-nav__user-name">${escapeHtml(this.session.name)}</span>
        </span>
        <button type="button" class="pf-btn pf-btn--primary pf-nav__cta" data-action="mulai">Beranda</button>`;
    }
    return `
      <button type="button" class="pf-btn pf-btn--ghost pf-nav__cta" data-action="masuk">Masuk</button>
      <button type="button" class="pf-btn pf-btn--primary pf-nav__cta" data-action="daftar">Daftar</button>`;
  }

  private heroCtaTemplate(): string {
    if (this.session) {
      return `
        <button type="button" class="pf-btn pf-btn--primary" data-action="mulai">Lanjutkan ke Beranda</button>
        <a class="pf-btn pf-btn--secondary" href="#unduh">Unduh untuk Windows / Android</a>`;
    }
    return `
      <button type="button" class="pf-btn pf-btn--primary" data-action="mulai">Mulai Bermain</button>
      <button type="button" class="pf-btn pf-btn--secondary" data-action="masuk">Masuk</button>
      <a class="pf-btn pf-btn--ghost" href="#unduh">Unduh untuk Windows / Android</a>`;
  }

  /** dipanggil AppShell saat status masuk berubah */
  setSession(session: LandingSession | null): void {
    this.session = session;
    const nav = this.element.querySelector('[data-nav-auth]');
    if (nav) nav.innerHTML = this.authTemplate();
    const hero = this.element.querySelector('[data-hero-cta]');
    if (hero) hero.innerHTML = this.heroCtaTemplate();
    this.element.querySelectorAll<HTMLElement>('.pf-nav__links-auth').forEach((li) => {
      li.hidden = session !== null;
    });
    this.bindActions();
    this.bindDownloadLinks();
  }

  private bindActions(): void {
    const handlers: Record<string, () => void> = {
      mulai: () => this.options.onStart(),
      masuk: () => this.options.onMasuk(),
      daftar: () => this.options.onDaftar(),
    };
    this.element.querySelectorAll<HTMLElement>('[data-action]').forEach((b) => {
      const action = b.dataset['action'] ?? '';
      const handler = handlers[action];
      if (!handler || b.dataset['bound'] === '1') return;
      b.dataset['bound'] = '1';
      b.addEventListener('click', handler);
    });
  }

  private bindDownloadLinks(): void {
    this.element.querySelectorAll<HTMLAnchorElement>('a[href="#unduh"]').forEach((a) => {
      if (a.dataset['bound'] === '1') return;
      a.dataset['bound'] = '1';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = this.element.querySelector('#unduh');
        if (target instanceof HTMLElement) this.scrollTo(target);
      });
    });
  }

  private bind(): void {
    this.bindActions();
    const toggle = this.element.querySelector('.pf-nav__toggle') as HTMLButtonElement;
    const links = this.element.querySelector('.pf-nav__links') as HTMLElement;
    const mq = window.matchMedia('(max-width: 860px)');
    const syncMenu = () => {
      if (mq.matches) {
        links.hidden = toggle.getAttribute('aria-expanded') !== 'true';
      } else {
        links.hidden = false;
      }
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      syncMenu();
    });
    mq.addEventListener('change', syncMenu);
    syncMenu();
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href') ?? '';
        if (href.startsWith('#') && !href.startsWith('#/')) {
          e.preventDefault();
          const target = this.element.querySelector(href);
          if (target instanceof HTMLElement) this.scrollTo(target);
          toggle.setAttribute('aria-expanded', 'false');
          syncMenu();
        }
      }),
    );
    this.bindDownloadLinks();
    links.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach((b) =>
      b.addEventListener('click', () => {
        toggle.setAttribute('aria-expanded', 'false');
        syncMenu();
      }),
    );

    if (!this.options.lite && !this.options.reducedMotion) this.bindTilt();
  }

  private bindTilt(): void {
    this.element.querySelectorAll<HTMLElement>('[data-tilt]').forEach((panel) => {
      panel.addEventListener('pointermove', (e) => {
        const r = panel.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        panel.style.setProperty('--mx', `${px * 100}%`);
        panel.style.setProperty('--my', `${py * 100}%`);
        panel.style.transform = `rotateX(${(0.5 - py) * 10}deg) rotateY(${(px - 0.5) * 12}deg) translateZ(6px)`;
      });
      panel.addEventListener('pointerleave', () => {
        panel.style.transform = '';
      });
    });
  }

  private scrollTo(target: HTMLElement): void {
    if (this.lenis) this.lenis.scrollTo(target, { offset: -72 });
    else target.scrollIntoView({ behavior: this.options.reducedMotion ? 'auto' : 'smooth' });
  }

  /** memulai hero, smooth scroll, dan reveal; panggil setelah preloader hilang */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.hero.start();
    window.addEventListener('pointermove', this.pointerHandler, { passive: true });
    if (this.lenis) {
      this.lenis.start();
      return;
    }

    if (!this.options.reducedMotion) {
      this.lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      this.lenis.on('scroll', ScrollTrigger.update);
      this.rafTicker = (time: number) => this.lenis?.raf(time * 1000);
      gsap.ticker.add(this.rafTicker);
      gsap.ticker.lagSmoothing(0);

      this.element.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            gsap.to(el, {
              opacity: 1,
              y: 0,
              clipPath: 'inset(0% 0% 0% 0%)',
              filter: 'blur(0px)',
              duration: 0.9,
              ease: 'power3.out',
              delay: Number(el.style.getPropertyValue('--i') || 0) * 0.08,
              onComplete: () => el.classList.add('is-in'),
            });
          },
        });
        this.triggers.push(trigger);
      });
    }

    const total = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const scrim = this.element.querySelector('.pf-landing__scrim') as HTMLElement;
    const onScroll = () => {
      this.hero.setScroll(window.scrollY / total());
      // latar memudar + memblur begitu konten melewati hero (0.25-1.05 tinggi viewport)
      const vh = Math.max(1, window.innerHeight);
      const t = Math.min(1, Math.max(0, (window.scrollY - vh * 0.25) / (vh * 0.8)));
      scrim.style.backgroundColor = `rgba(8, 8, 16, ${(0.78 * t).toFixed(3)})`;
      if (!this.options.lite) {
        const blur = `blur(${(7 * t).toFixed(2)}px)`;
        scrim.style.backdropFilter = t > 0.01 ? blur : '';
        (
          scrim.style as CSSStyleDeclaration & { webkitBackdropFilter?: string }
        ).webkitBackdropFilter = t > 0.01 ? blur : '';
      }
      this.hero.setDim(t);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.scrollListener = onScroll;
    onScroll();
    ScrollTrigger.refresh();
  }

  private scrollListener: (() => void) | null = null;
  private started = false;

  /** menghentikan hero & smooth scroll tanpa membuang DOM (saat pindah layar) */
  pause(): void {
    if (!this.started) return;
    this.started = false;
    this.hero.stop();
    this.lenis?.stop();
    window.removeEventListener('pointermove', this.pointerHandler);
  }

  destroy(): void {
    window.removeEventListener('pointermove', this.pointerHandler);
    if (this.scrollListener) window.removeEventListener('scroll', this.scrollListener);
    this.triggers.forEach((t) => t.kill());
    this.triggers = [];
    if (this.rafTicker) gsap.ticker.remove(this.rafTicker);
    this.lenis?.destroy();
    this.lenis = null;
    this.hero.dispose();
    this.element.remove();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
