import { describe, expect, it } from 'vitest';
import { CURSOR_LERP, lerp } from './CustomCursor.ts';

describe('CustomCursor lerp', () => {
  it('cincin mendekati target 10% per frame', () => {
    expect(CURSOR_LERP).toBe(0.1);
    let x = 0;
    for (let i = 0; i < 30; i++) x = lerp(x, 100, CURSOR_LERP);
    expect(x).toBeGreaterThan(95);
    expect(x).toBeLessThan(100);
    expect(lerp(10, 10, 0.1)).toBe(10);
  });
});
