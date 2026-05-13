import { RARITY, WEAR } from '../data/skins.js';

const DROP_RATES = {
  MIL_SPEC: 79.92,
  RESTRICTED: 15.98,
  CLASSIFIED: 3.20,
  COVERT: 0.64,
  KNIFE: 0.26,
};

const STATTRAK_CHANCE = 0.1;

export function rollDrop(caseName, casesData) {
  const caseData = casesData[caseName];
  if (!caseData) {
    throw new Error(`Case "${caseName}" not found`);
  }

  const rolledRarity = rollRarity();
  const pool = getPool(caseData, rolledRarity);
  const skin = pool[Math.floor(Math.random() * pool.length)];
  const wear = rollWear();
  const floatValue = rollFloat(wear);

  return {
    skin,
    wear,
      isStatTrak: Boolean(skin.stattrak) && Math.random() < STATTRAK_CHANCE,
    floatValue: floatValue.toFixed(10),
    caseName,
  };
}

function getPool(caseData, rolledRarity) {
  if (rolledRarity.name === RARITY.KNIFE.name) {
    const specialItemPool = caseData.specialItemPool || caseData.skins.filter((skin) => skin.rarity.name === RARITY.KNIFE.name);
    if (specialItemPool.length > 0) {
      return specialItemPool;
    }
  }

  const exact = caseData.skins.filter((skin) => skin.rarity.name === rolledRarity.name);
  if (exact.length > 0) {
    return exact;
  }

  const fallbackOrder = [
    RARITY.COVERT,
    RARITY.CLASSIFIED,
    RARITY.RESTRICTED,
    RARITY.MIL_SPEC,
    RARITY.INDUSTRIAL,
    RARITY.CONSUMER,
    RARITY.KNIFE,
  ];

  for (const rarity of fallbackOrder) {
    const matches = caseData.skins.filter((skin) => skin.rarity.name === rarity.name);
    if (matches.length > 0) {
      return matches;
    }
  }

  return caseData.skins;
}

function rollRarity() {
  const rarityMap = [
    { rate: DROP_RATES.KNIFE, rarity: RARITY.KNIFE },
    { rate: DROP_RATES.COVERT, rarity: RARITY.COVERT },
    { rate: DROP_RATES.CLASSIFIED, rarity: RARITY.CLASSIFIED },
    { rate: DROP_RATES.RESTRICTED, rarity: RARITY.RESTRICTED },
    { rate: DROP_RATES.MIL_SPEC, rarity: RARITY.MIL_SPEC },
  ];

  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const entry of rarityMap) {
    cumulative += entry.rate;
    if (roll < cumulative) {
      return entry.rarity;
    }
  }

  return RARITY.MIL_SPEC;
}

function rollWear() {
  const wearRoll = Math.random() * 100;
  if (wearRoll < 3) return WEAR.FACTORY_NEW;
  if (wearRoll < 8) return WEAR.MINIMAL_WEAR;
  if (wearRoll < 60) return WEAR.FIELD_TESTED;
  if (wearRoll < 80) return WEAR.WELL_WORN;
  return WEAR.BATTLE_SCARRED;
}

function rollFloat(wear) {
  return wear.min + Math.random() * (wear.max - wear.min);
}
