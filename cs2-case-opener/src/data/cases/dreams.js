import { RARITY } from '../rarities.js';
import { SPECIAL_ITEM_POOLS } from '../knifePools.js';

const skins = [
  { name: 'AK-47 | Nightwish', rarity: RARITY.COVERT, image: 'ak47_nightwish.png', stattrak: true },
  { name: 'MP9 | Starlight Protector', rarity: RARITY.COVERT, image: 'mp9_starlight.png', stattrak: true },
  { name: 'FAMAS | Rapid Eye Movement', rarity: RARITY.CLASSIFIED, image: 'famas_rem.png', stattrak: true },
  { name: 'Dual Berettas | Melondrama', rarity: RARITY.CLASSIFIED, image: 'dualies_melon.png', stattrak: true },
  { name: 'MP7 | Abyssal Apparition', rarity: RARITY.CLASSIFIED, image: 'mp7_abyssal.png', stattrak: true },
  { name: 'G3SG1 | Dream Glade', rarity: RARITY.RESTRICTED, image: 'g3sg1_dreamglade.png', stattrak: true },
  { name: 'M4A1-S | Night Terror', rarity: RARITY.RESTRICTED, image: 'm4a1s_nightterror.png', stattrak: true },
  { name: 'PP-Bizon | Space Cat', rarity: RARITY.RESTRICTED, image: 'ppbizon_spacecat.png', stattrak: true },
  { name: 'USP-S | Ticket to Hell', rarity: RARITY.RESTRICTED, image: 'usps_ticket.png', stattrak: true },
  { name: 'XM1014 | Zombie Offensive', rarity: RARITY.RESTRICTED, image: 'xm1014_zombie.png', stattrak: true },
  { name: 'Five-SeveN | Scrawl', rarity: RARITY.MIL_SPEC, image: 'five7_scrawl.png', stattrak: true },
  { name: 'MAC-10 | Ensnared', rarity: RARITY.MIL_SPEC, image: 'mac10_ensnared.png', stattrak: true },
  { name: 'MAG-7 | Foresight', rarity: RARITY.MIL_SPEC, image: 'mag7_foresight.png', stattrak: true },
  { name: 'MP5-SD | Necro Jr.', rarity: RARITY.MIL_SPEC, image: 'mp5sd_necrojr.png', stattrak: true },
  { name: 'P2000 | Lifted Spirits', rarity: RARITY.MIL_SPEC, image: 'p2000_liftedspirits.png', stattrak: true },
  { name: 'Sawed-Off | Spirit Board', rarity: RARITY.MIL_SPEC, image: 'sawedoff_spiritboard.png', stattrak: true },
  { name: 'SCAR-20 | Poultrygeist', rarity: RARITY.MIL_SPEC, image: 'scar20_poultrygeist.png', stattrak: true },
];

export const dreamsCase = {
  name: 'Dreams & Nightmares Case',
  image: '/assets/images/cases/dreams_case.png',
  specialItemPool: SPECIAL_ITEM_POOLS.dreams,
  skins,
  displayItems: [...skins, ...SPECIAL_ITEM_POOLS.dreams],
};
