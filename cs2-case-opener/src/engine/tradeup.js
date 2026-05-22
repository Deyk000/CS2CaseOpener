import { CASES } from '../data/cases.js';
import { weightedPick } from './rng.js';

const TIER_ORDER = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert'];

function nextTier(rarity) {
  const index = TIER_ORDER.indexOf(rarity);
  return index >= 0 ? TIER_ORDER[index + 1] ?? null : null;
}

export function validateTradeUp(items) {
  if (!Array.isArray(items) || items.length !== 10) {
    return { valid: false, reason: 'Trade-up requires exactly 10 items.' };
  }

  const rarity = items[0]?.rarity;
  if (!rarity) {
    return { valid: false, reason: 'Missing rarity.' };
  }

  if (!items.every((item) => item.rarity === rarity)) {
    return { valid: false, reason: 'All 10 items must share the same rarity.' };
  }

  if (rarity === 'contraband') {
    return { valid: false, reason: 'Contraband items cannot be traded up.' };
  }

  // extraordinary (knives/gloves) is allowed — treated as a same-tier forge,
  // mirroring the existing Knife → Knife mechanic in the UI.

  return { valid: true };
}

// True when the trade-up keeps the same rarity (knife/glove forge) rather
// than climbing a tier.
function isSameTier(rarity) {
  return rarity === 'extraordinary';
}

// Pull candidates from a case for the resulting tier. For same-tier forges
// (knives/gloves) that means the case's `specialPool`; otherwise the regular
// item list filtered to the next-tier rarity.
function candidatesFromCase(caseData, sourceRarity, resultRarity) {
  if (isSameTier(sourceRarity)) {
    return caseData.specialPool ?? [];
  }
  return (caseData.items ?? []).filter((it) => it.rarity === resultRarity);
}

// Returns a list of every possible output skin with its drop probability,
// based on which cases the 10 input items came from. Used for the live
// preview in the trade-up panel — doesn't roll the RNG.
export function previewTradeUp(items) {
  if (!Array.isArray(items) || items.length === 0) return { resultRarity: null, outputs: [] };
  const rarity = items[0]?.rarity;
  // Same-tier forge for knives/gloves; otherwise climb one tier.
  const resultRarity = isSameTier(rarity) ? rarity : nextTier(rarity);
  if (!resultRarity) return { resultRarity: null, outputs: [] };

  // Count input cases (each input case contributes weight 1 per occurrence).
  const caseWeights = new Map();
  for (const it of items) {
    const k = it.caseName ?? 'unknown';
    caseWeights.set(k, (caseWeights.get(k) ?? 0) + 1);
  }

  // Build the candidate pool, weighted by how many of its case's items the
  // user contributed.
  const pool = CASES.flatMap((caseData) =>
    candidatesFromCase(caseData, rarity, resultRarity)
      .map((it) => ({ item: it, weight: caseWeights.get(caseData.name) ?? 0 })),
  ).filter((entry) => entry.weight > 0);

  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  if (totalWeight === 0) return { resultRarity, outputs: [] };

  // Each candidate inside a given case shares that case's weight equally.
  // Group by case so the per-item probability is weight / itemsInThatCase.
  const itemsPerCase = new Map();
  for (const entry of pool) {
    const c = entry.item.caseName;
    itemsPerCase.set(c, (itemsPerCase.get(c) ?? 0) + 1);
  }

  const outputs = pool.map((entry) => {
    const denom = itemsPerCase.get(entry.item.caseName) || 1;
    const prob = (entry.weight / totalWeight) / denom;
    return { item: entry.item, probability: prob };
  });
  // Sort high → low.
  outputs.sort((a, b) => b.probability - a.probability);
  return { resultRarity, outputs };
}

export function executeTradeUp(items) {
  const validation = validateTradeUp(items);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const sourceRarity = items[0].rarity;
  const resultRarity = isSameTier(sourceRarity) ? sourceRarity : nextTier(sourceRarity);
  if (!resultRarity) {
    throw new Error('No higher rarity available.');
  }

  const candidatePool = CASES.flatMap((caseData) => candidatesFromCase(caseData, sourceRarity, resultRarity));
  const caseWeights = new Map();

  for (const item of items) {
    caseWeights.set(item.caseName ?? 'unknown', (caseWeights.get(item.caseName ?? 'unknown') ?? 0) + 1);
  }

  const weightedPool = candidatePool.map((item) => ({
    ...item,
    weight: caseWeights.get(item.caseName ?? 'unknown') ?? 1,
  }));

  const { seed, result } = weightedPick(weightedPool.length > 0 ? weightedPool : candidatePool.map((item) => ({ ...item, weight: 1 })));

  return {
    inputItems: items,
    resultItem: result ?? candidatePool[0] ?? null,
    resultRarity,
    statTrak: items.every((item) => item.statTrak),
    seed,
  };
}
