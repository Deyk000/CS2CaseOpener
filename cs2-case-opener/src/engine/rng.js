import { RARITY } from '../data/rarityConfig.js';

function randomHex(size = 16) {
  const bytes = new Uint8Array(size);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function seededFraction(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0xffffffff;
}

export function weightedPick(items) {
  const seed = randomHex(16);
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);

  if (total <= 0) {
    return { seed, result: items[0] ?? null };
  }

  const roll = seededFraction(seed) * total;
  let cumulative = 0;

  for (const item of items) {
    cumulative += Math.max(0, Number(item.weight) || 0);
    if (roll <= cumulative) {
      return { seed, result: item };
    }
  }

  return { seed, result: items[items.length - 1] ?? null };
}

export function generateFloat(minFloat, maxFloat) {
  const min = Number(minFloat) || 0;
  const max = Number(maxFloat) || 0;
  const value = min + Math.random() * Math.max(0, max - min);
  return Number(value.toFixed(6));
}

export function rollStatTrak() {
  return Math.random() < 0.1;
}

export function wearFromFloat(value) {
  const floatValue = Number(value) || 0;

  if (floatValue < 0.07) return 'Factory New';
  if (floatValue < 0.15) return 'Minimal Wear';
  if (floatValue < 0.38) return 'Field-Tested';
  if (floatValue < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
}

export function generateOpenResult(caseData) {
  const availableRarities = new Set();

  for (const item of caseData.items) {
    availableRarities.add(item.rarity);
  }

  if (caseData.specialPool.length > 0) {
    availableRarities.add('extraordinary');
  }

  const pool = Object.values(RARITY).filter((rarity) => availableRarities.has(rarity.id));
  const { seed, result: rarityTier } = weightedPick(pool.length > 0 ? pool : [RARITY.milspec]);

  const selectedPool = rarityTier?.id === 'extraordinary'
    ? caseData.specialPool
    : (caseData.itemsByRarity?.[rarityTier?.id] ?? []);

  const fallbackPool = selectedPool.length > 0 ? selectedPool : caseData.items;
  const item = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  const floatValue = generateFloat(item.minFloat, item.maxFloat);
  const wear = wearFromFloat(floatValue);

  return {
    item,
    wear,
    float: floatValue,
    statTrak: Boolean(item.statTrakEligible) && rollStatTrak(),
    seed,
    timestamp: Date.now(),
  };
}
