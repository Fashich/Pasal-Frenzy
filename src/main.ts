/**
 * Shell aplikasi Pasal Frenzy.
 *
 * File ini sengaja dibuat sekecil mungkin: ia hanya menyiapkan root DOM dan
 * memuat lapisan berikutnya secara dinamis. Preloader, landing page, dan engine
 * game dimuat lewat dynamic import agar Time to Interactive tetap rendah
 * (lihat PRD Bagian III).
 */
import './styles/base.css';
import { APP_VERSION, BUILD_TARGET } from './buildInfo.ts';

const root = document.getElementById('app');

if (!(root instanceof HTMLElement)) {
  throw new Error('Elemen #app tidak ditemukan.');
}

root.dataset['buildTarget'] = BUILD_TARGET;
root.dataset['appVersion'] = APP_VERSION;

async function bootstrap(): Promise<void> {
  const { startShell } = await import('./shell/startShell.ts');
  await startShell(root as HTMLElement);
}

void bootstrap();
