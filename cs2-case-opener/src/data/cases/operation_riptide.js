import { RARITY } from '../rarities.js';

const skins = [
  { name: 'Fire Serpent', rarity: RARITY.COVERT, image: 'ak47_fire_serpent.png', stattrak: true },
  { name: 'Point Disarray', rarity: RARITY.COVERT, image: 'ak47_point_disarray.png', stattrak: true },
  { name: 'Hydroponic', rarity: RARITY.CLASSIFIED, image: 'ak47_hydroponic.png', stattrak: true },
  { name: 'Phantom Disruptor', rarity: RARITY.CLASSIFIED, image: 'ak47_phantom_blue.png', stattrak: true },
  { name: 'Uncharted', rarity: RARITY.RESTRICTED, image: 'ak47_uncharted_restricted.png', stattrak: true },
  { name: 'Neon Rider', rarity: RARITY.RESTRICTED, image: 'ak47_neon_restricted.png', stattrak: true },
  { name: 'Phantom Disruptor', rarity: RARITY.MIL_SPEC, image: 'ak47_phantom_mil_spec.png', stattrak: true },
  { name: 'Uncharted', rarity: RARITY.MIL_SPEC, image: 'ak47_uncharted_mil_spec.png', stattrak: true },
];

// Create knife pool for Operation Riptide case
const riptideKnives = [
  { name: '★ Navaja Knife | Slaughter', rarity: RARITY.KNIFE, image: 'knife_navaja.png', stattrak: true },
  { name: '★ Paracord Knife | Fade', rarity: RARITY.KNIFE, image: 'knife_paracord.png', stattrak: true },
];

export const operationRiptideCase = {
  name: 'Operation Riptide Case',
  image: '/assets/images/cases/operation_riptide_case.png',
  specialItemPool: riptideKnives,
  skins,
  displayItems: [...skins, ...riptideKnives],
};
