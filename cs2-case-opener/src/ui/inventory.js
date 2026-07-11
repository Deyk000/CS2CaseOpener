import { formatFloat } from '../utils/format.js';
import { computeSalePrice } from '../store/inventory.js';
import { track } from '../utils/analytics.js';

const RARITY_COLOR = {
  consumer: '#b0c3d9',
  industrial: '#5e98d9',
  milspec: '#4b69ff',
  restricted: '#8847ff',
  classified: '#d32ce6',
  covert: '#eb4b4b',
  extraordinary: '#e4ae39',
  all: '#9ab0cf',
};

const RARITY_LABEL = {
  milspec: 'Mil-Spec',
  restricted: 'Restricted',
  classified: 'Classified',
  covert: 'Covert',
  extraordinary: 'Special',
};

// Lower index = "rarer". Used by the rarity sort.
const RARITY_ORDER = ['extraordinary', 'covert', 'classified', 'restricted', 'milspec', 'industrial', 'consumer'];

export const SORT_OPTIONS = [
  { id: 'recent', label: 'Recent' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'value_desc', label: 'Value (high → low)' },
  { id: 'value_asc', label: 'Value (low → high)' },
  { id: 'name', label: 'Name (A → Z)' },
  { id: 'float_asc', label: 'Float (low → high)' },
];

const SEARCH_DEBOUNCE_MS = 100;
const VISIBLE_STEP = 120;
const INVENTORY_RENDER_BUDGET_MS = 16;
const INVENTORY_RENDER_TRACK_MIN_ITEMS = 200;

function sortItems(items, sortId) {
  const copy = [...items];
  switch (sortId) {
    case 'rarity':
      copy.sort((a, b) => {
        const ai = RARITY_ORDER.indexOf(a.rarity);
        const bi = RARITY_ORDER.indexOf(b.rarity);
        if (ai !== bi) return ai - bi;
        return (b.openedAt ?? 0) - (a.openedAt ?? 0);
      });
      break;
    case 'value_desc':
      copy.sort((a, b) => (Number(b.basePrice) || 0) - (Number(a.basePrice) || 0));
      break;
    case 'value_asc':
      copy.sort((a, b) => (Number(a.basePrice) || 0) - (Number(b.basePrice) || 0));
      break;
    case 'name':
      copy.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      break;
    case 'float_asc':
      copy.sort((a, b) => (Number(a.float) || 0) - (Number(b.float) || 0));
      break;
    case 'recent':
    default:
      copy.sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0));
  }
  return copy;
}

function formatPrice(value) {
  return `€${(Number(value) || 0).toFixed(2)}`;
}

let currentSort = 'recent';
let currentSearch = '';
let currentRarityFilter = 'all';
let currentVisibleCount = VISIBLE_STEP;
let searchDebounceTimer = null;

