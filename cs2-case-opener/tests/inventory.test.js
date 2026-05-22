import { describe, it, expect } from 'vitest';
import { computeSalePrice } from '../src/store/inventory.js';

describe('computeSalePrice', () => {
  it('applies the 15% sell tax', () => {
    // 100 EUR base → 85 EUR after 15% tax
    expect(computeSalePrice(100)).toBe(85);
  });

  it('preserves two decimals for cheap items', () => {
    // 1.16 EUR → 0.986 → rounded to 0.99
    expect(computeSalePrice(1.16)).toBe(0.99);
    // 2.47 EUR → 2.0995 → 2.10
    expect(computeSalePrice(2.47)).toBe(2.10);
  });

  it('never returns a negative price', () => {
    expect(computeSalePrice(-5)).toBe(0);
    expect(computeSalePrice(null)).toBe(0);
    expect(computeSalePrice(undefined)).toBe(0);
    expect(computeSalePrice('not a number')).toBe(0);
  });

  it('handles 0 cleanly', () => {
    expect(computeSalePrice(0)).toBe(0);
  });
});
