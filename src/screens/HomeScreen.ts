/**
 * HomeScreen — Beranda (hub) setelah masuk.
 * Susunan: bilah atas (akun) -> sambutan + gauge integritas -> ubin statistik ->
 * jalur empat bab -> panel progres / pengaturan / riset / akun -> catatan sumber.
 * Semua angka dihitung dari data tersimpan (tidak ada nilai contoh).
 */
import './screens.css';
import { researchSessionsToCsv, type ChapterProgressRecord } from '@core/persistence/GameDB.ts';
import { getActiveSession, persistenceMode, signOut } from '@core/persistence/persistence.ts';
import { constitutionalStore } from '@core/store/ConstitutionalStore.ts';
import { settingsStore } from '@core/store/SettingsStore.ts';
import { APP_VERSION } from '../buildInfo.ts';
import type { Screen } from '../shell/AppShell.ts';
import { SOURCE_STATEMENT } from '../shell/copy.ts';
import { CHAPTER_IDS, type ChapterId } from '../shell/router.ts';
import { downloadTextFile } from './download.ts';
import { resolveSplineScene } from '@data/splineScenes.ts';
import { SplineStage } from '@ui/spline/SplineStage.ts';
import {
  escapeHtml,
  formatDurationShort,
  formatLongDate,
  formatPlayTime,
  initials,
  ROMAN,
} from './format.ts';

export interface HomeScreenOptions {
  onPlay: (chapterId: ChapterId) => void;
  onSwitchProfile: () => void;
  onSignOut: () => void;
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

/** bab yang disarankan berikutnya: terbuka dan belum dimenangkan; jika semua menang, bab terakhir */
export function nextChapter(progress: ChapterProgressRecord[]): ChapterId {
  const open = unlockedChapters(progress);
  const won = new Set(progress.filter((p) => p.outcome === 'menang').map((p) => p.chapterId));
  return CHAPTER_IDS.find((id) => open.has(id) && !won.has(id)) ?? 'case-3-perppu';
}

export function welcomeLead(progress: ChapterProgressRecord[]): string {
  const won = progress.filter((p) => p.outcome === 'menang').length;
  if (won >= CHAPTER_IDS.length) return 'Seluruh bab dimenangkan. Konstitusi berdiri utuh.';
  const next = nextChapter(progress);
  const started = progress.some((p) => p.chapterId === next);
  if (won === 0 && !started) return 'Ruang hampa masih gelap. Mulai dari Pembukaan.';
  if (won === 0) return 'Prolog belum selesai. Lanjutkan dari titik terakhirmu.';
  return `${won} bab dimenangkan. Berikutnya: ${CHAPTER_META[next].judul}.`;
}

const GAUGE_R = 52;
const GAUGE_C = 2 * Math.PI * GAUGE_R;

export class HomeScreen implements Screen {
  private element: HTMLElement | null = null;
  /** scene Spline opsional di balik sambutan (slot 'beranda') */
  private stage: SplineStage | null = null;

  constructor(private readonly options: HomeScreenOptions) {}

