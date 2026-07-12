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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('inventory:rendered', { detail: { durationMs: renderDuration } }));
  }

  container.textContent = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'inventory-toolbar';

  const stats = document.createElement('div');
  stats.className = 'inventory-stats';

  const totalSpan = document.createElement('span');
  totalSpan.textContent = 'Total items: ';
  const totalStrong = document.createElement('strong');
  totalStrong.textContent = items.length;
  totalSpan.appendChild(totalStrong);

  const valueSpan = document.createElement('span');
  valueSpan.textContent = 'Total value: ';
  const valueStrong = document.createElement('strong');
  valueStrong.textContent = formatPrice(totalValue);
  valueSpan.appendChild(valueStrong);

  stats.append(totalSpan, valueSpan);

  const actions = document.createElement('div');
  actions.className = 'inventory-toolbar-actions';

  const sortLabel = document.createElement('label');
  sortLabel.className = 'inventory-sort';
  const sortSpan = document.createElement('span');
  sortSpan.textContent = 'Sort by';
  const sortSelect = document.createElement('select');
  sortSelect.dataset.action = 'sort';
  SORT_OPTIONS.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.id;
    option.textContent = opt.label;
    if (opt.id === currentSort) option.selected = true;
    sortSelect.appendChild(option);
  });
  sortLabel.append(sortSpan, sortSelect);
  actions.appendChild(sortLabel);
  toolbar.append(stats, actions);

  const filters = document.createElement('div');
  filters.className = 'inventory-filters';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'inventory-search';
  searchInput.placeholder = 'Search by weapon, finish, or name…';
  searchInput.dataset.action = 'search';
  searchInput.value = currentSearch;

  const chips = document.createElement('div');
  chips.className = 'inventory-rarity-chips';
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Filter by rarity');

  ['all', 'milspec', 'restricted', 'classified', 'covert', 'extraordinary'].forEach((r) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `rarity-chip${currentRarityFilter === r ? ' active' : ''}`;
    button.dataset.rarity = r;
    button.style.setProperty('--rarity', RARITY_COLOR[r] ?? '#888');
    button.textContent = r === 'all' ? 'All' : (RARITY_LABEL[r] ?? r);
    chips.appendChild(button);
  });

  filters.append(searchInput, chips);
  container.append(toolbar, filters);

  if (items.length === 0) {
    const p = document.createElement('p');
    p.className = 'inventory-empty';
    p.textContent = 'Your inventory is empty. Open some cases!';
    container.appendChild(p);
  } else if (sorted.length === 0) {
    const p = document.createElement('p');
    p.className = 'inventory-empty';
    p.textContent = 'No items match the current filter.';
    container.appendChild(p);
  } else {
    const list = document.createElement('div');
    list.className = 'inventory-list';
    const fragment = document.createDocumentFragment();
    visible.forEach((item) => {
      fragment.appendChild(renderCard(item));
    });
    list.appendChild(fragment);
    container.appendChild(list);

    if (canShowMore) {
      const showMoreWrap = document.createElement('div');
      showMoreWrap.className = 'inventory-show-more-wrap';

      const showMoreBtn = document.createElement('button');
      showMoreBtn.type = 'button';
      showMoreBtn.className = 'open-btn ghost inventory-show-more';
      showMoreBtn.dataset.action = 'show-more';
      showMoreBtn.textContent = `Show more (${sorted.length - visible.length} left)`;
      
      showMoreWrap.appendChild(showMoreBtn);
      container.appendChild(showMoreWrap);
    }
  }

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

  const article = document.createElement('article');
  article.className = 'inventory-item';
  article.dataset.uid = item.uid;
  article.dataset.rarity = item.rarity;
  article.style.setProperty('--rarity', color);

  if (item.statTrak) {
    const badge = document.createElement('span');
    badge.className = 'stattrak-badge';
    badge.title = 'StatTrak™ kills';
    badge.textContent = `ST · ${stCount}`;
    article.appendChild(badge);
  }

  const art = document.createElement('div');
  art.className = 'inventory-item-art';
  const img = document.createElement('img');
  img.src = item.image ?? '';
  img.alt = item.name;
  img.loading = 'lazy';
  art.appendChild(img);

  const name = document.createElement('div');
  name.className = 'inventory-item-name';
  name.title = item.name;
  name.textContent = item.name;

  const wear = document.createElement('div');
  wear.className = 'inventory-item-wear';
  wear.textContent = `${item.wear} · ${formatFloat(item.float)}`;

  const footer = document.createElement('div');
  footer.className = 'inventory-item-footer';

  const priceSpan = document.createElement('span');
  priceSpan.className = 'inventory-item-price';
  priceSpan.textContent = formatPrice(salePrice);

  const sellBtn = document.createElement('button');
  sellBtn.type = 'button';
  sellBtn.className = 'inventory-sell-btn';
  sellBtn.dataset.action = 'sell';
  sellBtn.dataset.uid = item.uid;
  sellBtn.textContent = 'Sell';

  footer.append(priceSpan, sellBtn);
  article.append(art, name, wear, footer);

  return article;
}
