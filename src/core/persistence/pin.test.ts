import { describe, expect, it } from 'vitest';
import { hashPin, makeSalt, validatePin, verifyPin } from './pin.ts';

describe('PIN profil', () => {
  it('validasi: kosong boleh, harus angka, 4-6 digit', () => {
    expect(validatePin('')).toBeNull();
    expect(validatePin('1234')).toBeNull();
    expect(validatePin('123456')).toBeNull();
    expect(validatePin('123')).toMatch(/4-6/);
    expect(validatePin('1234567')).toMatch(/4-6/);
    expect(validatePin('12a4')).toMatch(/angka/);
  });

  it('hash bergantung salt dan bisa diverifikasi', async () => {
    const s1 = makeSalt();
    const s2 = makeSalt();
    expect(s1).not.toBe(s2);
    expect(s1).toHaveLength(32);
    const h1 = await hashPin('1234', s1);
    const h2 = await hashPin('1234', s2);
    expect(h1).not.toBe(h2);
    expect(await verifyPin('1234', { pinHash: h1, pinSalt: s1 })).toBe(true);
    expect(await verifyPin('4321', { pinHash: h1, pinSalt: s1 })).toBe(false);
    expect(await verifyPin(' 1234 ', { pinHash: h1, pinSalt: s1 })).toBe(true);
  });
});
