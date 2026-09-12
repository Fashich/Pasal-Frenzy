/**
 * GameScreen — host bab: membuat engine, input, audio, memuat modul bab dari
 * registry (chunk terpisah), menangani jeda (Esc), penyimpanan progres, dan
 * kembali ke beranda.
 */
import './screens.css';
import { CHAPTER_META } from './HomeScreen.ts';
import { getChapterFactory } from '@chapters/registry.ts';
import type { Chapter, ChapterContext } from '@chapters/ChapterInterface.ts';
import { AudioEngine } from '@core/audio/AudioEngine.ts';
import { constitutionalBus } from '@core/engine/ConstitutionalEventBus.ts';
import { QUALITY_PRESETS, ThreeEngine } from '@core/engine/ThreeEngine.ts';
import { InputManager } from '@core/input/InputManager.ts';
import { getActiveSession } from '@core/persistence/persistence.ts';
import { constitutionalStore } from '@core/store/ConstitutionalStore.ts';
import { settingsStore } from '@core/store/SettingsStore.ts';
import type { Screen } from '../shell/AppShell.ts';
import { isLiteDevice, resolveReducedMotion } from '../shell/AppShell.ts';
import type { ChapterId } from '../shell/router.ts';

export interface GameScreenOptions {
  chapterId: ChapterId;
  onExit: () => void;
}

export class GameScreen implements Screen {
  private element: HTMLElement | null = null;
  private engine: ThreeEngine | null = null;
  private input: InputManager | null = null;
  private chapter: Chapter | null = null;
  private offUpdate: (() => void) | null = null;
  private paused = false;
  private startedAt = 0;

  constructor(private readonly options: GameScreenOptions) {}

  async mount(root: HTMLElement): Promise<void> {
    const meta = CHAPTER_META[this.options.chapterId];
    const el = document.createElement('div');
    el.className = 'pf-game-host';
    el.innerHTML = `
      <div class="pf-game-hud">
        <button type="button" class="pf-btn pf-btn--ghost" data-action="keluar" aria-label="Kembali ke beranda">Beranda</button>
      </div>
      <div class="pf-game-hud-layer" data-hud style="position:absolute;inset:0;pointer-events:none;z-index:4"></div>
      <div class="pf-game-status" data-status style="position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:1rem;padding:2rem;z-index:3">
        <p class="pf-eyebrow">${escapeHtml(meta.pasal)}</p>
        <h1 class="pf-h1">${escapeHtml(meta.judul)}</h1>
        <p class="pf-lead" data-status-text>Memuat bab…</p>
      </div>
    `;
    root.appendChild(el);
    this.element = el;
    el.querySelector('[data-action="keluar"]')?.addEventListener('click', () => this.exit());

    const factory = getChapterFactory(this.options.chapterId);
    const statusText = el.querySelector('[data-status-text]') as HTMLElement;
    if (!factory) {
      statusText.textContent =
        'Bab ini sedang dibangun pada tahap berikutnya. Engine, shader, fisika kata, dan audionya sudah siap; konten narasinya menyusul.';
      return;
    }

    const preset = settingsStore.getState().qualityAuto
      ? isLiteDevice()
        ? QUALITY_PRESETS.rendah
        : QUALITY_PRESETS.sedang
      : QUALITY_PRESETS[settingsStore.getState().qualityPreset];
    this.engine = new ThreeEngine(el, { quality: preset });
    el.insertBefore(this.engine.renderer.domElement, el.firstChild);
    this.input = new InputManager(this.engine.renderer.domElement);
    const audio = AudioEngine.get();
    audio.armAutoUnlock();

    const ctx: ChapterContext = {
      chapterId: this.options.chapterId,
      engine: this.engine,
      input: this.input,
      store: constitutionalStore,
      bus: constitutionalBus,
      audio,
      hud: el.querySelector('[data-hud]') as HTMLElement,
      reducedMotion: resolveReducedMotion(),
      lite: isLiteDevice(),
      loadPhaser: async () => {
        const { PhaserEngine } = await import('@core/engine/PhaserEngine.ts');
        await PhaserEngine.ensureFonts();
        const phaser = new PhaserEngine(el);
        await phaser.ready;
        return phaser;
      },
      reportProgress: (fraction, label) => {
        statusText.textContent = `${label ?? 'Memuat'} ${Math.round(fraction * 100)}%`;
      },
    };

    this.chapter = await factory();
    await this.chapter.initialize(ctx);

    // muat progres tersimpan jika ada (web: browser ini; aplikasi: basis data perangkat)
    const session = await getActiveSession();
    if (session) {
      const saved = await session.adapter.getChapterProgress(
        session.profile.id,
        this.options.chapterId,
      );
      if (saved?.lastState) constitutionalStore.getState().hydrate(saved.lastState);
    }
    constitutionalStore.getState().startChapter(this.options.chapterId);

    (el.querySelector('[data-status]') as HTMLElement).remove();
    this.startedAt = performance.now();
    this.offUpdate = this.engine.onUpdate((dt, elapsed) => {
      if (this.paused) return;
      const frame = this.input?.consumeFrame();
      if (frame?.pausePressed) this.togglePause();
      this.chapter?.update(dt, elapsed);
    });
    this.engine.start();
    this.chapter.start();
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) this.chapter?.pause();
    else this.chapter?.resume();
  }

  private async persist(): Promise<void> {
    const session = await getActiveSession();
    if (!session) return;
    const db = session.adapter;
    const profileId = session.profile.id;
    const state = constitutionalStore.getState();
    const prev = await db.getChapterProgress(profileId, this.options.chapterId);
    await db.saveChapterProgress({
      profileId,
      chapterId: this.options.chapterId,
      lastState: state.serialize(),
      attempts: state.chapterAttempts[this.options.chapterId] ?? prev?.attempts ?? 1,
      completedAt: prev?.completedAt ?? null,
      outcome: prev?.outcome ?? null,
      bestDurationMs: prev?.bestDurationMs ?? null,
    });
    await db.saveMastery(profileId, state.inventory);
    await db.addPlayTime(profileId, Math.max(0, performance.now() - this.startedAt));
  }

  private async exit(): Promise<void> {
    await this.persist();
    this.options.onExit();
  }

  unmount(): void {
    this.offUpdate?.();
    this.chapter?.dispose();
    this.chapter = null;
    this.input?.dispose();
    this.input = null;
    this.engine?.dispose();
    this.engine = null;
    this.element?.remove();
    this.element = null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