export function buildInventoryViewModel(items, options = {}) {
  const search = String(options.search ?? currentSearch);
  const rarityFilter = String(options.rarityFilter ?? currentRarityFilter);
  const sort = String(options.sort ?? currentSort);
  const visibleCount = Number(options.visibleCount ?? currentVisibleCount);

  const totalValue = items.reduce((sum, item) => sum + computeSalePrice(item.basePrice), 0);
  const q = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
    if (q && !`${item.name} ${item.weapon ?? ''} ${item.finish ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const sorted = sortItems(filtered, sort);
  const visible = sorted.slice(0, visibleCount);

  return {
    totalValue,
    filtered,
    sorted,
    visible,
    canShowMore: sorted.length > visible.length,
  };
}

export function renderInventory(container, items, handlers = {}) {
  const renderStart = typeof performance !== 'undefined' ? performance.now() : 0;
  const { totalValue, sorted, visible, canShowMore } = buildInventoryViewModel(items, {
    search: currentSearch,
    rarityFilter: currentRarityFilter,
    sort: currentSort,
    visibleCount: currentVisibleCount,
  });

  const renderDuration = typeof performance !== 'undefined' ? performance.now() - renderStart : 0;
  if (items.length >= INVENTORY_RENDER_TRACK_MIN_ITEMS && renderDuration > INVENTORY_RENDER_BUDGET_MS) {
    track('inventory_render_slow', {
      durationMs: Number(renderDuration.toFixed(2)),
      itemCount: items.length,
      visibleCount: visible.length,
      filteredCount: sorted.length,
      sort: currentSort,
      queryLength: currentSearch.length,
    });
  }

  container.innerHTML = `
    <div class="inventory-toolbar">
      <div class="inventory-stats">
        <span>Total items: <strong>${items.length}</strong></span>
        <span>Total value: <strong>${formatPrice(totalValue)}</strong></span>
      </div>
      <div class="inventory-toolbar-actions">
        <label class="inventory-sort">
          <span>Sort by</span>
          <select data-action="sort">
            ${SORT_OPTIONS.map((opt) => `<option value="${opt.id}"${opt.id === currentSort ? ' selected' : ''}>${opt.label}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
    <div class="inventory-filters">
      <input type="search" class="inventory-search" placeholder="Search by weapon, finish, or name…" data-action="search" value="${currentSearch.replace(/"/g, '&quot;')}" />
      <div class="inventory-rarity-chips" role="group" aria-label="Filter by rarity">
        ${['all', 'milspec', 'restricted', 'classified', 'covert', 'extraordinary'].map((r) => `
          <button type="button" class="rarity-chip${currentRarityFilter === r ? ' active' : ''}" data-rarity="${r}" style="--rarity:${RARITY_COLOR[r] ?? '#888'}">
            ${r === 'all' ? 'All' : (RARITY_LABEL[r] ?? r)}
          </button>
        `).join('')}
      </div>
    </div>
    ${items.length === 0
      ? '<p class="inventory-empty">Your inventory is empty. Open some cases!</p>'
      : sorted.length === 0
        ? '<p class="inventory-empty">No items match the current filter.</p>'
        : `
          <div class="inventory-list">${visible.map(renderCard).join('')}</div>
          ${canShowMore
            ? `<div class="inventory-show-more-wrap"><button type="button" class="open-btn ghost inventory-show-more" data-action="show-more">Show more (${sorted.length - visible.length} left)</button></div>`
            : ''}
        `}
  `;

  container.onchange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches('[data-action="sort"]')) {
      currentSort = target.value;
      currentVisibleCount = VISIBLE_STEP;
      renderInventory(container, items, handlers);
    }
  };

  container.oninput = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches('[data-action="search"]')) return;

    const nextValue = target.value;
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = setTimeout(() => {
      currentSearch = nextValue;
      currentVisibleCount = VISIBLE_STEP;
      renderInventory(container, items, handlers);
    }, SEARCH_DEBOUNCE_MS);
  };

  container.onclick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const sellBtn = target.closest('[data-action="sell"]');
    if (sellBtn) {
      handlers.onSell?.(sellBtn.dataset.uid);
      return;
    }

    const showMoreBtn = target.closest('[data-action="show-more"]');
    if (showMoreBtn) {
      currentVisibleCount += VISIBLE_STEP;
      renderInventory(container, items, handlers);
      return;
    }

    const chip = target.closest('.rarity-chip');
    if (chip) {
      currentRarityFilter = chip.dataset.rarity;
      currentVisibleCount = VISIBLE_STEP;
      renderInventory(container, items, handlers);
      return;
    }

    const card = target.closest('.inventory-item');
    if (card) {
      handlers.onSelect?.(card.dataset.uid);
    }
  };
}

function renderCard(item) {
  const color = RARITY_COLOR[item.rarity] ?? '#b0c3d9';
  const salePrice = computeSalePrice(item.basePrice);
  const stCount = Number(item.statTrakCount) || 0;
  return `
    <article class="inventory-item" data-uid="${item.uid}" data-rarity="${item.rarity}" style="--rarity:${color}">
      ${item.statTrak ? `<span class="stattrak-badge" title="StatTrak™ kills">ST · ${stCount}</span>` : ''}
      <div class="inventory-item-art">
        <img src="${item.image ?? ''}" alt="${item.name}" loading="lazy" />
      </div>
      <div class="inventory-item-name" title="${item.name}">${item.name}</div>
      <div class="inventory-item-wear">${item.wear} · ${formatFloat(item.float)}</div>
      <div class="inventory-item-footer">
        <span class="inventory-item-price">${formatPrice(salePrice)}</span>
        <button type="button" class="inventory-sell-btn" data-action="sell" data-uid="${item.uid}">Sell</button>
      </div>
    </article>
  `;
}
