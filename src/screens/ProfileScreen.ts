/**
 * ProfileScreen — "Masuk / Buat Profil" (login/sign-up versi offline).
 * Profil pemain lokal di IndexedDB; bisa beberapa profil per perangkat.
 * Tanpa server: tidak ada kata sandi yang dikirim ke mana pun.
 */
import './screens.css';
import {
  AVATAR_COLORS,
  gameDB,
  setActiveProfileId,
  type PlayerProfile,
} from '@core/persistence/GameDB.ts';
import type { Screen } from '../shell/AppShell.ts';

export interface ProfileScreenOptions {
  onDone: (profile: PlayerProfile) => void;
  onBack: () => void;
}

export const NAME_MIN = 2;
export const NAME_MAX = 24;

export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < NAME_MIN) return `Nama minimal ${NAME_MIN} karakter.`;
  if (name.length > NAME_MAX) return `Nama maksimal ${NAME_MAX} karakter.`;
  return null;
}

export function validateParticipantCode(raw: string): string | null {
  const code = raw.trim();
  if (code === '') return null;
  if (!/^[A-Za-z0-9-]{2,16}$/.test(code))
    return 'Kode partisipan: huruf, angka, atau tanda hubung (2-16 karakter).';
  return null;
}

export class ProfileScreen implements Screen {
  private root: HTMLElement | null = null;
  private element: HTMLElement | null = null;

  constructor(private readonly options: ProfileScreenOptions) {}

  async mount(root: HTMLElement): Promise<void> {
    this.root = root;
    const db = await gameDB();
    const profiles = await db.listProfiles();

    const el = document.createElement('section');
    el.className = 'pf-screen';
    el.setAttribute('aria-labelledby', 'pf-masuk-title');
    el.innerHTML = `
      <header class="pf-screen__head">
        <div class="pf-screen__title">
          <p class="pf-eyebrow">Masuk</p>
          <h1 class="pf-h1" id="pf-masuk-title">${profiles.length ? 'Pilih profil atau buat yang baru.' : 'Buat profil pemain.'}</h1>
          <p class="pf-lead">${profiles.length ? 'Lanjutkan dengan profil yang ada, atau buat profil baru untuk pemain lain.' : 'Progres, pasal yang kamu kuasai, dan catatan sesi akan disimpan di profil ini.'}</p>
        </div>
        <button type="button" class="pf-btn pf-btn--ghost" data-action="kembali">Kembali ke halaman utama</button>
      </header>
      <div class="pf-screen__body pf-grid-2">
        <div class="pf-glass pf-card" ${profiles.length ? '' : 'hidden'}>
          <p class="pf-eyebrow">Profil tersimpan</p>
          <ul class="pf-profile-list">
            ${profiles
              .map(
                (p) => `
              <li>
                <button type="button" class="pf-glass pf-profile-card" data-profile="${p.id}">
                  <span class="pf-avatar" style="background:${p.color}" aria-hidden="true">${escapeHtml(initials(p.name))}</span>
                  <span class="pf-profile-card__meta">
                    <span class="pf-profile-card__name">${escapeHtml(p.name)}</span>
                    <span class="pf-profile-card__sub">Terakhir aktif ${formatRelative(p.lastActiveAt)}${p.participantCode ? ` · kode ${escapeHtml(p.participantCode)}` : ''} · ${formatPlayTime(p.totalPlayTimeMs)}</span>
                  </span>
                </button>
              </li>`,
              )
              .join('')}
          </ul>
        </div>
        <form class="pf-glass pf-card pf-form" novalidate>
          <p class="pf-eyebrow">Profil baru</p>
          <div class="pf-field">
            <label for="pf-nama">Nama pemain</label>
            <input class="pf-input" id="pf-nama" name="nama" type="text" autocomplete="nickname" maxlength="${NAME_MAX}" required placeholder="mis. Fashich" />
            <span class="pf-field__hint">${NAME_MIN}-${NAME_MAX} karakter.</span>
            <span class="pf-field__error" data-error="nama" aria-live="polite"></span>
          </div>
          <div class="pf-field">
            <label for="pf-warna">Warna avatar</label>
            <div id="pf-warna" role="radiogroup" aria-label="Warna avatar" style="display:flex;gap:.5rem;flex-wrap:wrap">
              ${AVATAR_COLORS.map(
                (c, i) => `
                <label style="display:inline-flex;align-items:center;gap:.35rem;cursor:pointer">
                  <input type="radio" name="warna" value="${c}" ${i === 0 ? 'checked' : ''} />
                  <span class="pf-avatar" style="background:${c};width:28px;height:28px" aria-hidden="true"></span>
                </label>`,
              ).join('')}
            </div>
          </div>
          <div class="pf-field">
            <label for="pf-kode">Kode partisipan riset (opsional)</label>
            <input class="pf-input" id="pf-kode" name="kode" type="text" autocomplete="off" maxlength="16" placeholder="mis. P-017" />
            <span class="pf-field__hint">Isi hanya jika kamu peserta studi. Kode ini yang tercantum di berkas ekspor, bukan namamu.</span>
            <span class="pf-field__error" data-error="kode" aria-live="polite"></span>
          </div>
          <button type="submit" class="pf-btn pf-btn--primary">Buat profil &amp; masuk</button>
        </form>
      </div>
    `;
    root.appendChild(el);
    this.element = el;

    el.querySelector('[data-action="kembali"]')?.addEventListener('click', () =>
      this.options.onBack(),
    );
    el.querySelectorAll<HTMLButtonElement>('[data-profile]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const id = btn.dataset['profile'];
        if (!id) return;
        const profile = await db.getProfile(id);
        if (!profile) return;
        await db.touchProfile(id);
        setActiveProfileId(id);
        this.options.onDone(profile);
      }),
    );

    const form = el.querySelector('form') as HTMLFormElement;
    const nama = el.querySelector('#pf-nama') as HTMLInputElement;
    const kode = el.querySelector('#pf-kode') as HTMLInputElement;
    const errNama = el.querySelector('[data-error="nama"]') as HTMLElement;
    const errKode = el.querySelector('[data-error="kode"]') as HTMLElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const e1 = validateName(nama.value);
      const e2 = validateParticipantCode(kode.value);
      errNama.textContent = e1 ?? '';
      errKode.textContent = e2 ?? '';
      if (e1 || e2) {
        (e1 ? nama : kode).focus();
        return;
      }
      const color = (form.querySelector('input[name="warna"]:checked') as HTMLInputElement | null)
        ?.value;
      const profile = await db.createProfile({
        name: nama.value,
        ...(color ? { color } : {}),
        participantCode: kode.value || null,
      });
      setActiveProfileId(profile.id);
      this.options.onDone(profile);
    });
    if (!profiles.length) nama.focus();
  }

  unmount(): void {
    this.element?.remove();
    this.element = null;
    this.root = null;
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

export function formatRelative(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

export function formatPlayTime(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'belum bermain';
  if (min < 60) return `${min} menit bermain`;
  const h = Math.floor(min / 60);
  return `${h} jam ${min % 60} menit bermain`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
