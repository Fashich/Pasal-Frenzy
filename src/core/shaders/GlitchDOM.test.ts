import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConstitutionalEventBus } from '@core/engine/ConstitutionalEventBus.ts';
import { corruptTitle, GlitchDOMEffect, stageForIntegrity } from './GlitchDOM.ts';

describe('stageForIntegrity', () => {
  it('memetakan ambang PRD 0.40 / 0.30 / 0.20 / 0.10', () => {
    expect(stageForIntegrity(1)).toBe(0);
    expect(stageForIntegrity(0.4)).toBe(0);
    expect(stageForIntegrity(0.39)).toBe(1);
    expect(stageForIntegrity(0.29)).toBe(2);
    expect(stageForIntegrity(0.19)).toBe(3);
    expect(stageForIntegrity(0.05)).toBe(4);
  });
});

describe('corruptTitle', () => {
  it('deterministik per seed dan mempertahankan teks asli sebagai subsekuens', () => {
    const a = corruptTitle('Pasal Frenzy', 0.5, 42);
    const b = corruptTitle('Pasal Frenzy', 0.5, 42);
    expect(a).toBe(b);
    expect(a).not.toBe('Pasal Frenzy');
    const stripped = Array.from(a)
      .filter((ch) => 'Pasal Frenzy'.includes(ch))
      .join('');
    expect(stripped).toBe('Pasal Frenzy');
    expect(corruptTitle('Pasal Frenzy', 0, 1)).toBe('Pasal Frenzy');
  });
});

describe('GlitchDOMEffect', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.title = 'Pasal Frenzy';
    document.body.innerHTML = '';
  });

  it('tahap 1 mengubah judul secara periodik (>= 1.2 s) dan restore mengembalikannya', () => {
    vi.useFakeTimers();
    document.title = 'Pasal Frenzy';
    const bus = new ConstitutionalEventBus();
    const start = vi.fn();
    const stop = vi.fn();
    bus.on('BROWSER_CORRUPTION_START', start);
    bus.on('BROWSER_CORRUPTION_STOP', stop);
    const fx = new GlitchDOMEffect({ bus, wrapper: null, reducedMotion: true });

    fx.applyIntegrity(0.35);
    expect(fx.currentStage).toBe(1);
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 1, integrity: 0.35 }),
      expect.anything(),
    );
    const titles = new Set<string>();
    for (let i = 0; i < 12; i++) {
      vi.advanceTimersByTime(1200);
      titles.add(document.title);
    }
    expect(titles.size).toBeGreaterThan(1);

    fx.applyIntegrity(0.9);
    expect(fx.currentStage).toBe(0);
    expect(document.title).toBe('Pasal Frenzy');
    expect(stop).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'pulih' }),
      expect.anything(),
    );
  });

  it('tahap 2 menambah scrollbar palsu dan menghapusnya saat restore', () => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    const fx = new GlitchDOMEffect({ bus: new ConstitutionalEventBus(), wrapper });
    fx.applyIntegrity(0.25);
    expect(fx.currentStage).toBe(2);
    expect(document.querySelector('.pf-glitch-scrollbar')).not.toBeNull();
    fx.restore();
    expect(document.querySelector('.pf-glitch-scrollbar')).toBeNull();
    expect(fx.currentStage).toBe(0);
  });

  it('tahap 4 mengaktifkan semua efek dan dispose membersihkan seluruhnya', () => {
    vi.useFakeTimers();
    const wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    const bus = new ConstitutionalEventBus();
    const stop = vi.fn();
    bus.on('BROWSER_CORRUPTION_STOP', stop);
    const fx = new GlitchDOMEffect({ bus, wrapper });
    fx.applyIntegrity(0.05);
    expect(fx.currentStage).toBe(4);
    expect(document.documentElement.style.overflowX).toBe('hidden');
    fx.dispose();
    expect(document.documentElement.style.overflowX).toBe('');
    expect(document.querySelector('.pf-glitch-scrollbar')).toBeNull();
    expect(stop).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'bab-selesai' }),
      expect.anything(),
    );
  });
});
