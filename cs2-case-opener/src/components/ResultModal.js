export function renderResultModal(result) {
  return {
    rarityText: result.skin.rarity.name,
    rarityColor: result.skin.rarity.color,
    image: `/assets/images/skins/${result.skin.image}`,
    name: result.skin.name,
    wear: result.wear.name,
    floatValue: result.floatValue,
    isStatTrak: result.isStatTrak,
  };
}
