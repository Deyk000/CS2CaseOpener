import { assetPath } from '../utils/assetPath.js';

const STORAGE_KEY = 'cs2_opener_inventory';

export class Inventory {
  constructor() {
    this.items = this.load();
  }

  add(result) {
    const item = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      skinName: result.skin.name,
      image: result.skin.image,
      rarity: result.skin.rarity,
      wear: result.wear.name,
      floatValue: result.floatValue,
      isStatTrak: result.isStatTrak,
      caseName: result.caseName,
      openedAt: new Date().toISOString(),
    };

    this.items.unshift(item);
    this.save();
    return item;
  }

  addMany(results) {
    for (const result of results) {
      this.add(result);
    }
  }

  clear() {
    this.items = [];
    this.save();
  }

  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
  }

  render(container) {
    if (!this.items.length) {
      container.innerHTML = '<p class="inventory-empty">No items yet. Open some cases.</p>';
      return;
    }

    container.innerHTML = this.items
      .map(
        (item) => `
          <article class="inventory-item" style="border-color:${item.rarity.color}66">
            ${item.isStatTrak ? '<span class="stattrak-badge">ST</span>' : ''}
            <img src="${assetPath('skins', item.image)}" alt="${item.skinName}" />
            <div class="inventory-item-name" style="color:${item.rarity.color}">
              ${item.isStatTrak ? 'StatTrak ' : ''}${item.skinName}
            </div>
            <div class="inventory-item-wear">${item.wear} | ${item.floatValue}</div>
          </article>
        `,
      )
      .join('');
  }
}
