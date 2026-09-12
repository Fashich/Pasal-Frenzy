/**
 * HomeScreen — beranda (hub) setelah masuk: pilih bab, progres, pengaturan,
 * riset (consent + ekspor), profil.
 */
import './screens.css';
import {
  gameDB,
  getActiveProfileId,
  researchSessionsToCsv,
  setActiveProfileId,
  type ChapterProgressRecord,
} from '@core/persistence/GameDB.ts';
import { constitutionalStore } from '@core/store/ConstitutionalStore.ts';
import { settingsStore } from '@core/store/SettingsStore.ts';
import { APP_VERSION } from '../buildInfo.ts';
import type { Screen } from '../shell/AppShell.ts';
import { CHAPTER_IDS, type ChapterId } from '../shell/router.ts';
import { formatPlayTime } from './ProfileScreen.ts';
import { downloadTextFile } from './download.ts';

export interface HomeScreenOptions {
  onPlay: (chapterId: ChapterId) => void;
  onSwitchProfile: () => void;
  onLanding: () => void;
}

export const CHAPTER_META: Record<ChapterId, { judul: string; sub: string; pasal: string }> = {
  prolog: {
    judul: 'Prolog: Kehampaan Sebelum Konstitusi',
    sub: 'Rangkai empat alinea Pembukaan yang tercecer di ruang hampa non-Euclidean.',
    pasal: 'Pembukaan UUD 1945',
  },
  'case-1-ham': {
    judul: 'Kasus 1: Labirinto Hakiki',
    sub: 'Labirin kaca Pasal 28A-28J dan entitas bayangan yang memakai klausul pembatasan.',
    pasal: 'Pasal 28A-28J',
  },
  'case-2-pasal33': {
    judul: 'Kasus 2: Oligarki dalam Kabut Digital',
    sub: 'Kabut partikel, jaringan monopoli tanpa skala, jangkar gravitasi Pasal 33.',
    pasal: 'Pasal 33',
  },
  'case-3-perppu': {
    judul: 'Kasus 3: Singularitas Perppu',
    sub: 'Browser ikut runtuh. Satu alat tersisa: Constitutional Rewind dari Pasal 22.',
    pasal: 'Pasal 22',
  },
};

/** bab terbuka jika pertama, atau bab sebelumnya sudah dimenangkan */
export function unlockedChapters(progress: ChapterProgressRecord[]): Set<ChapterId> {
  const won = new Set(progress.filter((p) => p.outcome === 'menang').map((p) => p.chapterId));
  const open = new Set<ChapterId>(['prolog']);
  for (let i = 1; i < CHAPTER_IDS.length; i++) {
    const prev = CHAPTER_IDS[i - 1];
    const cur = CHAPTER_IDS[i];
    if (prev && cur && won.has(prev)) open.add(cur);
  }
  return open;
}

