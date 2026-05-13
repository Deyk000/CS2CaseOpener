import { RARITY } from '../rarities.js';
import { SPECIAL_ITEM_POOLS } from '../knifePools.js';

const skins = [
  { name: 'AK-47 | Head Shot', rarity: RARITY.COVERT, image: 'ak47_headshot.png', stattrak: true },
  { name: 'M4A4 | Temukau', rarity: RARITY.COVERT, image: 'm4a4_temukau.png', stattrak: true },
  { name: 'AWP | Duality', rarity: RARITY.CLASSIFIED, image: 'awp_duality.png', stattrak: true },
  { name: 'P2000 | Wicked Sick', rarity: RARITY.CLASSIFIED, image: 'p2000_wickedsick.png', stattrak: true },
  { name: 'UMP-45 | Wild Child', rarity: RARITY.CLASSIFIED, image: 'ump45_wildchild.png', stattrak: true },
  { name: 'Glock-18 | Umbral Rabbit', rarity: RARITY.RESTRICTED, image: 'glock18_umbralrabbit.png', stattrak: true },
  { name: 'M4A1-S | Emphorosaur-S', rarity: RARITY.RESTRICTED, image: 'm4a1s_emphorosaur.png', stattrak: true },
  { name: 'P90 | Neoqueen', rarity: RARITY.RESTRICTED, image: 'p90_neoqueen.png', stattrak: true },
  { name: 'R8 Revolver | Banana Cannon', rarity: RARITY.RESTRICTED, image: 'r8_bananacanon.png', stattrak: true },
  { name: 'MAG-7 | Insomnia', rarity: RARITY.MIL_SPEC, image: 'mag7_insomnia.png', stattrak: true },
  { name: 'MP9 | Featherweight', rarity: RARITY.MIL_SPEC, image: 'mp9_featherweight.png', stattrak: true },
  { name: 'SCAR-20 | Fragments', rarity: RARITY.MIL_SPEC, image: 'scar20_fragments.png', stattrak: true },
  { name: 'SG 553 | Cyberforce', rarity: RARITY.MIL_SPEC, image: 'sg553_cyberforce.png', stattrak: true },
  { name: 'Tec-9 | Rebel', rarity: RARITY.MIL_SPEC, image: 'tec9_rebel.png', stattrak: true },
  { name: 'MAC-10 | Sakkaku', rarity: RARITY.MIL_SPEC, image: 'mac10_sakkaku.png', stattrak: true },
  { name: 'P250 | Re.built', rarity: RARITY.MIL_SPEC, image: 'p250_rebuilt.png', stattrak: true },
];

export const revolutionCase = {
  name: 'Revolution Case',
  image: '/assets/images/cases/revolution_case.png',
  specialItemPool: SPECIAL_ITEM_POOLS.clutch,
  skins,
  displayItems: [...skins, ...SPECIAL_ITEM_POOLS.clutch],
};
