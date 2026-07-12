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

  container.textContent = '';
  
  const content = document.createElement('div');
  content.className = 'modal-content result-modal-content';
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-modal', 'true');
  content.setAttribute('aria-labelledby', 'result-name');
  content.setAttribute('aria-describedby', 'result-sell');

  const banner = document.createElement('div');
  banner.className = 'rarity-banner';
  banner.style.background = `${rarityColor}22`;
  banner.style.color = rarityColor;
  banner.textContent = rarityLabel;

  const layout = document.createElement('div');
  layout.className = 'result-layout';

  const art = document.createElement('div');
  art.className = 'result-art';

  const img = document.createElement('img');
  img.className = 'result-image';
  img.src = result.item.image;
  img.alt = result.item.name;
  art.appendChild(img);

  const details = document.createElement('div');
  details.className = 'result-details';

  const name = document.createElement('div');
  name.id = 'result-name';
  name.className = 'result-name';
  name.style.color = rarityColor;
  name.textContent = result.item.name;

  const meta = document.createElement('div');
  meta.className = 'result-meta';
  meta.textContent = result.caseName ?? 'Opened Case';

  const wear = document.createElement('div');
  wear.className = 'result-wear';
  const wearStrong = document.createElement('strong');
  wearStrong.textContent = result.wear;
  wear.appendChild(wearStrong);

  const float = document.createElement('div');
  float.className = 'result-float';
  float.textContent = `Float: ${formatFloat(result.float)}`;

  const weapon = document.createElement('div');
  weapon.className = 'result-float';
  weapon.textContent = `Weapon: ${result.item.weapon ?? 'Unknown'}`;

  const finish = document.createElement('div');
  finish.className = 'result-float';
  finish.textContent = `Finish: ${result.item.finish ?? 'Unknown'}`;

  const seed = document.createElement('div');
  seed.className = 'result-float';
  seed.textContent = `Seed: ${String(result.seed).slice(0, 8)}`;

  details.append(name, meta, wear, float, weapon, finish, seed);

  if (result.statTrak) {
    const st = document.createElement('div');
    st.className = 'result-stattrak';
    st.textContent = 'StatTrak™';
    details.appendChild(st);
  }

  const sell = document.createElement('div');
  sell.id = 'result-sell';
  sell.className = 'result-sell-price';
  sell.textContent = 'Sells for ';
  const sellStrong = document.createElement('strong');
  sellStrong.textContent = formatPrice(salePrice);
  sell.appendChild(sellStrong);
  details.appendChild(sell);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'result-actions';

  const keepBtn = document.createElement('button');
  keepBtn.type = 'button';
  keepBtn.className = 'open-btn modal-btn';
  keepBtn.dataset.action = 'keep';
  keepBtn.textContent = 'Keep';

  const sellBtn = document.createElement('button');
  sellBtn.type = 'button';
  sellBtn.className = 'open-btn ghost modal-btn';
  sellBtn.dataset.action = 'sell';
  sellBtn.textContent = `Sell · ${formatPrice(salePrice)}`;

  actionsDiv.append(keepBtn, sellBtn);
  details.appendChild(actionsDiv);

  layout.append(art, details);
  content.append(banner, layout);
  container.appendChild(content);

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
