import { RARITY } from '../rarities.js';
import { assetPath } from '../../utils/assetPath.js';

const skins = [
  { name: 'Dragon Lore', rarity: RARITY.COVERT, image: 'ak47_dragon_lore.png', stattrak: true },
  { name: 'Howl', rarity: RARITY.COVERT, image: 'awp_howl.png', stattrak: true },
  { name: 'Worm God', rarity: RARITY.CLASSIFIED, image: 'ak47_worm_god.png', stattrak: true },
  { name: 'Phantom Disruptor', rarity: RARITY.CLASSIFIED, image: 'ak47_phantom.png', stattrak: true },
  { name: 'Aquamarine Revenge', rarity: RARITY.RESTRICTED, image: 'ak47_aquamarine.png', stattrak: true },
  { name: 'Neon Rider', rarity: RARITY.RESTRICTED, image: 'ak47_neon_rider.png', stattrak: true },
  { name: 'Phantom Disruptor', rarity: RARITY.MIL_SPEC, image: 'ak47_phantom_disruptor_blue.png', stattrak: true },
  { name: 'Uncharted', rarity: RARITY.MIL_SPEC, image: 'ak47_uncharted.png', stattrak: true },
];

// Create knife pool for Chroma case
const chromaKnives = [
  { name: '★ Gut Knife | Doppler', rarity: RARITY.KNIFE, image: 'knife_gut.png', stattrak: true },
  { name: '★ Shadow Daggers | Fade', rarity: RARITY.KNIFE, image: 'knife_shadow.png', stattrak: true },
];

export const chromaCase = {
  name: 'Chroma Case',
  image: assetPath('cases', 'chroma_case.png'),
  specialItemPool: chromaKnives,
  skins,
  displayItems: [...skins, ...chromaKnives],
};
