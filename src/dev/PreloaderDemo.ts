/**
 * PreloaderDemo (?dev=preloader) — memutar intro + preloader dengan tahap
 * pemuatan nyata (font, data UUD, chunk engine, audio), lalu transisi ke layar
 * uji kursor & transisi scene. Tombol: 1/2/3 memutar tiga jenis transisi.
 */
import { CustomCursor } from '@ui/cursor/CustomCursor.ts';
import { Preloader } from '@ui/preloader/Preloader.ts';
import { runLoadingStages, type LoadingStage } from '@ui/preloader/loadingStages.ts';
import { SceneTransition, type TransitionKind } from '@ui/transitions/SceneTransition.ts';
import { settingsStore } from '@core/store/SettingsStore.ts';
import { kataAlinea } from '@data/pembukaan.ts';
import { PRODUCT_DESCRIPTION } from '../shell/copy.ts';

export async function runPreloaderDemo(root: HTMLElement): Promise<() => void> {
  root.innerHTML = '';
  const reducedMotion =
    settingsStore.getState().reducedMotion === 'aktif' ||
    (settingsStore.getState().reducedMotion === 'sistem' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const introWords = kataAlinea(1).map((k) => k.teks);

  const preloader = new Preloader({
    introWords,
    introLabel: 'Alinea pertama Pembukaan UUD 1945',
    description: PRODUCT_DESCRIPTION,
    reducedMotion,
    showSkip: settingsStore.getState().introSeen,
    onSkip: () => settingsStore.getState().setIntroSeen(true),
  });
  preloader.mount(root);
  const introPromise = preloader.playIntro();

  // Tahap NYATA (bobot = perkiraan biaya relatif)
  const stages: LoadingStage[] = [
    {
      id: 'font',
      label: 'Memuat tipografi (Playfair Display, Space Grotesk, JetBrains Mono)',
      weight: 1,
      run: async (report) => {
        const fonts = [
          '900 32px "Playfair Display"',
          '500 16px "Space Grotesk"',
          '700 16px "JetBrains Mono"',
        ];
        let done = 0;
        await Promise.all(
          fonts.map((f) =>
            document.fonts.load(f).then(() => {
              done += 1;
              report(done / fonts.length);
            }),
          ),
        );
      },
    },
    {
      id: 'data',
      label: 'Memuat naskah UUD NRI 1945 (37 pasal, 4 alinea Pembukaan)',
      weight: 1,
      run: async () => {
        await import('@data/uud1945.ts');
        await import('@data/pasalWeights.ts');
      },
    },
    {
      id: 'engine',
      label: 'Menyusun ruang non-Euclidean (engine Three.js)',
      weight: 3,
      run: async () => {
        await import('@core/engine/ThreeEngine.ts');
      },
    },
    {
      id: 'audio',
      label: 'Menyiapkan sintesis audio spasial',
      weight: 1,
      run: async () => {
        await import('@core/audio/AudioEngine.ts');
      },
    },
  ];
  const loading = runLoadingStages(stages, (p) => preloader.setProgress(p), { minStageMs: 350 });

  await Promise.all([introPromise, loading]);
  settingsStore.getState().setIntroSeen(true);

  // layar uji di balik preloader
  const stageEl = document.createElement('div');
  stageEl.style.cssText =
    'min-height:100dvh;display:grid;place-content:center;gap:1rem;text-align:center;padding:2rem';
  stageEl.innerHTML = `
    <p class="pf-eyebrow">Uji kursor &amp; transisi</p>
    <h2 class="pf-h1">Preloader selesai.</h2>
    <p class="pf-lead">Gerakkan pointer: titik + cincin. Arahkan ke tombol: cincin membesar.</p>
    <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
      <button class="pf-btn pf-btn--primary" data-kind="constitutional-dive">Constitutional Dive</button>
      <button class="pf-btn pf-btn--secondary" data-kind="void-collapse">Void Collapse</button>
      <button class="pf-btn pf-btn--secondary" data-kind="chromatic-shatter">Chromatic Shatter</button>
    </div>
    <p class="pf-mono" id="pf-tr-status" style="color:var(--pf-fg-muted)">transisi: -</p>
  `;
  root.appendChild(stageEl);
  await preloader.finish();

  const cursor = new CustomCursor({ reducedMotion });
  cursor.start();
  const transition = new SceneTransition(root);
  const status = stageEl.querySelector('#pf-tr-status') as HTMLElement;
  let aberration = 0;
  stageEl.querySelectorAll<HTMLButtonElement>('button[data-kind]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset['kind'] as TransitionKind;
      const started = performance.now();
      void transition
        .play(
          kind,
          {
            onMidpoint: () => {
              status.textContent = `transisi: ${kind} — titik tengah`;
            },
            setAberration: (v) => {
              aberration = v;
            },
          },
          {
            reducedMotion,
            text: 'Kedaulatan berada di tangan rakyat dan dilaksanakan menurut Undang-Undang Dasar.',
          },
        )
        .then(() => {
          status.textContent = `transisi: ${kind} selesai dalam ${Math.round(performance.now() - started)} ms (aberasi akhir ${aberration.toFixed(2)})`;
        });
    });
  });

  (window as unknown as { __pf?: unknown }).__pf = { preloader, cursor, transition };
  return () => {
    cursor.stop();
    transition.destroy();
    stageEl.remove();
  };
}
