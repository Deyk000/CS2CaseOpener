import { RARITY } from '../rarities.js';
import { SPECIAL_ITEM_POOLS } from '../knifePools.js';
import { assetPath } from '../../utils/assetPath.js';

const skins = [
  { name: 'AWP Dragon Lore', rarity: RARITY.COVERT, image: 'awp_dragon_lore.png', stattrak: true },
  { name: 'M4A1-S Knight', rarity: RARITY.COVERT, image: 'm4a1s_knight.png', stattrak: true },
  { name: 'Karambit Gamma', rarity: RARITY.CLASSIFIED, image: 'karambit_gamma.png', stattrak: true },
  { name: 'M9 Bayonet Doppler', rarity: RARITY.CLASSIFIED, image: 'm9_bayonet_doppler.png', stattrak: true },
  { name: 'Butterfly Knife Fade', rarity: RARITY.RESTRICTED, image: 'butterfly_knife_fade.png', stattrak: true },
  { name: 'Flip Knife Marble Fade', rarity: RARITY.RESTRICTED, image: 'flip_knife_marble_fade.png', stattrak: true },
  { name: 'Huntsman Knife Night', rarity: RARITY.MIL_SPEC, image: 'huntsman_knife_night.png', stattrak: true },
  { name: 'Bowie Knife Safari Mesh', rarity: RARITY.MIL_SPEC, image: 'bowie_knife_safari_mesh.png', stattrak: true },
];

// Create a knife pool for Falchion case
const falchionKnives = [
  { name: '★ Talon Knife | Doppler', rarity: RARITY.KNIFE, image: 'knife_talon.png', stattrak: true },
  { name: '★ Falchion Knife | Slaughter', rarity: RARITY.KNIFE, image: 'knife_falchion.png', stattrak: true },
];

export const falchionCase = {
  name: 'Falchion Case',
  image: assetPath('cases', 'falchion_case.png'),
  specialItemPool: falchionKnives,
  skins,
  displayItems: [...skins, ...falchionKnives],
};
