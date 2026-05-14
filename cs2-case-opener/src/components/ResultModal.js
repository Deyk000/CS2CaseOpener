import { assetPath } from '../utils/assetPath.js';

export function renderResultModal(result) {
  return {
    rarityText: result.skin.rarity.name,
    rarityColor: result.skin.rarity.color,
    image: assetPath('skins', result.skin.image),
    name: result.skin.name,
    wear: result.wear.name,
    floatValue: result.floatValue,
    isStatTrak: result.isStatTrak,
  };
}
