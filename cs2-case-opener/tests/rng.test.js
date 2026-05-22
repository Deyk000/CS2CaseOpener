import { describe, it, expect } from 'vitest';
import { weightedPick, wearFromFloat, generateFloat } from '../src/engine/rng.js';

describe('weightedPick', () => {
  it('respects weights within ±3% over 10k samples', () => {
    const items = [
      { id: 'a', weight: 70 },
      { id: 'b', weight: 25 },
      { id: 'c', weight: 5 },
    ];
    const counts = { a: 0, b: 0, c: 0 };
    const iterations = 10_000;
    for (let i = 0; i < iterations; i += 1) {
      const { result } = weightedPick(items);
      counts[result.id] += 1;
    }
    // weightedPick uses a deterministic hash of a per-call random seed, so the
    // empirical distribution should match the weights closely.
    expect(counts.a / iterations).toBeGreaterThan(0.67);
    expect(counts.a / iterations).toBeLessThan(0.73);
    expect(counts.b / iterations).toBeGreaterThan(0.22);
    expect(counts.b / iterations).toBeLessThan(0.28);
    expect(counts.c / iterations).toBeGreaterThan(0.02);
    expect(counts.c / iterations).toBeLessThan(0.08);
  });

  it('returns the only item when all-but-one weight is zero', () => {
    const items = [
      { id: 'a', weight: 0 },
      { id: 'b', weight: 1 },
      { id: 'c', weight: 0 },
    ];
    for (let i = 0; i < 50; i += 1) {
      const { result } = weightedPick(items);
      expect(result.id).toBe('b');
    }
  });
});

describe('wearFromFloat', () => {
  // Boundaries straight from rng.js — if anyone changes them, this trips.
  it.each([
    [0,        'Factory New'],
    [0.0699,   'Factory New'],
    [0.07,     'Minimal Wear'],
    [0.1499,   'Minimal Wear'],
    [0.15,     'Field-Tested'],
    [0.3799,   'Field-Tested'],
    [0.38,     'Well-Worn'],
    [0.4499,   'Well-Worn'],
    [0.45,     'Battle-Scarred'],
    [1,        'Battle-Scarred'],
  ])('float %f -> %s', (value, expected) => {
    expect(wearFromFloat(value)).toBe(expected);
  });
});

describe('generateFloat', () => {
  it('stays within [min, max]', () => {
    for (let i = 0; i < 200; i += 1) {
      const v = generateFloat(0.1, 0.4);
      expect(v).toBeGreaterThanOrEqual(0.1);
      expect(v).toBeLessThanOrEqual(0.4);
    }
  });

  it('returns 6-decimal precision', () => {
    const v = generateFloat(0, 1);
    expect(v.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(6);
  });
});
