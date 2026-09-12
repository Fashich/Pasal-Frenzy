/**
 * Markup merek bersama: logo Pasal Frenzy (PNG asli 123 px milik pemilik proyek,
 * cukup tajam untuk 28-36 px di layar 2-3x) + logotype PASAL FRENZY.
 * Dipakai di nav landing, bilah atas Masuk/Daftar, dan Beranda.
 */
import logoUrl from '../assets/brand/pasal-frenzy-logo-123px.png';

export const BRAND_LOGO_URL = logoUrl;

export function brandMarkup(extraClass = ''): string {
  return `<a class="pf-brand${extraClass ? ` ${extraClass}` : ''}" href="#/" aria-label="Pasal Frenzy, ke halaman utama">
    <img class="pf-brand__logo" src="${logoUrl}" alt="" width="34" height="34" decoding="async" />
    <span class="pf-logotype" aria-hidden="true"><span class="pf-logotype__pasal">PASAL</span><span class="pf-logotype__frenzy">FRENZY</span></span>
  </a>`;
}
