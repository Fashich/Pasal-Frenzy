/**
 * Halaman uji internal: ?dev=spline&scene=<url .splinecode>
 * Memuat satu scene Spline layar penuh lewat SplineStage dan menampilkan status
 * (waktu muat, ukuran, galat). Bukan bagian produk; hanya untuk memverifikasi
 * ekspor sebelum dipasang ke slot di spline-scenes.json.
 */
import '../screens/screens.css';
import { SplineStage } from '@ui/spline/SplineStage.ts';
import { resolveSplineScene } from '@data/splineScenes.ts';

export async function runSplineDemo(root: HTMLElement): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene') ?? resolveSplineScene('beranda') ?? '';
  root.innerHTML = `
    <div style="position:fixed;inset:0;background:#080810">
      <div data-host style="position:absolute;inset:0"></div>
      <div style="position:absolute;left:1rem;top:1rem;z-index:2;display:grid;gap:.35rem;max-width:min(92vw,560px)">
        <p class="pf-eyebrow" style="margin:0">Uji Spline (halaman internal)</p>
        <p class="pf-mono-val" data-status style="margin:0;color:#f8f8f8">${scene ? `Memuat ${escape(scene)}…` : 'Tambahkan ?scene=<url .splinecode>'}</p>
      </div>
    </div>`;
  if (!scene) return;
  const host = root.querySelector('[data-host]') as HTMLElement;
  const status = root.querySelector('[data-status]') as HTMLElement;
  const t0 = performance.now();
  let bytes = 0;
  try {
    const head = await fetch(scene, { method: 'HEAD' });
    bytes = Number(head.headers.get('content-length') ?? 0);
  } catch {
    /* HEAD bisa ditolak; abaikan */
  }
  const stage = new SplineStage(host, {
    url: scene,
    interactive: true,
    onLoad: () => {
      const ms = Math.round(performance.now() - t0);
      status.textContent = `Termuat dalam ${ms} ms${bytes ? ` · ${(bytes / 1024).toFixed(0)} KB` : ''} · WebGL`;
    },
    onError: (err) => {
      status.textContent = `Gagal: ${err instanceof Error ? err.message : String(err)}`;
    },
  });
  await stage.load();
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
