import { describe, expect, it, vi } from 'vitest';
import { ConstitutionalEventBus } from './ConstitutionalEventBus.ts';

const integrityPayload = {
  value: 0.5,
  previous: 0.6,
  delta: -0.1,
  level: 'tertekan' as const,
  reason: 'tes',
};

describe('ConstitutionalEventBus', () => {
  it('mengirim payload bertipe ke listener dan mencatat riwayat', () => {
    let t = 0;
    const bus = new ConstitutionalEventBus({ now: () => ++t });
    const listener = vi.fn();
    bus.on('CONSTITUTIONAL_INTEGRITY_CHANGED', listener);
    bus.emit('CONSTITUTIONAL_INTEGRITY_CHANGED', integrityPayload);
    expect(listener).toHaveBeenCalledWith(integrityPayload, {
      name: 'CONSTITUTIONAL_INTEGRITY_CHANGED',
      at: 1,
    });
    expect(bus.getHistory()).toHaveLength(1);
    expect(bus.getHistory()[0]?.at).toBe(1);
  });

  it('once hanya dipanggil sekali dan fungsi pelepas bekerja', () => {
    const bus = new ConstitutionalEventBus();
    const once = vi.fn();
    const off = bus.on('AUDIO_UNLOCKED', vi.fn());
    bus.once('AUDIO_UNLOCKED', once);
    bus.emit('AUDIO_UNLOCKED', { at: 1 });
    bus.emit('AUDIO_UNLOCKED', { at: 2 });
    expect(once).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('AUDIO_UNLOCKED')).toBe(1);
    off();
    expect(bus.listenerCount('AUDIO_UNLOCKED')).toBe(0);
  });

  it('error di satu listener tidak menghentikan listener lain', () => {
    const errors: unknown[] = [];
    const bus = new ConstitutionalEventBus({ onListenerError: (e) => errors.push(e) });
    const second = vi.fn();
    bus.on('FRENZY_MODE_ACTIVATED', () => {
      throw new Error('rusak');
    });
    bus.on('FRENZY_MODE_ACTIVATED', second);
    bus.emit('FRENZY_MODE_ACTIVATED', { trigger: 'ambang', integrity: 0.3, cognitiveLoad: 0.8 });
    expect(second).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(1);
  });

  it('riwayat dibatasi historySize', () => {
    const bus = new ConstitutionalEventBus({ historySize: 3 });
    for (let i = 0; i < 5; i++) bus.emit('AUDIO_UNLOCKED', { at: i });
    expect(bus.getHistory().map((r) => (r.payload as { at: number }).at)).toEqual([2, 3, 4]);
  });

  it('waitFor menunggu event yang memenuhi predikat', async () => {
    const bus = new ConstitutionalEventBus();
    const promise = bus.waitFor('CHAPTER_COMPLETED', (p) => p.outcome === 'menang');
    bus.emit('CHAPTER_COMPLETED', {
      chapterId: 'prolog',
      outcome: 'kalah',
      durationMs: 1,
      integrityAtEnd: 0.1,
    });
    bus.emit('CHAPTER_COMPLETED', {
      chapterId: 'prolog',
      outcome: 'menang',
      durationMs: 2,
      integrityAtEnd: 0.9,
    });
    await expect(promise).resolves.toMatchObject({ outcome: 'menang', durationMs: 2 });
    expect(bus.listenerCount('CHAPTER_COMPLETED')).toBe(0);
  });
});
