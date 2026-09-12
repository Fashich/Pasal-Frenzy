import { describe, expect, it } from 'vitest';
import { getRelevance, isAntagonisUnit, pasalWeights } from '@data/pasalWeights.ts';
import {
  computeWordPhysics,
  fontSizeForWeight,
  gravityForIntegrity,
  lexicalComplexity,
} from './wordMass.ts';

describe('pasal-weights.json', () => {
  it('berasal dari korpus UUD dan menandai mkCitations sebagai null', () => {
    expect(pasalWeights.korpus.unit).toBe(203);
    expect(pasalWeights.korpus.kosakata).toBeGreaterThan(800);
    expect(pasalWeights.mkCitations).toBeNull();
    expect(pasalWeights.kata['dan']?.fungsional).toBe(true);
    expect(pasalWeights.kata['kedaulatan']?.fungsional).toBe(false);
    expect(pasalWeights.unit['1-2']?.normatif).toBe(0.95);
    expect(pasalWeights.unit['pembukaan-1']?.normatif).toBe(1);
  });
});

describe('computeWordPhysics', () => {
  it('kata tugas jauh lebih ringan dan lebih elastis daripada kata fundamental', () => {
    const dan = computeWordPhysics('dan', '1-2');
    const kedaulatan = computeWordPhysics('Kedaulatan', '1-2', 'case-1-ham');
    expect(dan.kategori).toBe('fungsional');
    expect(kedaulatan.kategori).toBe('fundamental');
    expect(kedaulatan.mass).toBeGreaterThan(dan.mass * 4);
    expect(dan.restitution).toBeGreaterThan(kedaulatan.restitution);
  });

  it('relevansi bab menambah massa untuk unit yang sama', () => {
    const netral = computeWordPhysics('hajat', '33-2');
    const relevan = computeWordPhysics('hajat', '33-2', 'case-2-pasal33');
    expect(relevan.mass).toBeGreaterThan(netral.mass);
    expect(relevan.komponen.relevansi).toBe(1);
  });

  it('kata tak dikenal tetap mendapat massa masuk akal', () => {
    const p = computeWordPhysics('xyzzy', 'tidak-ada');
    expect(p.mass).toBeGreaterThan(0.3);
    expect(p.mass).toBeLessThan(8);
  });
});

describe('getRelevance / isAntagonisUnit', () => {
  it('memprioritaskan ayat > pasal > bagian', () => {
    expect(getRelevance('case-2-pasal33', '33-2')).toBe(1);
    expect(getRelevance('case-2-pasal33', '23-1')).toBe(0.4);
    expect(getRelevance('prolog', 'pembukaan-3')).toBe(1);
    expect(getRelevance('case-3-perppu', '28A')).toBe(0);
    expect(getRelevance(undefined, '22-1')).toBe(0);
  });

  it('menandai unit antagonis per bab', () => {
    expect(isAntagonisUnit('case-1-ham', '28J-2')).toBe(true);
    expect(isAntagonisUnit('case-1-ham', '28A')).toBe(false);
  });
});

describe('fungsi bantu', () => {
  it('gravitasi naik saat integritas turun', () => {
    expect(gravityForIntegrity(1)).toBeCloseTo(0.35);
    expect(gravityForIntegrity(0)).toBeCloseTo(1.4);
    expect(gravityForIntegrity(0.5)).toBeGreaterThan(gravityForIntegrity(0.9));
  });

  it('ukuran font monoton dan dibatasi 18..40 px', () => {
    expect(fontSizeForWeight(0)).toBe(18);
    expect(fontSizeForWeight(1)).toBeGreaterThan(18);
    expect(fontSizeForWeight(1000)).toBe(40);
  });

  it('kompleksitas leksikal 0..1', () => {
    expect(lexicalComplexity('dan')).toBe(0);
    expect(lexicalComplexity('permusyawaratan')).toBe(1);
    expect(lexicalComplexity('peri-kemanusiaan')).toBe(1);
  });
});
