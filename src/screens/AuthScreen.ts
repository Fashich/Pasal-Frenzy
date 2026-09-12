/**
 * AuthScreen — Masuk / Daftar.
 * Tersedia di versi web dan aplikasi, dari landing page (nav + hero).
 *  - web : akun tersimpan di browser ini (localStorage), tanpa server.
 *  - app : akun tersimpan di basis data perangkat (IndexedDB).
 * PIN opsional hanya mengunci profil di perangkat; bukan autentikasi server.
 */
import './screens.css';
import './auth.css';
import { AVATAR_COLORS, type PlayerProfile } from '@core/persistence/GameDB.ts';
import { getPersistence, persistenceMode, signIn } from '@core/persistence/persistence.ts';
import { validatePin, verifyPin, PIN_MAX, PIN_MIN } from '@core/persistence/pin.ts';
import { KUTIPAN } from '@landing/content.ts';
import type { Screen } from '../shell/AppShell.ts';
import type { Route } from '../shell/router.ts';
import { escapeHtml, formatPlayTime, formatRelative, initials } from './format.ts';

export type AuthTab = 'masuk' | 'daftar';

export interface AuthScreenOptions {
  initialTab: AuthTab;
  onDone: (profile: PlayerProfile) => void;
  onBack: () => void;
  /** dipanggil saat pengguna berpindah tab agar hash URL ikut (#/masuk | #/daftar) */
  onTabChange?: (tab: AuthTab) => void;
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

export const MODE_NOTE: Record<typeof persistenceMode, string> = {
  web: 'Akun ini tersimpan di browser yang sedang kamu pakai, tanpa server. Ganti browser atau hapus data situs, dan akunnya ikut hilang. Untuk profil yang tersimpan di perangkat dan bisa dimainkan tanpa internet, unduh versi aplikasi.',
  app: 'Akun dan progres tersimpan di perangkat ini. Tidak ada data yang dikirim ke mana pun.',
};

export class AuthScreen implements Screen {
  private element: HTMLElement | null = null;
  private tab: AuthTab;

  constructor(private readonly options: AuthScreenOptions) {
    this.tab = options.initialTab;
  }

