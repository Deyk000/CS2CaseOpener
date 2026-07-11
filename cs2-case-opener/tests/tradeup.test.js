import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/data/cases.js', () => ({
  CASES: [
    {
      name: 'Mock Case Alpha',
      items: [
        { name: 'Alpha M1', rarity: 'milspec', caseName: 'Mock Case Alpha', basePrice: 1.2, image: '' },
        { name: 'Alpha M2', rarity: 'milspec', caseName: 'Mock Case Alpha', basePrice: 1.3, image: '' },
        { name: 'Alpha R1', rarity: 'restricted', caseName: 'Mock Case Alpha', basePrice: 3.5, image: '' },
      ],
      specialPool: [],
    },
  ],
}));

describe('previewTradeUp', () => {
  it('probabilities sum to ~100% for a valid 10-item contract', async () => {
    const { previewTradeUp } = await import('../src/engine/tradeup.js');

    const inputs = Array.from({ length: 10 }, (_, i) => ({
      uid: `input-${i}`,
      caseName: 'Mock Case Alpha',
      rarity: 'milspec',
      basePrice: 1.2,
      statTrak: false,
      name: 'Alpha M1',
    }));

    const preview = previewTradeUp(inputs);
    expect(preview.resultRarity).toBe('restricted');
    expect(preview.outputs.length).toBeGreaterThan(0);

    const sum = preview.outputs.reduce((acc, out) => acc + out.probability, 0);
    expect(sum).toBeGreaterThan(0.999999);
    expect(sum).toBeLessThan(1.000001);

    for (const output of preview.outputs) {
      expect(output.probability).toBeGreaterThan(0);
      expect(output.probability).toBeLessThanOrEqual(1);
    }
  });
});
