import { RARITY } from '../rarities.js';
import { SPECIAL_ITEM_POOLS } from '../knifePools.js';

const skins = [
  { name: 'Glock-18 Wasteland Rebel', rarity: RARITY.COVERT, image: 'glock_wasteland_rebel.png', stattrak: true },
  { name: 'P250 Nuclear Threat', rarity: RARITY.COVERT, image: 'p250_nuclear_threat.png', stattrak: true },
  { name: 'AK-47 Phantom Disruptor', rarity: RARITY.CLASSIFIED, image: 'ak47_phantom_disruptor.png', stattrak: true },
  { name: 'M4A4 Phantom Disruptor', rarity: RARITY.CLASSIFIED, image: 'm4a4_phantom_disruptor.png', stattrak: true },
  { name: 'AWP Containment Breach', rarity: RARITY.RESTRICTED, image: 'awp_containment_breach.png', stattrak: true },
  { name: 'USP-S Phantom Disruptor', rarity: RARITY.RESTRICTED, image: 'usps_phantom_disruptor.png', stattrak: true },
  { name: 'MP7 Nemesis', rarity: RARITY.MIL_SPEC, image: 'mp7_nemesis.png', stattrak: true },
  { name: 'FAMAS Djinn', rarity: RARITY.MIL_SPEC, image: 'famas_djinn.png', stattrak: true },
];

// Create knife pool for Prisma case
const prismaKnives = [
  { name: '★ Stiletto Knife | Slaughter', rarity: RARITY.KNIFE, image: 'knife_stiletto.png', stattrak: true },
  { name: '★ Ursus Knife | Urban Masked', rarity: RARITY.KNIFE, image: 'knife_ursus.png', stattrak: true },
];

export const prismaCase = {
  name: 'Prisma Case',
  image: '/assets/images/cases/prisma_case.png',
  specialItemPool: prismaKnives,
  skins,
  displayItems: [...skins, ...prismaKnives],
};
