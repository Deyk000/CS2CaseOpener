import { RARITY } from '../rarities.js';
import { SPECIAL_ITEM_POOLS } from '../knifePools.js';

const skins = [
  { name: 'AK-47 | Inheritance', rarity: RARITY.COVERT, image: 'ak47_inheritance.png', stattrak: true },
  { name: 'AWP | Chrome Cannon', rarity: RARITY.COVERT, image: 'awp_chrome.png', stattrak: true },
  { name: 'M4A1-S | Black Lotus', rarity: RARITY.CLASSIFIED, image: 'm4a1s_blacklotus.png', stattrak: true },
  { name: 'USP-S | Jawbreaker', rarity: RARITY.CLASSIFIED, image: 'usps_jawbreaker.png', stattrak: true },
  { name: 'Zeus x27 | Olympus', rarity: RARITY.RESTRICTED, image: 'zeus_olympus.png', stattrak: false },
  { name: 'Five-SeveN | Hybrid', rarity: RARITY.RESTRICTED, image: 'five7_hybrid.png', stattrak: true },
  { name: 'Glock-18 | Block-18', rarity: RARITY.RESTRICTED, image: 'glock18_block18.png', stattrak: true },
  { name: 'MP7 | Just Smile', rarity: RARITY.RESTRICTED, image: 'mp7_justsmile.png', stattrak: true },
  { name: 'Sawed-Off | Analog Input', rarity: RARITY.RESTRICTED, image: 'sawedoff_analog.png', stattrak: true },
  { name: 'SSG 08 | Dezastre', rarity: RARITY.RESTRICTED, image: 'ssg08_dezastre.png', stattrak: true },
  { name: 'Dual Berettas | Hideout', rarity: RARITY.MIL_SPEC, image: 'dualberettas_hideout.png', stattrak: true },
  { name: 'MAC-10 | Light Box', rarity: RARITY.MIL_SPEC, image: 'mac10_lightbox.png', stattrak: true },
  { name: 'Nova | Dark Sigil', rarity: RARITY.MIL_SPEC, image: 'nova_darksigil.png', stattrak: true },
  { name: 'Tec-9 | Slag', rarity: RARITY.MIL_SPEC, image: 'tec9_slag.png', stattrak: true },
  { name: 'UMP-45 | Motorized', rarity: RARITY.MIL_SPEC, image: 'ump45_motorized.png', stattrak: true },
  { name: 'XM1014 | Irezumi', rarity: RARITY.MIL_SPEC, image: 'xm1014_irezumi.png', stattrak: true },
  { name: 'M249 | Hypnosis', rarity: RARITY.MIL_SPEC, image: 'm249_hypnosis.png', stattrak: true },
];

export const kilowattCase = {
  name: 'Kilowatt Case',
  image: '/assets/images/cases/kilowatt_case.png',
  specialItemPool: SPECIAL_ITEM_POOLS.kukri,
  skins,
  displayItems: [...skins, ...SPECIAL_ITEM_POOLS.kukri],
};
