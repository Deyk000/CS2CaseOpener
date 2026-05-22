import { beforeEach, describe, it, expect, vi } from 'vitest';

beforeEach(async () => {
  // Reset the module-scoped state by re-importing with cache busted.
  vi.resetModules();
  // Use an in-memory localStorage stub for Node.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
});

describe('history store', () => {
  it('records a result with all expected fields', async () => {
    const { recordOpenResult, getRecent } = await import('../src/store/history.js');
    recordOpenResult({
      item: { name: 'AK-47 | Inheritance', image: 'ak.png', rarity: 'covert', basePrice: 47.95 },
      wear: 'Field-Tested',
      statTrak: false,
      timestamp: 1000,
    }, 'Kilowatt Case');
    const recent = getRecent(10);
    expect(recent).toHaveLength(1);
    expect(recent[0].itemName).toBe('AK-47 | Inheritance');
    expect(recent[0].caseName).toBe('Kilowatt Case');
    expect(recent[0].basePrice).toBe(47.95);
    expect(recent[0].rarity).toBe('covert');
  });

  it('caps the ring buffer at 100 entries', async () => {
    const { recordOpenResult, getAll } = await import('../src/store/history.js');
    for (let i = 0; i < 105; i += 1) {
      recordOpenResult({
        item: { name: `Skin ${i}`, image: '', rarity: 'milspec', basePrice: 1 },
        wear: 'Field-Tested',
        statTrak: false,
        timestamp: i,
      }, 'Test');
    }
    expect(getAll()).toHaveLength(100);
  });

  it('getBestDrop returns the highest-priced entry in the window', async () => {
    const { recordOpenResult, getBestDrop } = await import('../src/store/history.js');
    recordOpenResult({ item: { name: 'Cheap', rarity: 'milspec', basePrice: 1 }, wear: 'FT', timestamp: Date.now() }, '');
    recordOpenResult({ item: { name: 'Expensive', rarity: 'covert', basePrice: 200 }, wear: 'FT', timestamp: Date.now() }, '');
    recordOpenResult({ item: { name: 'Mid', rarity: 'classified', basePrice: 50 }, wear: 'FT', timestamp: Date.now() }, '');
    const best = getBestDrop();
    expect(best.itemName).toBe('Expensive');
    expect(best.basePrice).toBe(200);
  });

  it('getBestDrop respects sinceMs window', async () => {
    const { recordOpenResult, getBestDrop } = await import('../src/store/history.js');
    const now = Date.now();
    // Old (8 days ago) but most expensive
    recordOpenResult({ item: { name: 'Old Gold', rarity: 'covert', basePrice: 500 }, wear: 'FT', timestamp: now - 8 * 24 * 3600 * 1000 }, '');
    // Recent but cheaper
    recordOpenResult({ item: { name: 'Recent', rarity: 'classified', basePrice: 50 }, wear: 'FT', timestamp: now - 60 * 1000 }, '');
    const best = getBestDrop({ sinceMs: 7 * 24 * 3600 * 1000 });
    expect(best.itemName).toBe('Recent');
  });
});