  async mount(root: HTMLElement): Promise<void> {
    const session = await getActiveSession();
    if (!session) {
      this.options.onSwitchProfile();
      return;
    }
    const { adapter: db, profile } = session;
    await db.touchProfile(profile.id);
    const progress = await db.listChapterProgress(profile.id);
    const mastery = await db.loadMastery(profile.id);
    const sessions = await db.listResearchSessions(profile.id);
    const historyCount = (await db.listHistory(profile.id)).length;
    const open = unlockedChapters(progress);
    const settings = settingsStore.getState();
    const game = constitutionalStore.getState();

    const masteryValues = Object.values(mastery);
    const avgMastery = masteryValues.length
      ? masteryValues.reduce((a, m) => a + m.masteryLevel, 0) / masteryValues.length
      : 0;
    const won = progress.filter((p) => p.outcome === 'menang').length;
    const next = nextChapter(progress);
    const nextStarted = progress.some((p) => p.chapterId === next);
    const integrity = Math.max(0, Math.min(1, game.integrity));
    const integrityPct = Math.round(integrity * 100);
    const modeLabel = persistenceMode === 'web' ? 'Versi web' : 'Versi aplikasi';
    const modeNote =
      persistenceMode === 'web'
        ? 'Akun dan progres tersimpan di browser ini, tanpa server. Versi aplikasi menyimpannya di perangkat dan bisa dimainkan tanpa internet.'
        : 'Akun dan progres tersimpan di perangkat ini. Tidak ada data yang dikirim ke mana pun.';

    const el = document.createElement('section');
    el.className = 'pf-screen pf-beranda';
    el.setAttribute('aria-labelledby', 'pf-beranda-title');
    el.innerHTML = `
      <div class="pf-ambient" aria-hidden="true">
        <i class="pf-ambient__glow pf-ambient__glow--biru"></i>
        <i class="pf-ambient__glow pf-ambient__glow--merah"></i>
        <i class="pf-ambient__grain"></i>
      </div>

      <header class="pf-topbar pf-topbar--sticky">
        <a class="pf-logotype pf-topbar__brand" href="#/" aria-label="Pasal Frenzy">
          <span class="pf-logotype__pasal">PASAL</span><span class="pf-logotype__frenzy">FRENZY</span>
        </a>
        <div class="pf-topbar__actions">
          <span class="pf-badge pf-topbar__mode">${modeLabel}</span>
          <span class="pf-user" title="${escapeHtml(profile.name)}">
            <span class="pf-avatar pf-avatar--sm" style="background:${profile.color}" aria-hidden="true">${escapeHtml(initials(profile.name))}</span>
            <span class="pf-user__name">${escapeHtml(profile.name)}</span>
          </span>
          <button type="button" class="pf-btn pf-btn--ghost" data-action="ganti">Ganti akun</button>
          <button type="button" class="pf-btn pf-btn--ghost" data-action="keluar">Keluar</button>
        </div>
      </header>

      <div class="pf-beranda__hero">
        <div class="pf-beranda__stage" data-spline-host aria-hidden="true"></div>
        <div class="pf-beranda__intro" data-reveal style="--i:0">
          <p class="pf-eyebrow">Beranda · ${escapeHtml(formatLongDate(new Date()))}</p>
          <h1 class="pf-beranda__title" id="pf-beranda-title">Selamat datang, <em>${escapeHtml(profile.name)}.</em></h1>
          <p class="pf-lead pf-beranda__lead">${escapeHtml(welcomeLead(progress))}</p>
          <div class="pf-beranda__cta">
            <button type="button" class="pf-btn pf-btn--primary pf-btn--lg" data-chapter="${next}">${nextStarted ? 'Lanjutkan' : 'Mulai'}: ${escapeHtml(CHAPTER_META[next].judul.split(':')[0] ?? '')}</button>
            <button type="button" class="pf-btn pf-btn--secondary" data-action="landing">Halaman utama</button>
          </div>
        </div>
        <div class="pf-gauge" data-reveal style="--i:1" role="img" aria-label="Integritas konstitusional ${integrityPct} persen">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="pf-gauge-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#3b82f6" />
                <stop offset="0.55" stop-color="#d4a017" />
                <stop offset="1" stop-color="#dc2626" />
              </linearGradient>
            </defs>
            <circle class="pf-gauge__track" cx="60" cy="60" r="${GAUGE_R}" />
            <circle class="pf-gauge__fill" cx="60" cy="60" r="${GAUGE_R}" stroke="url(#pf-gauge-grad)" style="stroke-dasharray:${GAUGE_C.toFixed(2)};stroke-dashoffset:${(GAUGE_C * (1 - integrity)).toFixed(2)}" />
            <g class="pf-gauge__ticks">
              ${Array.from({ length: 24 }, (_, i) => {
                const a = (i / 24) * Math.PI * 2;
                const r1 = 44;
                const r2 = i % 6 === 0 ? 40 : 42;
                return `<line x1="${(60 + Math.cos(a) * r1).toFixed(2)}" y1="${(60 + Math.sin(a) * r1).toFixed(2)}" x2="${(60 + Math.cos(a) * r2).toFixed(2)}" y2="${(60 + Math.sin(a) * r2).toFixed(2)}" />`;
              }).join('')}
            </g>
          </svg>
          <div class="pf-gauge__value">
            <strong>${integrity.toFixed(2)}</strong>
            <span>Integritas konstitusional</span>
          </div>
        </div>
      </div>

      <ul class="pf-stats" data-reveal style="--i:2" aria-label="Ringkasan">
        <li><strong>${won}<span class="pf-stats__of">/${CHAPTER_IDS.length}</span></strong><span>Bab dimenangkan</span></li>
        <li><strong>${masteryValues.length}</strong><span>Pasal dikuasai</span></li>
        <li><strong>${escapeHtml(formatDurationShort(profile.totalPlayTimeMs))}</strong><span>Waktu bermain</span></li>
        <li><strong>${historyCount}</strong><span>Argumen tercatat</span></li>
      </ul>

      <section class="pf-journey" aria-labelledby="pf-journey-title">
        <div class="pf-journey__head" data-reveal style="--i:3">
          <p class="pf-eyebrow">Perjalanan</p>
          <h2 class="pf-h2" id="pf-journey-title">Empat bab. Satu konstitusi.</h2>
        </div>
        <ol class="pf-journey__track">
          ${CHAPTER_IDS.map((id, i) =>
            this.chapterCard(
              id,
              i,
              open.has(id),
              progress.find((p) => p.chapterId === id),
              id === next,
            ),
          ).join('')}
        </ol>
      </section>

      <div class="pf-panels">
        <section class="pf-panel" aria-labelledby="pf-progres-title" data-reveal style="--i:8">
          <p class="pf-eyebrow" id="pf-progres-title">Progres konstitusional</p>
          <div class="pf-panel__meter">
            <div class="pf-kv"><dt>Penguasaan pasal rata-rata</dt><dd>${Math.round(avgMastery * 100)}%</dd></div>
            <div class="pf-meter" aria-hidden="true"><div class="pf-meter__fill" style="transform:scaleX(${avgMastery.toFixed(3)})"></div></div>
          </div>
          <dl class="pf-kv">
            <dt>Pasal terkumpul</dt><dd>${masteryValues.length}</dd>
            <dt>Argumen tercatat</dt><dd>${historyCount}</dd>
            <dt>Integritas sesi terakhir</dt><dd>${integrity.toFixed(2)}</dd>
            <dt>Total percobaan</dt><dd>${progress.reduce((n, p) => n + p.attempts, 0)}</dd>
          </dl>
          <p class="pf-panel__hint">Peta konstelasi pasal tampil di dalam permainan.</p>
        </section>

        <section class="pf-panel" aria-labelledby="pf-setel-title" data-reveal style="--i:9">
          <p class="pf-eyebrow" id="pf-setel-title">Pengaturan</p>
          <label class="pf-field">
            <span class="pf-field__row"><span>Volume utama</span><span class="pf-mono-val" data-out="master">${Math.round(game.masterVolume * 100)}%</span></span>
            <input class="pf-range" type="range" min="0" max="1" step="0.01" value="${game.masterVolume}" data-setting="master" />
          </label>
          <label class="pf-field">
            <span class="pf-field__row"><span>Volume efek</span><span class="pf-mono-val" data-out="sfx">${Math.round(game.sfxVolume * 100)}%</span></span>
            <input class="pf-range" type="range" min="0" max="1" step="0.01" value="${game.sfxVolume}" data-setting="sfx" />
          </label>
          <label class="pf-switch"><span>Bisukan audio</span><input type="checkbox" data-setting="mute" ${game.muted ? 'checked' : ''} /><i aria-hidden="true"></i></label>
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

        <section class="pf-panel" aria-labelledby="pf-riset-title" data-reveal style="--i:10">
          <p class="pf-eyebrow" id="pf-riset-title">Riset &amp; data</p>
          <p class="pf-body pf-panel__text">Semua data permainan tetap di perangkatmu. Jika kamu ikut riset, catatan sesi (tanpa nama) bisa diekspor lalu kamu kirim sendiri ke peneliti.</p>
          <label class="pf-switch"><span>Saya setuju data sesi dicatat untuk riset</span><input type="checkbox" data-setting="consent" ${settings.researchConsent ? 'checked' : ''} /><i aria-hidden="true"></i></label>
          <dl class="pf-kv">
            <dt>Kode partisipan</dt><dd>${escapeHtml(profile.participantCode ?? '-')}</dd>
            <dt>Sesi tercatat</dt><dd data-out="sesi">${sessions.length}</dd>
          </dl>
          <div class="pf-panel__actions">
            <button type="button" class="pf-btn pf-btn--secondary" data-action="ekspor-json">Ekspor JSON</button>
            <button type="button" class="pf-btn pf-btn--secondary" data-action="ekspor-csv">Ekspor CSV</button>
            <button type="button" class="pf-btn pf-btn--ghost" data-action="hapus-sesi">Hapus data riset</button>
          </div>
          <p class="pf-panel__hint" data-out="status" aria-live="polite"></p>
        </section>

        <section class="pf-panel" aria-labelledby="pf-akun-title" data-reveal style="--i:11">
          <p class="pf-eyebrow" id="pf-akun-title">Akun</p>
          <div class="pf-akun">
            <span class="pf-avatar pf-avatar--lg" style="background:${profile.color}" aria-hidden="true">${escapeHtml(initials(profile.name))}</span>
            <div>
              <div class="pf-akun__name">${escapeHtml(profile.name)}${profile.pinHash ? ' <span class="pf-lock" aria-label="dikunci PIN">PIN</span>' : ''}</div>
              <div class="pf-akun__sub">Dibuat ${new Date(profile.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · ${escapeHtml(formatPlayTime(profile.totalPlayTimeMs))}</div>
            </div>
          </div>
          <p class="pf-panel__text pf-panel__text--muted">${modeNote}</p>
          <div class="pf-panel__actions">
            <button type="button" class="pf-btn pf-btn--ghost" data-action="ganti">Ganti akun</button>
            <button type="button" class="pf-btn pf-btn--ghost pf-btn--danger" data-action="hapus-profil">Hapus akun ini</button>
          </div>
        </section>
      </div>

      <footer class="pf-beranda__foot" data-reveal style="--i:12">
        <p>${escapeHtml(SOURCE_STATEMENT)}</p>
        <p class="pf-mono-val">v${APP_VERSION}</p>
      </footer>
    `;
    root.appendChild(el);
    this.element = el;

    // scene Spline (opsional): variabel integrity/menang dikirim ke scene bila scene mendefinisikannya
    const splineUrl = resolveSplineScene('beranda');
    if (splineUrl) {
      this.stage = new SplineStage(el.querySelector('[data-spline-host]') as HTMLElement, {
        url: splineUrl,
        variables: { integrity, menang: won, total: CHAPTER_IDS.length },
        onError: (err) => console.warn('[spline] beranda gagal dimuat:', err),
      });
      void this.stage.load();
    }

    // aksi umum
    el.querySelectorAll('[data-action="landing"]').forEach((b) =>
      b.addEventListener('click', () => this.options.onLanding()),
    );
    el.querySelectorAll('[data-action="ganti"]').forEach((b) =>
      b.addEventListener('click', () => this.options.onSwitchProfile()),
    );
    el.querySelectorAll('[data-action="keluar"]').forEach((b) =>
      b.addEventListener('click', () => {
        signOut();
        this.options.onSignOut();
      }),
    );
    el.querySelector('[data-action="hapus-profil"]')?.addEventListener('click', async () => {
      if (
        !window.confirm(
          `Hapus akun "${profile.name}" beserta seluruh progres dan data risetnya? Tindakan ini tidak bisa dibatalkan.`,
        )
      )
        return;
      await db.deleteProfile(profile.id);
      signOut();
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

    // riset: ekspor + hapus
    const status = bind<HTMLElement>('[data-out="status"]');
    const tag = profile.participantCode ?? profile.name;
    el.querySelector('[data-action="ekspor-json"]')?.addEventListener('click', async () => {
      const data = await db.exportProfile(profile.id, APP_VERSION);
      if (!data) return;
      await downloadTextFile(
        `pasal-frenzy-${tag}-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(data, null, 2),
        'application/json',
      );
      status.textContent = 'Berkas JSON disiapkan untuk diunduh.';
    });
    el.querySelector('[data-action="ekspor-csv"]')?.addEventListener('click', async () => {
      const list = await db.listResearchSessions(profile.id);
      await downloadTextFile(
        `pasal-frenzy-sesi-${tag}-${new Date().toISOString().slice(0, 10)}.csv`,
        researchSessionsToCsv(list),
        'text/csv',
      );
      status.textContent = `CSV berisi ${list.length} sesi disiapkan untuk diunduh.`;
    });
    el.querySelector('[data-action="hapus-sesi"]')?.addEventListener('click', async () => {
      if (!window.confirm('Hapus semua catatan sesi riset akun ini?')) return;
      await db.deleteResearchSessions(profile.id);
      bind<HTMLElement>('[data-out="sesi"]').textContent = '0';
      status.textContent = 'Catatan sesi riset dihapus.';
    });
  }

  private chapterCard(
    id: ChapterId,
    index: number,
    open: boolean,
    progress: ChapterProgressRecord | undefined,
    recommended: boolean,
  ): string {
    const meta = CHAPTER_META[id];
    const status = progress?.outcome === 'menang' ? 'selesai' : open ? 'terbuka' : 'terkunci';
    const label = {
      selesai: 'Selesai',
      terbuka: progress ? 'Lanjutkan' : 'Mulai',
      terkunci: 'Terkunci',
    }[status];
    const [judulUtama, judulSub] = splitTitle(meta.judul);
    const metaLine = progress
      ? `${progress.attempts} percobaan${progress.bestDurationMs ? ` · terbaik ${Math.round(progress.bestDurationMs / 1000)} detik` : ''}`
      : status === 'terkunci'
        ? 'Menangkan bab sebelumnya untuk membuka'
        : 'Belum pernah dimainkan';
    return `
      <li class="pf-chapter pf-chapter--${status}${recommended && open ? ' pf-chapter--next' : ''}" data-reveal style="--i:${4 + index}">
        <button type="button" class="pf-chapter__btn" data-chapter="${id}" aria-disabled="${open ? 'false' : 'true'}" ${open ? '' : 'tabindex="-1"'}>
          <span class="pf-chapter__numeral" aria-hidden="true">${ROMAN[index] ?? index + 1}</span>
          <span class="pf-chapter__top">
            <span class="pf-chapter__pasal">${escapeHtml(meta.pasal)}</span>
            <span class="pf-chapter__status">${status === 'terkunci' ? '<i class="pf-chapter__lock" aria-hidden="true"></i>' : ''}${label}</span>
          </span>
          <span class="pf-chapter__title"><span class="pf-chapter__kicker">${escapeHtml(judulUtama)}</span>${escapeHtml(judulSub)}</span>
          <span class="pf-chapter__sub">${escapeHtml(meta.sub)}</span>
          <span class="pf-chapter__meta">${escapeHtml(metaLine)}</span>
          <span class="pf-chapter__go" aria-hidden="true">${status === 'terkunci' ? 'Terkunci' : 'Masuk ke bab'} <i>→</i></span>
        </button>
      </li>`;
  }

  unmount(): void {
    this.stage?.dispose();
    this.stage = null;
    this.element?.remove();
    this.element = null;
  }
}

/** "Kasus 1: Labirinto Hakiki" -> ["Kasus 1", "Labirinto Hakiki"] */
function splitTitle(judul: string): [string, string] {
  const idx = judul.indexOf(':');
  if (idx < 0) return ['', judul];
  return [judul.slice(0, idx).trim(), judul.slice(idx + 1).trim()];
}
