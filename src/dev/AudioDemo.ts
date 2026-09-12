/**
 * AudioDemo — verifikasi sistem audio (?dev=audio). Semua suara disintesis.
 * Klik "Buka audio" (gesture) lalu coba tombol lain; RMS keluaran master
 * ditampilkan agar sinyal bisa diverifikasi tanpa mendengar.
 */
import { AudioEngine } from '@core/audio/AudioEngine.ts';
import { ResponsiveSoundscape } from '@core/audio/SoundscapeLayer.ts';
import { CorruptiveHiss } from '@core/audio/synthesizers/CorruptiveHiss.ts';
import { GavelSynth } from '@core/audio/synthesizers/GavelSynth.ts';
import { HeartbeatWorklet } from '@core/audio/synthesizers/HeartbeatWorklet.ts';
import { WhisperSynth } from '@core/audio/synthesizers/WhisperSynth.ts';
import { constitutionalStore } from '@core/store/ConstitutionalStore.ts';

export function runAudioDemo(root: HTMLElement): () => void {
  root.innerHTML = '';
  const engine = AudioEngine.get();
  const gavel = new GavelSynth(engine);
  const heartbeat = new HeartbeatWorklet(engine);
  const whisper = new WhisperSynth(engine);
  const soundscape = new ResponsiveSoundscape(engine);
  const hisses: CorruptiveHiss[] = [];
  let hissAngle = 0;

  const panel = document.createElement('div');
  panel.style.cssText =
    'max-width:720px;margin:0 auto;padding:2rem;font-family:var(--pf-font-ui);display:grid;gap:12px';
  panel.innerHTML = `
    <h1 style="font-family:var(--pf-font-display);margin:0">Uji Audio</h1>
    <p style="color:var(--pf-fg-muted);margin:0">Semua suara disintesis Web Audio API. Buka audio dulu (gesture), lalu coba lapisan lain.</p>
    <div class="row" style="display:flex;flex-wrap:wrap;gap:8px"></div>
    <label>Integritas <input id="pf-int" type="range" min="0" max="1" step="0.01" value="1"> <span id="pf-int-v">1.00</span></label>
    <label>Kesehatan psikologis (detak) <input id="pf-hp" type="range" min="0" max="1" step="0.01" value="1"> <span id="pf-hp-v">1.00</span></label>
    <label>Lingkungan
      <select id="pf-env"><option value="">kering</option><option value="sidang">ruang sidang</option><option value="digital">koridor digital</option><option value="krisis">ruang krisis</option></select>
    </label>
    <pre id="pf-audio-hud" style="font-family:var(--pf-font-mono);font-size:12px;color:#b3b3bd;margin:0"></pre>
  `;
  root.appendChild(panel);
  const row = panel.querySelector('.row') as HTMLDivElement;

  const button = (label: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText =
      'padding:8px 14px;background:#1e3a8a;color:#f8f8f8;border:1px solid #3b82f6;border-radius:4px;font:inherit;cursor:pointer';
    b.addEventListener('click', onClick);
    row.appendChild(b);
    return b;
  };

  button('Buka audio', () => {
    void engine.unlock().then((ok) => {
      if (ok && !soundscape.isRunning) soundscape.start();
    });
  });
  button('Palu: menang', () => gavel.strike({ outcome: 'menang' }));
  button('Palu: kalah', () => gavel.strike({ outcome: 'kalah' }));
  button('Palu x3', () => gavel.strike({ outcome: 'menang', count: 3, intervalMs: 240 }));
  button('Detak jantung', () => {
    if (heartbeat.isRunning) heartbeat.stop();
    else void heartbeat.start();
  });
  button('Bisikan oligarki', () => {
    if (whisper.isPlaying) whisper.stop();
    else whisper.start();
  });
  button('Frenzy on/off', () => {
    const s = constitutionalStore.getState();
    if (s.frenzyActive) s.deactivateFrenzy('manual');
    else s.activateFrenzy('naratif');
  });
  for (const kind of ['korporasi', 'populis', 'eksekutif'] as const) {
    button(`Hiss ${kind}`, () => {
      const h = new CorruptiveHiss(engine, kind, 0.7);
      h.start();
      hissAngle += 1.9;
      h.setPosition(Math.cos(hissAngle) * 4, 1.5, Math.sin(hissAngle) * 4);
      hisses.push(h);
      setTimeout(() => {
        h.stop();
        const i = hisses.indexOf(h);
        if (i >= 0) hisses.splice(i, 1);
      }, 5000);
    });
  }

  const intInput = panel.querySelector('#pf-int') as HTMLInputElement;
  const intVal = panel.querySelector('#pf-int-v') as HTMLSpanElement;
  intInput.addEventListener('input', () => {
    const v = Number(intInput.value);
    constitutionalStore.getState().setIntegrity(v, 'demo audio');
    intVal.textContent = v.toFixed(2);
  });
  const hpInput = panel.querySelector('#pf-hp') as HTMLInputElement;
  const hpVal = panel.querySelector('#pf-hp-v') as HTMLSpanElement;
  hpInput.addEventListener('input', () => {
    const v = Number(hpInput.value);
    heartbeat.setHealth(v);
    hpVal.textContent = v.toFixed(2);
  });
  const envSelect = panel.querySelector('#pf-env') as HTMLSelectElement;
  envSelect.addEventListener('change', () => {
    engine.setEnvironment((envSelect.value || null) as 'sidang' | 'digital' | 'krisis' | null);
  });

  const hud = panel.querySelector('#pf-audio-hud') as HTMLPreElement;
  engine.updateListener({ x: 0, y: 1.7, z: 0 }, { x: 0, y: 0, z: -1 });
  let last = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const s = constitutionalStore.getState();
    s.tickIntegrity(dt);
    soundscape.update(dt, s);
    const ctx = engine.context;
    hud.textContent =
      `context: ${ctx ? ctx.state : 'belum dibuat'}  sampleRate ${ctx?.sampleRate ?? '-'}  RMS ${engine.getOutputRms().toFixed(4)}\n` +
      `integritas ${s.integrity.toFixed(2)}  drone ${(82.5 + 27.5 * s.integrity).toFixed(1)} Hz  ` +
      `lapisan: foundation ${s.activeLayers.foundation ? 'on' : 'off'}, crisis ${s.activeLayers.crisis ? 'on' : 'off'}, frenzy ${s.activeLayers.frenzy ? 'on' : 'off'}\n` +
      `detak: ${heartbeat.isRunning ? (heartbeat.usingWorklet ? 'AudioWorklet' : 'fallback main thread') : 'off'}  ` +
      `bisikan: ${whisper.isPlaying ? 'on' : 'off'}  hiss aktif: ${hisses.length}  lingkungan: ${engine.environment ?? 'kering'}`;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  (window as unknown as { __pf?: unknown }).__pf = {
    engine,
    gavel,
    heartbeat,
    whisper,
    soundscape,
    store: constitutionalStore,
  };

  return () => {
    cancelAnimationFrame(raf);
    heartbeat.stop();
    whisper.stop();
    soundscape.stop();
    hisses.forEach((h) => h.stop());
    panel.remove();
  };
}
