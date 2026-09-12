/**
 * AppShell — orkestrasi alur produk:
 *   intro -> loading (tahap nyata) -> landing -> masuk/profil -> beranda -> main/<bab>
 *
 * Preloader dipasang SEBELUM import berat apa pun (hanya pembukaan.json kecil
 * yang dimuat statis), sehingga layar pertama tampil seketika.
 */
import { CustomCursor } from '@ui/cursor/CustomCursor.ts';
import { Preloader } from '@ui/preloader/Preloader.ts';
import { runLoadingStages, type LoadingStage } from '@ui/preloader/loadingStages.ts';
import { SceneTransition } from '@ui/transitions/SceneTransition.ts';
import {
  loadSettingsFromStorage,
  persistSettingsToStorage,
  settingsStore,
} from '@core/store/SettingsStore.ts';
import { pickIntroPassage } from '@data/introPassages.ts';
import { LOADING_DESCRIPTIONS, PRODUCT_DESCRIPTION } from './copy.ts';
import { Router, type Route } from './router.ts';
import type { LandingPage } from '@landing/LandingPage.ts';
import type * as LandingModule from '@landing/LandingPage.ts';

export interface Screen {
  mount(root: HTMLElement): Promise<void> | void;
  unmount(): void;
}

export function resolveReducedMotion(): boolean {
  const pref = settingsStore.getState().reducedMotion;
  if (pref === 'aktif') return true;
  if (pref === 'nonaktif') return false;
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function isLiteDevice(): boolean {
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 720;
  const cores = navigator.hardwareConcurrency ?? 4;
  return coarse || small || cores <= 2;
}

export class AppShell {
  readonly root: HTMLElement;
  readonly router = new Router();
  readonly transition: SceneTransition;
  readonly cursor: CustomCursor;
  readonly reducedMotion: boolean;
  readonly lite: boolean;
  private landing: LandingPage | null = null;
  private landingHost: HTMLElement;
  private screenHost: HTMLElement;
  private currentScreen: Screen | null = null;
  private currentRoute: Route | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    loadSettingsFromStorage();
    persistSettingsToStorage();
    this.reducedMotion = resolveReducedMotion();
    this.lite = isLiteDevice();
    this.cursor = new CustomCursor({ reducedMotion: this.reducedMotion });
    this.transition = new SceneTransition(document.body);
    this.landingHost = document.createElement('div');
    this.landingHost.className = 'pf-landing-host';
    this.screenHost = document.createElement('div');
    this.screenHost.className = 'pf-screen-host';
    root.append(this.landingHost, this.screenHost);
  }

  async start(): Promise<void> {
    const settings = settingsStore.getState();
    const passage = pickIntroPassage();
    const preloader = new Preloader({
      introWords: passage.kata.map((k) => k.teks),
      introLabel: passage.label,
      description: PRODUCT_DESCRIPTION,
      descriptions: LOADING_DESCRIPTIONS,
      reducedMotion: this.reducedMotion,
      showSkip: settings.introSeen,
      onSkip: () => settingsStore.getState().setIntroSeen(true),
    });
    preloader.mount(document.body);
    const intro = preloader.playIntro();

    let landingModule: typeof LandingModule | null = null;
    const stages: LoadingStage[] = [
      {
        id: 'font',
        label: 'Memuat tipografi',
        weight: 1,
        run: async (report) => {
          const fonts: [string, string][] = [
            ['900 32px "Playfair Display"', 'Playfair Display 900 (logotype)'],
            ['400 24px "Playfair Display"', 'Playfair Display 400 (kutipan)'],
            ['500 16px "Space Grotesk"', 'Space Grotesk 500 (antarmuka)'],
            ['700 16px "JetBrains Mono"', 'JetBrains Mono 700 (teks hukum)'],
          ];
          let done = 0;
          for (const [spec, name] of fonts) {
            report(done / fonts.length, `Font: ${name}`);
            await document.fonts.load(spec);
            done += 1;
            report(done / fonts.length, `Font: ${name}`);
          }
        },
      },
      {
        id: 'data',
        label: 'Memuat data konstitusi',
        weight: 1,
        run: async (report) => {
          report(0, 'Naskah UUD NRI 1945: 21 bab, Pasal 1-37, 4 alinea Pembukaan');
          const { uud1945 } = await import('@data/uud1945.ts');
          const pasal = uud1945.batangTubuh.bab.reduce((n, b) => n + b.pasal.length, 0);
          report(0.5, `Naskah termuat: ${pasal} pasal, ${uud1945.batangTubuh.bab.length} bab`);
          const { pasalWeights } = await import('@data/pasalWeights.ts');
          report(
            1,
            `Bobot kata: ${pasalWeights.korpus.kosakata} kosakata dari ${pasalWeights.korpus.token} token`,
          );
        },
      },
      {
        id: 'engine',
        label: 'Menyusun engine 3D',
        weight: 3,
        run: async (report) => {
          report(0.05, 'Engine: renderer WebGL2 + EffectComposer');
          await import('@core/engine/ThreeEngine.ts');
          report(0.4, 'Shader: ruang hiperbolik (model cakram Poincaré)');
          await import('@core/shaders/ConstitutionalMaterial.ts');
          report(0.6, 'Shader: aberasi kromatik + distorsi spasial');
          await import('@core/shaders/passes/ChromaticAberrationPass.ts');
          report(0.75, 'Teks 3D: troika-three-text + Playfair Display lokal');
          landingModule = await import('@landing/LandingPage.ts');
          report(1, 'Engine siap');
        },
      },
      {
        id: 'landing',
        label: 'Menyebar kata-kata Pembukaan di ruang hampa',
        weight: 2,
        run: async (report) => {
          if (!landingModule) throw new Error('modul landing belum termuat');
          this.landing = new landingModule.LandingPage(this.landingHost, {
            reducedMotion: this.reducedMotion,
            lite: this.lite,
            onStart: () => this.onStartGame(),
          });
          const total = this.landing.hero.wordCount;
          report(0, `Kata Pembukaan: 0 dari ${total} dirender ke SDF`);
          await this.landing.hero.ready((f) =>
            report(f, `Kata Pembukaan: ${Math.round(f * total)} dari ${total} dirender ke SDF`),
          );
          report(1, 'Ruang hampa dan partikel cahaya siap');
        },
      },
      {
        id: 'audio',
        label: 'Menyiapkan audio',
        weight: 1,
        run: async (report) => {
          report(0.2, 'Audio: mesin sintesis Web Audio (tanpa berkas suara)');
          const { AudioEngine } = await import('@core/audio/AudioEngine.ts');
          report(0.7, 'Audio: reverb sintetis ruang sidang, koridor digital, ruang krisis');
          AudioEngine.get().armAutoUnlock();
          report(1, 'Audio siap (dibuka pada interaksi pertama)');
        },
      },
    ];

    await runLoadingStages(stages, (p) => preloader.setProgress(p), { minStageMs: 320 });
    await intro;
    settingsStore.getState().setIntroSeen(true);

    this.router.start();
    this.router.onChange((route) => void this.showRoute(route));
    // rute awal: landing selalu ditampilkan di balik preloader; rute lain dimuat setelahnya
    this.screenHost.hidden = true;
    this.landing?.start();
    this.currentRoute = { name: 'landing' };
    await preloader.finish();
    this.cursor.start();
    if (this.router.current.name !== 'landing') await this.showRoute(this.router.current);
  }

  private onStartGame(): void {
    this.router.navigate({ name: 'masuk' });
  }

  private async showRoute(route: Route): Promise<void> {
    if (this.currentRoute && this.currentRoute.name === route.name && route.name !== 'main') return;
    const previous = this.currentRoute;
    this.currentRoute = route;

    const swap = async () => {
      this.currentScreen?.unmount();
      this.currentScreen = null;
      this.screenHost.innerHTML = '';
      if (route.name === 'landing') {
        this.landingHost.hidden = false;
        this.screenHost.hidden = true;
        window.scrollTo({ top: 0 });
        this.landing?.start();
        return;
      }
      this.landing?.pause();
      this.landingHost.hidden = true;
      this.screenHost.hidden = false;
      window.scrollTo({ top: 0 });
      const screen = await this.createScreen(route);
      this.currentScreen = screen;
      await screen.mount(this.screenHost);
    };

    if (previous === null) {
      await swap();
      return;
    }
    const kind = route.name === 'main' ? 'constitutional-dive' : 'void-collapse';
    await this.transition.play(kind, { onMidpoint: swap }, { reducedMotion: this.reducedMotion });
  }

  private async createScreen(route: Route): Promise<Screen> {
    switch (route.name) {
      case 'masuk': {
        const { ProfileScreen } = await import('../screens/ProfileScreen.ts');
        return new ProfileScreen({
          onDone: () => this.router.navigate({ name: 'beranda' }, { replace: true }),
          onBack: () => this.router.navigate({ name: 'landing' }),
        });
      }
      case 'beranda': {
        const { HomeScreen } = await import('../screens/HomeScreen.ts');
        return new HomeScreen({
          onPlay: (chapterId) => this.router.navigate({ name: 'main', chapterId }),
          onSwitchProfile: () => this.router.navigate({ name: 'masuk' }),
          onLanding: () => this.router.navigate({ name: 'landing' }),
        });
      }
      case 'main': {
        const { GameScreen } = await import('../screens/GameScreen.ts');
        return new GameScreen({
          chapterId: route.chapterId,
          onExit: () => this.router.navigate({ name: 'beranda' }),
        });
      }
      default: {
        const { ProfileScreen } = await import('../screens/ProfileScreen.ts');
        return new ProfileScreen({
          onDone: () => this.router.navigate({ name: 'beranda' }, { replace: true }),
          onBack: () => this.router.navigate({ name: 'landing' }),
        });
      }
    }
  }
}

export async function startApp(root: HTMLElement): Promise<AppShell> {
  const shell = new AppShell(root);
  await shell.start();
  return shell;
}
