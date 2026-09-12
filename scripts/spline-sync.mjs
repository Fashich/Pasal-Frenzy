/**
 * Menyalin modul WASM runtime Spline ke public/spline/wasm/ agar scene bisa
 * dimuat tanpa CDN (offline). Jalankan setelah menaruh berkas .splinecode:
 *   npm run spline:sync
 * Hanya modul yang benar-benar dipakai scene yang dimuat browser; yang tidak
 * dipakai tidak pernah diunduh, tetapi tetap ikut precache PWA bila ada di public/.
 * Gunakan --only=physics,process untuk menyalin subset.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'node_modules', '@splinetool', 'runtime', 'build');
const dst = join(root, 'public', 'spline', 'wasm');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',').filter(Boolean) : null;

if (!existsSync(src)) {
  console.error('Runtime Spline belum terpasang: npm i @splinetool/runtime');
  process.exit(1);
}
mkdirSync(dst, { recursive: true });
let total = 0;
for (const name of readdirSync(src)) {
  if (!name.endsWith('.wasm')) continue;
  const stem = name.replace(/\.wasm$/, '');
  if (only && !only.includes(stem)) continue;
  copyFileSync(join(src, name), join(dst, name));
  const kb = Math.round(statSync(join(dst, name)).size / 1024);
  total += kb;
  console.log(`  ${name.padEnd(36)} ${String(kb).padStart(6)} KB`);
}
console.log(`Tersalin ke public/spline/wasm (${total} KB).`);
