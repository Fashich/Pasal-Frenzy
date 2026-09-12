/**
 * Titik masuk sementara sebelum preloader dan landing page dibangun
 * (feature/09 dan feature/20). Menampilkan status build agar pipeline
 * Vite, alias path, dan CSS bisa diverifikasi lebih awal.
 *
 * Parameter `?dev=<nama>` membuka scene pengembangan (hanya dimuat saat diminta).
 */
import { APP_VERSION, BUILD_TARGET } from '../buildInfo.ts';

export async function startShell(root: HTMLElement): Promise<void> {
  const dev = new URLSearchParams(window.location.search).get('dev');
  if (dev === 'corridor') {
    const { runCorridorDemo } = await import('../dev/CorridorDemo.ts');
    runCorridorDemo(root);
    return;
  }
  if (dev === 'typography') {
    const { runTypographyDemo } = await import('../dev/TypographyDemo.ts');
    await runTypographyDemo(root);
    return;
  }

  const capabilities = detectCapabilities();

  root.innerHTML = `
    <main class="shell" aria-labelledby="shell-title">
      <h1 id="shell-title" class="shell__title">
        <span class="shell__pasal">PASAL</span><span class="shell__frenzy">FRENZY</span>
      </h1>
      <p class="shell__status">
        Build ${BUILD_TARGET} · v${APP_VERSION} ·
        WebGL2 ${capabilities.webgl2 ? 'tersedia' : 'tidak tersedia'} ·
        WebXR ${capabilities.webxr ? 'tersedia' : 'tidak tersedia'}
      </p>
    </main>
  `;
}

export interface Capabilities {
  webgl2: boolean;
  webxr: boolean;
  reducedMotion: boolean;
}

function probeWebGl2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

export function detectCapabilities(): Capabilities {
  const webxr = typeof navigator !== 'undefined' && 'xr' in navigator;
  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { webgl2: probeWebGl2(), webxr, reducedMotion };
}
