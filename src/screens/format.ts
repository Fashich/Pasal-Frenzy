/** Pembantu format teks untuk layar (tanpa dependensi). */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
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

/** durasi ringkas untuk ubin statistik: "0 mnt", "12 mnt", "1 j 05 mnt" */
export function formatDurationShort(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} mnt`;
  const h = Math.floor(min / 60);
  return `${h} j ${String(min % 60).padStart(2, '0')} mnt`;
}

export function formatLongDate(date: Date, locale = 'id-ID'): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