  async mount(root: HTMLElement): Promise<void> {
    const store = await getPersistence();
    const profiles = await store.listProfiles();

    const el = document.createElement('section');
    el.className = 'pf-screen pf-auth';
    el.setAttribute('aria-labelledby', 'pf-auth-title');
    el.innerHTML = `
      <div class="pf-ambient" aria-hidden="true">
        <i class="pf-ambient__glow pf-ambient__glow--biru"></i>
        <i class="pf-ambient__glow pf-ambient__glow--merah"></i>
        <i class="pf-ambient__grain"></i>
      </div>
      <header class="pf-topbar">
        <a class="pf-logotype pf-topbar__brand" href="#/" aria-label="Pasal Frenzy">
          <span class="pf-logotype__pasal">PASAL</span><span class="pf-logotype__frenzy">FRENZY</span>
        </a>
        <button type="button" class="pf-btn pf-btn--ghost" data-action="kembali">Halaman utama</button>
      </header>

      <div class="pf-auth__layout">
        <aside class="pf-auth__aside" data-reveal style="--i:0">
          <p class="pf-eyebrow">${escapeHtml(KUTIPAN.pasal1ayat2.label)}</p>
          <p class="pf-auth__quote">${escapeHtml(KUTIPAN.pasal1ayat2.teks)}</p>
          <p class="pf-auth__note">${escapeHtml(MODE_NOTE[persistenceMode])}</p>
          <p class="pf-auth__mode"><span class="pf-badge">${persistenceMode === 'web' ? 'Versi web' : 'Versi aplikasi'}</span></p>
        </aside>

        <div class="pf-glass pf-auth__card" data-reveal style="--i:1">
          <div class="pf-tabs" role="tablist" aria-label="Masuk atau daftar">
            <button type="button" role="tab" id="pf-tab-masuk" class="pf-tab" data-tab="masuk" aria-controls="pf-panel-masuk">Masuk</button>
            <button type="button" role="tab" id="pf-tab-daftar" class="pf-tab" data-tab="daftar" aria-controls="pf-panel-daftar">Daftar</button>
            <span class="pf-tabs__ink" aria-hidden="true"></span>
          </div>

          <div role="tabpanel" id="pf-panel-masuk" aria-labelledby="pf-tab-masuk" data-panel="masuk" class="pf-auth__panel">
            <h1 class="pf-h2" id="pf-auth-title">${profiles.length ? 'Pilih akunmu.' : 'Belum ada akun di sini.'}</h1>
            <p class="pf-body pf-auth__lead">${profiles.length ? 'Lanjutkan permainan dari akun yang tersimpan.' : 'Buat akun dulu, hanya butuh nama. PIN bersifat opsional.'}</p>
            ${
              profiles.length
                ? `<ul class="pf-profile-list">${profiles.map((p) => this.profileItem(p)).join('')}</ul>`
                : `<button type="button" class="pf-btn pf-btn--primary" data-goto="daftar">Buat akun</button>`
            }
          </div>

          <div role="tabpanel" id="pf-panel-daftar" aria-labelledby="pf-tab-daftar" data-panel="daftar" class="pf-auth__panel" hidden>
            <h2 class="pf-h2">Buat akun baru.</h2>
            <p class="pf-body pf-auth__lead">Progres, pasal yang kamu kuasai, dan catatan sesi akan tersimpan di akun ini.</p>
            <form class="pf-form pf-form--wide" novalidate>
              <div class="pf-field">
                <label for="pf-nama">Nama pemain</label>
                <input class="pf-input" id="pf-nama" name="nama" type="text" autocomplete="nickname" maxlength="${NAME_MAX}" required placeholder="mis. Fashich" />
                <span class="pf-field__hint">${NAME_MIN}-${NAME_MAX} karakter.</span>
                <span class="pf-field__error" data-error="nama" aria-live="polite"></span>
              </div>
              <div class="pf-field-row">
                <div class="pf-field">
                  <label for="pf-pin">PIN (opsional)</label>
                  <input class="pf-input" id="pf-pin" name="pin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="${PIN_MAX}" placeholder="${PIN_MIN}-${PIN_MAX} digit" />
                  <span class="pf-field__error" data-error="pin" aria-live="polite"></span>
                </div>
                <div class="pf-field">
                  <label for="pf-pin2">Ulangi PIN</label>
                  <input class="pf-input" id="pf-pin2" name="pin2" type="password" inputmode="numeric" autocomplete="new-password" maxlength="${PIN_MAX}" placeholder="ulangi" />
                  <span class="pf-field__error" data-error="pin2" aria-live="polite"></span>
                </div>
              </div>
              <span class="pf-field__hint">PIN hanya mengunci akun di ${persistenceMode === 'web' ? 'browser' : 'perangkat'} ini, berguna jika perangkat dipakai bersama.</span>
              <div class="pf-field">
                <span class="pf-field__label" id="pf-warna-label">Warna avatar</span>
                <div class="pf-swatches" role="radiogroup" aria-labelledby="pf-warna-label">
                  ${AVATAR_COLORS.map(
                    (c, i) => `
                    <label class="pf-swatch">
                      <input type="radio" name="warna" value="${c}" ${i === 0 ? 'checked' : ''} />
                      <span class="pf-swatch__dot" style="--c:${c}" aria-hidden="true"></span>
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
              <button type="submit" class="pf-btn pf-btn--primary pf-btn--block">Daftar &amp; masuk</button>
              <p class="pf-field__hint pf-auth__switch">Sudah punya akun? <button type="button" class="pf-linklike" data-goto="masuk">Masuk</button></p>
            </form>
          </div>
        </div>
      </div>
    `;
    root.appendChild(el);
    this.element = el;

    el.querySelector('[data-action="kembali"]')?.addEventListener('click', () =>
      this.options.onBack(),
    );
    el.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => this.switchTab(b.dataset['tab'] as AuthTab, true)),
    );
    el.querySelectorAll<HTMLButtonElement>('[data-goto]').forEach((b) =>
      b.addEventListener('click', () => this.switchTab(b.dataset['goto'] as AuthTab, true)),
    );

    // masuk: pilih akun (+ PIN bila ada)
    el.querySelectorAll<HTMLElement>('[data-profile]').forEach((item) => {
      const id = item.dataset['profile'];
      const btn = item.querySelector<HTMLButtonElement>('.pf-profile-card');
      const pinRow = item.querySelector<HTMLElement>('.pf-pin-row');
      const pinInput = item.querySelector<HTMLInputElement>('input[name="pin-masuk"]');
      const pinErr = item.querySelector<HTMLElement>('[data-error="pin-masuk"]');
      if (!id || !btn) return;
      const open = async () => {
        const profile = await store.getProfile(id);
        if (!profile) return;
        if (profile.pinHash) {
          if (!pinRow || !pinInput) return;
          const ok = await verifyPin(pinInput.value, profile);
          if (!ok) {
            if (pinErr) pinErr.textContent = 'PIN salah.';
            pinInput.select();
            item.classList.remove('pf-shake');
            void item.offsetWidth;
            item.classList.add('pf-shake');
            return;
          }
        }
        await store.touchProfile(id);
        signIn(id);
        this.options.onDone(profile);
      };
      btn.addEventListener('click', async () => {
        const profile = await store.getProfile(id);
        if (!profile) return;
        if (!profile.pinHash) {
          await open();
          return;
        }
        // tampilkan baris PIN untuk akun ini saja
        el.querySelectorAll<HTMLElement>('.pf-pin-row').forEach((r) => {
          r.hidden = r !== pinRow;
        });
        el.querySelectorAll<HTMLElement>('[data-profile]').forEach((r) =>
          r.classList.toggle('is-active', r === item),
        );
        pinInput?.focus();
      });
      pinRow?.querySelector('form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        void open();
      });
    });

    // daftar
    const form = el.querySelector('[data-panel="daftar"] form') as HTMLFormElement;
    const nama = el.querySelector('#pf-nama') as HTMLInputElement;
    const pin = el.querySelector('#pf-pin') as HTMLInputElement;
    const pin2 = el.querySelector('#pf-pin2') as HTMLInputElement;
    const kode = el.querySelector('#pf-kode') as HTMLInputElement;
    const err = (k: string) => el.querySelector(`[data-error="${k}"]`) as HTMLElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const eNama = validateName(nama.value);
      const ePin = validatePin(pin.value);
      const ePin2 =
        pin.value.trim() !== '' && pin.value.trim() !== pin2.value.trim()
          ? 'PIN tidak sama.'
          : null;
      const eKode = validateParticipantCode(kode.value);
      err('nama').textContent = eNama ?? '';
      err('pin').textContent = ePin ?? '';
      err('pin2').textContent = ePin2 ?? '';
      err('kode').textContent = eKode ?? '';
      const first = eNama ? nama : ePin ? pin : ePin2 ? pin2 : eKode ? kode : null;
      if (first) {
        first.focus();
        return;
      }
      const color = (form.querySelector('input[name="warna"]:checked') as HTMLInputElement | null)
        ?.value;
      const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      submit.disabled = true;
      try {
        const profile = await store.createProfile({
          name: nama.value,
          ...(color ? { color } : {}),
          participantCode: kode.value || null,
          pin: pin.value.trim() || null,
        });
        signIn(profile.id);
        this.options.onDone(profile);
      } finally {
        submit.disabled = false;
      }
    });

    this.switchTab(profiles.length ? this.tab : 'daftar', false);
    requestAnimationFrame(() => this.positionInk());
  }

  /** dipanggil AppShell saat hash berpindah masuk <-> daftar tanpa remount */
  setRoute(route: Route): void {
    if (route.name === 'masuk' || route.name === 'daftar') this.switchTab(route.name, false);
  }

  private profileItem(p: PlayerProfile): string {
    return `
      <li data-profile="${p.id}" class="pf-profile-item">
        <button type="button" class="pf-profile-card">
          <span class="pf-avatar" style="background:${p.color}" aria-hidden="true">${escapeHtml(initials(p.name))}</span>
          <span class="pf-profile-card__meta">
            <span class="pf-profile-card__name">${escapeHtml(p.name)}${p.pinHash ? ' <span class="pf-lock" aria-label="dikunci PIN">PIN</span>' : ''}</span>
            <span class="pf-profile-card__sub">Terakhir aktif ${formatRelative(p.lastActiveAt)}${p.participantCode ? ` · kode ${escapeHtml(p.participantCode)}` : ''} · ${formatPlayTime(p.totalPlayTimeMs)}</span>
          </span>
          <span class="pf-profile-card__arrow" aria-hidden="true">→</span>
        </button>
        ${
          p.pinHash
            ? `<div class="pf-pin-row" hidden>
                <form novalidate>
                  <label class="pf-visually-hidden" for="pf-pin-${p.id}">PIN untuk ${escapeHtml(p.name)}</label>
                  <input class="pf-input" id="pf-pin-${p.id}" name="pin-masuk" type="password" inputmode="numeric" autocomplete="current-password" maxlength="${PIN_MAX}" placeholder="PIN" />
                  <button type="submit" class="pf-btn pf-btn--primary">Buka</button>
                </form>
                <span class="pf-field__error" data-error="pin-masuk" aria-live="polite"></span>
              </div>`
            : ''
        }
      </li>`;
  }

  private switchTab(tab: AuthTab, notify: boolean): void {
    if (!this.element) return;
    this.tab = tab;
    this.element.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => {
      const active = b.dataset['tab'] === tab;
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      b.tabIndex = active ? 0 : -1;
    });
    this.element.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => {
      p.hidden = p.dataset['panel'] !== tab;
    });
    this.positionInk();
    if (tab === 'daftar')
      (this.element.querySelector('#pf-nama') as HTMLInputElement | null)?.focus();
    if (notify) this.options.onTabChange?.(tab);
  }

  private positionInk(): void {
    const active = this.element?.querySelector<HTMLElement>('[data-tab][aria-selected="true"]');
    const ink = this.element?.querySelector<HTMLElement>('.pf-tabs__ink');
    if (!active || !ink) return;
    ink.style.width = `${active.offsetWidth}px`;
    ink.style.transform = `translateX(${active.offsetLeft}px)`;
  }

  unmount(): void {
    this.element?.remove();
    this.element = null;
  }
}
