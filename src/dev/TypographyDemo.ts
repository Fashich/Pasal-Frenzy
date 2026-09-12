/**
 * TypographyDemo — verifikasi overlay Phaser + fisika tipografi (?dev=typography).
 * Kata-kata Pasal 33 ayat (1)-(3) dijatuhkan sebagai rigid body bermassa;
 * seret dengan pointer. Tombol: [ ] integritas (gravitasi), R jatuhkan ulang,
 * A tandai kata antagonis acak.
 */
import { constitutionalStore } from '@core/store/ConstitutionalStore.ts';
import { createUudIndex } from '@data/uud1945.ts';
import type { PhaserEngine as PhaserEngineType, WordHandle } from '@core/engine/PhaserEngine.ts';

export async function runTypographyDemo(root: HTMLElement): Promise<() => void> {
  root.innerHTML = '';
  root.style.position = 'relative';
  root.style.height = '100dvh';
  root.style.background =
    'radial-gradient(ellipse at 50% 30%, #101733 0%, #080810 60%, #000005 100%)';

  const { PhaserEngine } = await import('@core/engine/PhaserEngine.ts');
  await PhaserEngine.ensureFonts();
  const engine: PhaserEngineType = new PhaserEngine(root);
  const scene = await engine.ready;
  engine.setInteractive(true);

  const index = createUudIndex();
  const p33 = index.pasalById.get('33')?.pasal;
  const units = (p33?.ayat ?? []).slice(0, 3).map((a) => ({ id: a.id, teks: a.teks }));

  const spawnAll = () => {
    scene.clearWords();
    const { width } = scene.scale;
    let i = 0;
    for (const u of units) {
      for (const token of u.teks.split(/\s+/)) {
        const word = token.replace(/[.,;:()]+$/g, '');
        if (!word) continue;
        scene.spawnWord({
          text: word,
          unitId: u.id,
          chapterId: 'case-2-pasal33',
          x: 60 + ((i * 97) % Math.max(200, width - 120)),
          y: -40 - (i % 9) * 46,
          kind: 'pasal',
          fontSize: 20,
          angle: ((i * 37) % 30) - 15,
        });
        i += 1;
      }
    }
  };
  spawnAll();

  const hud = document.createElement('div');
  hud.className = 'pf-devhud';
  hud.style.cssText =
    'position:absolute;left:12px;top:12px;padding:8px 12px;background:rgba(8,8,16,.7);color:#f8f8f8;font:12px/1.5 "JetBrains Mono",monospace;border:1px solid #1e3a8a;pointer-events:none;white-space:pre;z-index:5';
  root.appendChild(hud);

  let lastDrag: WordHandle | null = null;
  scene.emitter.on('word:dragstart', (w: WordHandle) => {
    lastDrag = w;
  });

  const tick = () => {
    const s = constitutionalStore.getState();
    engine.applyIntegrity(s.integrity);
    const masses = Array.from(scene.words.values()).map((w) => w.physics.mass);
    const avg = masses.length ? masses.reduce((a, b) => a + b, 0) / masses.length : 0;
    const heaviest = Array.from(scene.words.values()).sort(
      (a, b) => b.physics.mass - a.physics.mass,
    )[0];
    const lightest = Array.from(scene.words.values()).sort(
      (a, b) => a.physics.mass - b.physics.mass,
    )[0];
    hud.textContent =
      `integritas ${s.integrity.toFixed(2)}  gravitasi ${scene.matter.world.localWorld.gravity.y.toFixed(2)}\n` +
      `kata ${scene.wordCount}  massa rata-rata ${avg.toFixed(2)}\n` +
      `terberat: ${heaviest?.text ?? '-'} (${heaviest?.physics.mass.toFixed(2) ?? '-'})  ` +
      `teringan: ${lightest?.text ?? '-'} (${lightest?.physics.mass.toFixed(2) ?? '-'})\n` +
      `seret terakhir: ${lastDrag?.text ?? '-'}  fps ${Math.round(scene.game.loop.actualFps)}\n` +
      `[ ] integritas, R jatuhkan ulang, A tandai antagonis, seret kata dengan pointer`;
    raf = requestAnimationFrame(tick);
  };
  let raf = requestAnimationFrame(tick);

  const onKey = (e: KeyboardEvent) => {
    const s = constitutionalStore.getState();
    if (e.key === '[') s.setIntegrity(s.integrityTarget - 0.1, 'demo');
    if (e.key === ']') s.setIntegrity(s.integrityTarget + 0.1, 'demo');
    if (e.key === 'r' || e.key === 'R') spawnAll();
    if (e.key === 'a' || e.key === 'A') {
      const all = Array.from(scene.words.values());
      const pick = all[Math.floor(Math.random() * all.length)];
      if (pick) scene.setWordKind(pick, pick.kind === 'antagonis' ? 'pasal' : 'antagonis');
    }
  };
  window.addEventListener('keydown', onKey);

  (window as unknown as { __pf?: unknown }).__pf = { engine, scene, store: constitutionalStore };

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    engine.destroy();
    hud.remove();
  };
}
