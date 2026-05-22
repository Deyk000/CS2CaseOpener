import { assetPath } from '../utils/assetPath.js';
import { RARITY } from './rarityConfig.js';
import RAW_CASES from './cases.generated.json';
import { PRICES } from './prices.generated.js';
import { KEY_COST } from './economy.js';

// Used only when a skin is missing from the generated price map (shouldn't
// happen after `npm run sync:prices`, but keeps the app functional offline).
const FALLBACK_PRICE_BY_RARITY = {
  consumer: 0.5,
  industrial: 1,
  milspec: 2,
  restricted: 10,
  classified: 40,
  covert: 200,
  extraordinary: 500,
  contraband: 500,
  ancient: 500,
};

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseWeapon(name) {
  if (!name.includes('|')) {
    return name.replace(/^★\s*/u, '').trim();
  }
  return name.split('|')[0].replace(/^★\s*/u, '').trim();
}

function parseFinish(name) {
  if (!name.includes('|')) {
    return name.replace(/^★\s*/u, '').trim();
  }
  return name.split('|')[1].replace(/^\s*/u, '').trim();
}

function convertItem(caseName, item, isSpecial = false) {
  const rarityId = item.rarityId ?? (isSpecial ? 'extraordinary' : 'milspec');
  const displayName = item.fullName || item.name;
  const weapon = parseWeapon(displayName);
  const finish = parseFinish(displayName);
  const fileName = String(item.image || '').replace(/\.(png|jpg|jpeg|webp)$/i, '.png');
  const marketPrice = PRICES[displayName] ?? FALLBACK_PRICE_BY_RARITY[rarityId] ?? 1;

  return {
    id: slugify(`${caseName}_${weapon}_${finish}`),
    name: displayName.includes('|') ? displayName : `${weapon} | ${finish}`,
    weapon,
    finish,
    rarity: rarityId,
    image: assetPath('skins', fileName),
    statTrakEligible: item.stattrak !== false,
    minFloat: 0.0,
    maxFloat: 1.0,
    basePrice: marketPrice,
    caseName,
  };
}

function convertCase(rawCase) {
  const caseName = rawCase.name;
  const caseId = slugify(caseName);
  const items = (rawCase.skins ?? []).map((item) => convertItem(caseName, item));
  const specialPool = (rawCase.specialPool ?? []).map((item) => convertItem(caseName, item, true));

  // Pre-bucket items by rarity so rng.js doesn't have to filter on every spin.
  const itemsByRarity = {};
  for (const it of items) {
    (itemsByRarity[it.rarity] ??= []).push(it);
  }
  for (const key of Object.keys(itemsByRarity)) {
    Object.freeze(itemsByRarity[key]);
  }

  const imageFile = rawCase.image || `${caseId}.png`;
  return Object.freeze({
    id: caseId,
    name: caseName,
    image: assetPath('cases', imageFile),
    keyPrice: KEY_COST,
    items,
    itemsByRarity: Object.freeze(itemsByRarity),
    specialPool,
    guaranteedRules: [],
  });
}

export const CASES = Object.freeze(RAW_CASES.map(convertCase));

export function getCaseById(id) {
  if (!id) return null;
  return CASES.find((entry) => entry.id === id || entry.name === id) ?? null;
}

export function getAllCaseIds() {
  return CASES.map((entry) => entry.id);
}

export function buildImageMap() {
  return CASES.flatMap((caseData) => [
    {
      fileName: `${caseData.id}.png`,
      kind: 'case',
      caseName: caseData.name,
      displayName: caseData.name,
      rarity: 'case',
      targetPaths: [`public/assets/images/cases/${caseData.id}.png`, `dist/assets/images/cases/${caseData.id}.png`],
    },
    ...[...caseData.items, ...caseData.specialPool].map((item) => ({
      fileName: `${slugify(`${item.weapon}_${item.finish}`)}.png`,
      kind: 'skin',
      caseName: caseData.name,
      displayName: item.name,
      rarity: RARITY[item.rarity]?.label ?? item.rarity,
      targetPaths: [
        `public/assets/images/skins/${slugify(`${item.weapon}_${item.finish}`)}.png`,
        `dist/assets/images/skins/${slugify(`${item.weapon}_${item.finish}`)}.png`,
      ],
    })),
  ]);
}
