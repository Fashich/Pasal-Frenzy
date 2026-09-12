/**
 * PIN profil: pengunci lokal (bukan autentikasi server). Disimpan sebagai
 * SHA-256(salt + pin) lewat WebCrypto; PIN mentah tidak pernah disimpan.
 * Jujur soal batasnya: siapa pun yang punya akses penuh ke perangkat/browser
 * tetap bisa menghapus data; PIN hanya mencegah profil dibuka tidak sengaja
 * di perangkat bersama.
 */

export const PIN_MIN = 4;
export const PIN_MAX = 6;

export function validatePin(raw: string): string | null {
  const pin = raw.trim();
  if (pin === '') return null;
  if (!/^\d+$/.test(pin)) return 'PIN hanya boleh berisi angka.';
  if (pin.length < PIN_MIN || pin.length > PIN_MAX) return `PIN ${PIN_MIN}-${PIN_MAX} digit.`;
  return null;
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = '';
  for (const b of arr) out += b.toString(16).padStart(2, '0');
  return out;
}

export function makeSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return toHex(bytes);
}

/** hash SHA-256; fallback FNV-1a 64-bit hanya jika WebCrypto tidak tersedia (mis. http tanpa TLS) */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return `sha256:${toHex(digest)}`;
  }
  let h1 = 0xcbf29ce4;
  let h2 = 0x84222325;
  for (const byte of data) {
    h1 = Math.imul(h1 ^ byte, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ byte, 0x01000193) >>> 0;
  }
  return `fnv:${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

export async function verifyPin(
  pin: string,
  stored: { pinHash?: string | null; pinSalt?: string | null },
): Promise<boolean> {
  if (!stored.pinHash || !stored.pinSalt) return true;
  const candidate = await hashPin(pin.trim(), stored.pinSalt);
  return candidate === stored.pinHash;
}
