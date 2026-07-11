import { describe, it, expect } from 'vitest';
import { buildInventoryViewModel } from '../src/ui/inventory.js';

function makeItem(i) {
  const rarityCycle = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert'];
  return {
    uid: `item-${i}`,
    name: `Test Skin ${i}`,
    weapon: `Weapon ${i % 11}`,
    finish: `Finish ${i % 17}`,
    rarity: rarityCycle[i % rarityCycle.length],
    basePrice: 0.2 + ((i % 200) * 0.03),
    float: (i % 1000) / 1000,
    openedAt: 1_700_000_000_000 + i,
  };
}

describe('inventory view-model performance', () => {
  it('builds a large filtered/sorted view within budget', () => {
    const items = Array.from({ length: 1500 }, (_, i) => makeItem(i));

    // Warm up to reduce one-time JIT effects before timing.
    for (let i = 0; i < 5; i += 1) {
      buildInventoryViewModel(items, {
        search: 'weapon 3',
        rarityFilter: 'all',
        sort: 'value_desc',
        visibleCount: 120,
      });
    }

    const runs = [];
    for (let i = 0; i < 25; i += 1) {
      const start = performance.now();
      buildInventoryViewModel(items, {
        search: `weapon ${i % 7}`,
        rarityFilter: i % 2 === 0 ? 'all' : 'classified',
        sort: i % 3 === 0 ? 'value_desc' : 'recent',
        visibleCount: 120,
      });
      runs.push(performance.now() - start);
    }

    runs.sort((a, b) => a - b);
    const median = runs[Math.floor(runs.length / 2)];

    expect(median).toBeLessThan(16);
  });
});
