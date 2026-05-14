import { RARITY } from '../rarities.js';
import { SPECIAL_ITEM_POOLS } from '../knifePools.js';
import { assetPath } from '../../utils/assetPath.js';

const skins = [
  { name: 'AWP | Chromatic Aberration', rarity: RARITY.COVERT, image: 'awp_chromatic_aberration.png', stattrak: true },
  { name: 'USP-S | Printstream', rarity: RARITY.COVERT, image: 'usp_s_printstream.png', stattrak: true },
  { name: 'AK-47 | Ice Coaled', rarity: RARITY.CLASSIFIED, image: 'ak47_ice_coaled.png', stattrak: true },
  { name: 'P250 | Visions', rarity: RARITY.CLASSIFIED, image: 'p250_visions.png', stattrak: true },
  { name: 'Sawed-Off | Kiss♥Love', rarity: RARITY.CLASSIFIED, image: 'sawedoff_kiss_love.png', stattrak: true },
  { name: 'R8 Revolver | Crazy 8', rarity: RARITY.RESTRICTED, image: 'r8_revolver_crazy_8.png', stattrak: true },
  { name: 'M249 | Downtown', rarity: RARITY.RESTRICTED, image: 'm249_downtown.png', stattrak: true },
  { name: 'SG 553 | Dragon Tech', rarity: RARITY.RESTRICTED, image: 'sg553_dragon_tech.png', stattrak: true },
  { name: 'P90 | Vent Rush', rarity: RARITY.RESTRICTED, image: 'p90_vent_rush.png', stattrak: true },
  { name: 'Dual Berettas | Flora Carnivora', rarity: RARITY.RESTRICTED, image: 'dual_berettas_flora_carnivora.png', stattrak: true },
  { name: 'FAMAS | Meow 36', rarity: RARITY.MIL_SPEC, image: 'famas_meow36.png', stattrak: true },
  { name: 'Galil AR | Destroyer', rarity: RARITY.MIL_SPEC, image: 'galil_ar_destroyer.png', stattrak: true },
  { name: 'M4A4 | Poly Mag', rarity: RARITY.MIL_SPEC, image: 'm4a4_poly_mag.png', stattrak: true },
  { name: 'MAC-10 | Monkeyflage', rarity: RARITY.MIL_SPEC, image: 'mac10_monkeyflage.png', stattrak: true },
  { name: 'Negev | Drop Me', rarity: RARITY.MIL_SPEC, image: 'negev_drop_me.png', stattrak: true },
  { name: 'UMP-45 | Roadblock', rarity: RARITY.MIL_SPEC, image: 'ump45_roadblock.png', stattrak: true },
  { name: 'Glock-18 | Winterized', rarity: RARITY.MIL_SPEC, image: 'glock_winterized.png', stattrak: true },
];

export const recoilCase = {
  name: 'Recoil Case',
  image: assetPath('cases', 'recoil_case.png'),
  specialItemPool: SPECIAL_ITEM_POOLS.recoil,
  skins,
  displayItems: [...skins, ...SPECIAL_ITEM_POOLS.recoil],
};
