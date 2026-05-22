const RARITY_DATA = {
  consumer: {
    id: 'consumer',
    label: 'Consumer Grade',
    color: '#b0c3d9',
    weight: 7992,
    glowColor: '#d7e2ef',
    soundVariant: 'common',
  },
  industrial: {
    id: 'industrial',
    label: 'Industrial Grade',
    color: '#5e98d9',
    weight: 1598,
    glowColor: '#8db8ea',
    soundVariant: 'common',
  },
  milspec: {
    id: 'milspec',
    label: 'Mil-Spec Grade',
    color: '#4b69ff',
    weight: 361,
    glowColor: '#7d90ff',
    soundVariant: 'common',
  },
  restricted: {
    id: 'restricted',
    label: 'Restricted',
    color: '#8847ff',
    weight: 90,
    glowColor: '#ae86ff',
    soundVariant: 'rare',
  },
  classified: {
    id: 'classified',
    label: 'Classified',
    color: '#d32ce6',
    weight: 32,
    glowColor: '#e66bf0',
    soundVariant: 'rare',
  },
  covert: {
    id: 'covert',
    label: 'Covert',
    color: '#eb4b4b',
    weight: 16,
    glowColor: '#f07c7c',
    soundVariant: 'legendary',
  },
  contraband: {
    id: 'contraband',
    label: 'Contraband',
    color: '#e4ae39',
    weight: 2,
    glowColor: '#efcb72',
    soundVariant: 'legendary',
  },
  extraordinary: {
    id: 'extraordinary',
    label: 'Extraordinary',
    color: '#e4ae39',
    weight: 8,
    glowColor: '#efcb72',
    soundVariant: 'legendary',
  },
  immortal: {
    id: 'immortal',
    label: 'Immortal',
    color: '#e4ae39',
    weight: 8,
    glowColor: '#efcb72',
    soundVariant: 'legendary',
  },
  ancient: {
    id: 'ancient',
    label: 'Ancient',
    color: '#e4ae39',
    weight: 2,
    glowColor: '#efcb72',
    soundVariant: 'legendary',
  },
};

export const RARITY = Object.freeze(RARITY_DATA);

const LABEL_TO_RARITY = new Map(Object.values(RARITY).map((value) => [value.label.toLowerCase(), value]));

export function rarityFromLabel(label) {
  if (!label) {
    return null;
  }

  return LABEL_TO_RARITY.get(String(label).toLowerCase()) ?? null;
}

export function getWeightedRarity(pool) {
  if (!Array.isArray(pool) || pool.length === 0) {
    return null;
  }

  const total = pool.reduce((sum, item) => sum + Math.max(0, Number(item?.weight) || 0), 0);
  if (total <= 0) {
    return pool[0] ?? null;
  }

  const roll = Math.random() * total;
  let cumulative = 0;

  for (const item of pool) {
    cumulative += Math.max(0, Number(item?.weight) || 0);
    if (roll <= cumulative) {
      return item;
    }
  }

  return pool[pool.length - 1] ?? null;
}