export class HomeScreen implements Screen {
  private element: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly options: HomeScreenOptions) {}

  async mount(root: HTMLElement): Promise<void> {
    const db = await gameDB();
    const activeId = getActiveProfileId();
    const profile = activeId ? await db.getProfile(activeId) : undefined;
    if (!profile) {
      this.options.onSwitchProfile();
      return;
    }
    await db.touchProfile(profile.id);
    const progress = await db.listChapterProgress(profile.id);
    const mastery = await db.loadMastery(profile.id);
    const sessions = await db.listResearchSessions(profile.id);
    const open = unlockedChapters(progress);
    const settings = settingsStore.getState();
    const game = constitutionalStore.getState();

    const masteryValues = Object.values(mastery);
    const avgMastery = masteryValues.length
      ? masteryValues.reduce((a, m) => a + m.masteryLevel, 0) / masteryValues.length
      : 0;
    const won = progress.filter((p) => p.outcome === 'menang').length;

    const el = document.createElement('section');
    el.className = 'pf-screen';
    el.setAttribute('aria-labelledby', 'pf-beranda-title');
    el.innerHTML = `
      <header class="pf-screen__head">
        <div class="pf-screen__title">
          <p class="pf-eyebrow">Beranda</p>
          <h1 class="pf-h1" id="pf-beranda-title">Selamat datang, ${escapeHtml(profile.name)}.</h1>
          <p class="pf-lead">${won} dari ${CHAPTER_IDS.length} bab dimenangkan · ${formatPlayTime(profile.totalPlayTimeMs)} · ${masteryValues.length} pasal dikuasai</p>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button type="button" class="pf-btn pf-btn--ghost" data-action="landing">Halaman utama</button>
          <button type="button" class="pf-btn pf-btn--secondary" data-action="ganti">Ganti profil</button>
        </div>
      </header>
      <div class="pf-screen__body">
        <div class="pf-grid-2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))">
          ${CHAPTER_IDS.map((id) =>
            this.chapterCard(
              id,
              open.has(id),
              progress.find((p) => p.chapterId === id),
            ),
          ).join('')}
        </div>
        <div class="pf-grid-2">
          <section class="pf-glass pf-card" aria-labelledby="pf-progres-title">
            <p class="pf-eyebrow" id="pf-progres-title">Progres konstitusional</p>
            <div>
              <div class="pf-kv"><dt>Penguasaan pasal rata-rata</dt><dd>${Math.round(avgMastery * 100)}%</dd></div>
              <div class="pf-meter" aria-hidden="true"><div class="pf-meter__fill" style="transform:scaleX(${avgMastery.toFixed(3)})"></div></div>
            </div>
            <dl class="pf-kv">
              <dt>Pasal terkumpul</dt><dd>${masteryValues.length}</dd>
              <dt>Argumen tercatat</dt><dd>${(await db.listHistory(profile.id)).length}</dd>
              <dt>Integritas sesi terakhir</dt><dd>${game.integrity.toFixed(2)}</dd>
              <dt>Versi</dt><dd>v${APP_VERSION}</dd>
            </dl>
            <p class="pf-field__hint">Peta konstelasi pasal tampil di dalam permainan.</p>
          </section>

          <section class="pf-glass pf-card" aria-labelledby="pf-setel-title">
            <p class="pf-eyebrow" id="pf-setel-title">Pengaturan</p>
            <label class="pf-field">
              <span>Volume utama <span class="pf-field__hint" data-out="master">${Math.round(game.masterVolume * 100)}%</span></span>
              <input class="pf-range" type="range" min="0" max="1" step="0.01" value="${game.masterVolume}" data-setting="master" />
            </label>
            <label class="pf-field">
              <span>Volume efek <span class="pf-field__hint" data-out="sfx">${Math.round(game.sfxVolume * 100)}%</span></span>
              <input class="pf-range" type="range" min="0" max="1" step="0.01" value="${game.sfxVolume}" data-setting="sfx" />
            </label>
            <label class="pf-switch"><span>Bisukan audio</span><input type="checkbox" data-setting="mute" ${game.muted ? 'checked' : ''} /></label>
            <label class="pf-field">
              <span>Kualitas grafis</span>
              <select class="pf-input" data-setting="kualitas">
                <option value="auto" ${settings.qualityAuto ? 'selected' : ''}>Otomatis (deteksi perangkat)</option>
                <option value="rendah" ${!settings.qualityAuto && settings.qualityPreset === 'rendah' ? 'selected' : ''}>Rendah</option>
                <option value="sedang" ${!settings.qualityAuto && settings.qualityPreset === 'sedang' ? 'selected' : ''}>Sedang</option>
                <option value="tinggi" ${!settings.qualityAuto && settings.qualityPreset === 'tinggi' ? 'selected' : ''}>Tinggi</option>
              </select>
            </label>
            <label class="pf-field">
              <span>Kurangi gerakan (aksesibilitas)</span>
              <select class="pf-input" data-setting="gerak">
                <option value="sistem" ${settings.reducedMotion === 'sistem' ? 'selected' : ''}>Ikuti sistem</option>
                <option value="aktif" ${settings.reducedMotion === 'aktif' ? 'selected' : ''}>Aktif</option>
                <option value="nonaktif" ${settings.reducedMotion === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
              </select>
            </label>
          </section>

          <section class="pf-glass pf-card" aria-labelledby="pf-riset-title">
            <p class="pf-eyebrow" id="pf-riset-title">Riset &amp; data</p>
            <p class="pf-body">Semua data permainan tetap di perangkatmu. Jika kamu ikut riset, catatan sesi (tanpa nama) bisa diekspor lalu kamu kirim sendiri ke peneliti.</p>
            <label class="pf-switch"><span>Saya setuju data sesi dicatat untuk riset</span><input type="checkbox" data-setting="consent" ${settings.researchConsent ? 'checked' : ''} /></label>
            <dl class="pf-kv">
              <dt>Kode partisipan</dt><dd>${escapeHtml(profile.participantCode ?? '-')}</dd>
              <dt>Sesi tercatat</dt><dd data-out="sesi">${sessions.length}</dd>
            </dl>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
              <button type="button" class="pf-btn pf-btn--secondary" data-action="ekspor-json">Ekspor JSON</button>
              <button type="button" class="pf-btn pf-btn--secondary" data-action="ekspor-csv">Ekspor CSV</button>
              <button type="button" class="pf-btn pf-btn--ghost" data-action="hapus-sesi">Hapus data riset</button>
            </div>
            <p class="pf-field__hint" data-out="status" aria-live="polite"></p>
          </section>

          <section class="pf-glass pf-card" aria-labelledby="pf-profil-title">
            <p class="pf-eyebrow" id="pf-profil-title">Profil</p>
            <div style="display:flex;align-items:center;gap:.9rem">
              <span class="pf-avatar" style="background:${profile.color}" aria-hidden="true">${escapeHtml(profile.name.charAt(0).toUpperCase())}</span>
              <div>
                <div class="pf-profile-card__name">${escapeHtml(profile.name)}</div>
                <div class="pf-profile-card__sub">Dibuat ${new Date(profile.createdAt).toLocaleDateString('id-ID')}</div>
              </div>
            </div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
              <button type="button" class="pf-btn pf-btn--ghost" data-action="keluar">Keluar</button>
              <button type="button" class="pf-btn pf-btn--ghost" data-action="hapus-profil">Hapus profil ini</button>
            </div>
          </section>
        </div>
      </div>
    `;
    root.appendChild(el);
    this.element = el;

    // aksi
    el.querySelector('[data-action="landing"]')?.addEventListener('click', () =>
      this.options.onLanding(),
    );
    el.querySelector('[data-action="ganti"]')?.addEventListener('click', () =>
      this.options.onSwitchProfile(),
    );
    el.querySelector('[data-action="keluar"]')?.addEventListener('click', () => {
      setActiveProfileId(null);
      this.options.onSwitchProfile();
    });
    el.querySelector('[data-action="hapus-profil"]')?.addEventListener('click', async () => {
      if (
        !window.confirm(
          `Hapus profil "${profile.name}" beserta seluruh progres dan data risetnya? Tindakan ini tidak bisa dibatalkan.`,
        )
      )
        return;
      await db.deleteProfile(profile.id);
      setActiveProfileId(null);
      this.options.onSwitchProfile();
    });
    el.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-disabled') === 'true') return;
        const id = btn.dataset['chapter'] as ChapterId;
        this.options.onPlay(id);
      }),
    );

    // pengaturan
    const bind = <T extends HTMLElement>(sel: string) => el.querySelector(sel) as T;
    bind<HTMLInputElement>('[data-setting="master"]').addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value);
      constitutionalStore.getState().setMasterVolume(v);
      bind<HTMLElement>('[data-out="master"]').textContent = `${Math.round(v * 100)}%`;
    });
    bind<HTMLInputElement>('[data-setting="sfx"]').addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value);
      constitutionalStore.getState().setSfxVolume(v);
      bind<HTMLElement>('[data-out="sfx"]').textContent = `${Math.round(v * 100)}%`;
    });
    bind<HTMLInputElement>('[data-setting="mute"]').addEventListener('change', (e) =>
      constitutionalStore.getState().setMuted((e.target as HTMLInputElement).checked),
    );
    bind<HTMLSelectElement>('[data-setting="kualitas"]').addEventListener('change', (e) => {
      const v = (e.target as HTMLSelectElement).value;
      if (v === 'auto') settingsStore.getState().setQuality(settings.qualityPreset, true);
      else settingsStore.getState().setQuality(v as 'rendah' | 'sedang' | 'tinggi', false);
    });
    bind<HTMLSelectElement>('[data-setting="gerak"]').addEventListener('change', (e) =>
      settingsStore
        .getState()
        .setReducedMotion((e.target as HTMLSelectElement).value as 'sistem' | 'aktif' | 'nonaktif'),
    );
    bind<HTMLInputElement>('[data-setting="consent"]').addEventListener('change', (e) =>
      settingsStore
        .getState()
        .setResearchConsent((e.target as HTMLInputElement).checked, profile.participantCode),
    );

    const status = bind<HTMLElement>('[data-out="status"]');
    el.querySelector('[data-action="ekspor-json"]')?.addEventListener('click', async () => {
      const data = await db.exportProfile(profile.id, APP_VERSION);
      if (!data) return;
      await downloadTextFile(
        `pasal-frenzy-${profile.participantCode ?? profile.name}-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(data, null, 2),
        'application/json',
      );
      status.textContent = 'Berkas JSON disiapkan untuk diunduh.';
    });
    el.querySelector('[data-action="ekspor-csv"]')?.addEventListener('click', async () => {
      const list = await db.listResearchSessions(profile.id);
      await downloadTextFile(
        `pasal-frenzy-sesi-${profile.participantCode ?? profile.name}-${new Date().toISOString().slice(0, 10)}.csv`,
        researchSessionsToCsv(list),
        'text/csv',
      );
      status.textContent = `CSV berisi ${list.length} sesi disiapkan untuk diunduh.`;
    });
    el.querySelector('[data-action="hapus-sesi"]')?.addEventListener('click', async () => {
      if (!window.confirm('Hapus semua catatan sesi riset profil ini?')) return;
      await db.deleteResearchSessions(profile.id);
      bind<HTMLElement>('[data-out="sesi"]').textContent = '0';
      status.textContent = 'Catatan sesi riset dihapus.';
    });
  }

  private chapterCard(
    id: ChapterId,
    open: boolean,
    progress: ChapterProgressRecord | undefined,
  ): string {
    const meta = CHAPTER_META[id];
    const status = progress?.outcome === 'menang' ? 'selesai' : open ? 'terbuka' : 'terkunci';
    const label = {
      selesai: 'Selesai',
      terbuka: progress ? 'Lanjutkan' : 'Mulai',
      terkunci: 'Terkunci',
    }[status];
    return `
      <button type="button" class="pf-glass pf-chapter" data-chapter="${id}" aria-disabled="${open ? 'false' : 'true'}" ${open ? '' : 'tabindex="-1"'}>
        <div class="pf-chapter__row">
          <span class="pf-eyebrow" style="color:var(--pf-fg-muted)">${escapeHtml(meta.pasal)}</span>
          <span class="pf-chapter__status pf-chapter__status--${status}">${label}</span>
        </div>
        <span class="pf-h3">${escapeHtml(meta.judul)}</span>
        <span class="pf-body" style="color:var(--pf-fg-muted);font-size:var(--pf-t-small)">${escapeHtml(meta.sub)}</span>
        ${progress ? `<span class="pf-field__hint">${progress.attempts} percobaan${progress.bestDurationMs ? ` · terbaik ${Math.round(progress.bestDurationMs / 1000)} detik` : ''}</span>` : ''}
      </button>`;
  }

  unmount(): void {
    this.unsubscribe?.();
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
