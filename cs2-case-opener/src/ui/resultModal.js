import { formatFloat } from '../utils/format.js';
import { computeSalePrice } from '../store/inventory.js';
import { focusTrap } from '../utils/focusTrap.js';

let currentTrap = null;

const RARITY_COLOR = {
  consumer: '#b0c3d9',
  industrial: '#5e98d9',
  milspec: '#4b69ff',
  restricted: '#8847ff',
  classified: '#d32ce6',
  covert: '#eb4b4b',
  extraordinary: '#e4ae39',
};

function formatPrice(value) {
  return `€${(Number(value) || 0).toFixed(2)}`;
}

export function renderResultModal(container, result, actions = {}) {
  const rarityColor = RARITY_COLOR[result.item.rarity] ?? '#e4ae39';
  const rarityLabel = String(result.item.rarity).toUpperCase();
  const salePrice = computeSalePrice(result.item.basePrice);

  container.innerHTML = `
    <div class="modal-content result-modal-content" role="dialog" aria-modal="true" aria-labelledby="result-name" aria-describedby="result-sell">
      <div class="rarity-banner" style="background:${rarityColor}22;color:${rarityColor}">${rarityLabel}</div>
      <div class="result-layout">
        <div class="result-art">
          <img class="result-image" src="${result.item.image}" alt="${result.item.name}" />
        </div>
        <div class="result-details">
          <div id="result-name" class="result-name" style="color:${rarityColor}">${result.item.name}</div>
          <div class="result-meta">${result.caseName ?? 'Opened Case'}</div>
          <div class="result-wear"><strong>${result.wear}</strong></div>
          <div class="result-float">Float: ${formatFloat(result.float)}</div>
          <div class="result-float">Weapon: ${result.item.weapon ?? 'Unknown'}</div>
          <div class="result-float">Finish: ${result.item.finish ?? 'Unknown'}</div>
          <div class="result-float">Seed: ${String(result.seed).slice(0, 8)}</div>
          ${result.statTrak ? '<div class="result-stattrak">StatTrak™</div>' : ''}
          <div id="result-sell" class="result-sell-price">
            Sells for <strong>${formatPrice(salePrice)}</strong>
          </div>
          <div class="result-actions">
            <button type="button" class="open-btn modal-btn" data-action="keep">Keep</button>
            <button type="button" class="open-btn ghost modal-btn" data-action="sell">Sell · ${formatPrice(salePrice)}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.classList.remove('hidden');

  function tearDown() {
    if (currentTrap) {
      currentTrap.deactivate();
      currentTrap = null;
    }
  }

  if (currentTrap) currentTrap.deactivate();
  currentTrap = focusTrap(container);
  currentTrap.activate();

  container.querySelector('[data-action="keep"]')?.addEventListener('click', () => {
    tearDown();
    actions.onKeep?.(result);
  });
  container.querySelector('[data-action="sell"]')?.addEventListener('click', () => {
    tearDown();
    actions.onSell?.(result, salePrice);
  });
}
