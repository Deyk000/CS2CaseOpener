// Trade-Up Contract — home-screen panel.
//
// Replaces the per-modal version. Lives inline on the main page so it's
// always discoverable. Left column: tier picker + your eligible items.
// Right column: live preview of every possible output with its probability.

import { validateTradeUp, executeTradeUp, previewTradeUp } from '../engine/tradeup.js';
import { computeSalePrice } from '../store/inventory.js';

const ELIGIBLE_RARITIES = ['milspec', 'restricted', 'classified', 'extraordinary'];

const RARITY_LABEL = {
  milspec: 'Mil-Spec',
  restricted: 'Restricted',
  classified: 'Classified',
  covert: 'Covert',
  extraordinary: 'Knife / Glove',
};
const RARITY_COLOR = {
  milspec: '#4b69ff',
  restricted: '#8847ff',
  classified: '#d32ce6',
  covert: '#eb4b4b',
  extraordinary: '#e4ae39',
};
const RARITY_NEXT = {
  milspec: 'restricted',
  restricted: 'classified',
  classified: 'covert',
  // Knives/gloves don't climb — they re-roll within the same tier.
  extraordinary: 'extraordinary',
};

const fmt = (v) => `€${(Number(v) || 0).toFixed(2)}`;

let state = {
  rarity: 'milspec',
  selected: new Set(), // uids
};

export function renderTradeUpPanel(container, items, handlers = {}) {
  if (!container) return;
  // Reset selection if rarity changed underneath us.
  if (!ELIGIBLE_RARITIES.includes(state.rarity)) state.rarity = 'milspec';

  const eligible = items.filter((i) => ELIGIBLE_RARITIES.includes(i.rarity));
  const ofRarity = eligible.filter((i) => i.rarity === state.rarity);
  const ofRarityByUid = new Map(ofRarity.map((i) => [i.uid, i]));
  const selectedItems = [...state.selected]
    .map((uid) => ofRarityByUid.get(uid))
    .filter(Boolean);

  // Selection might be stale (sold items, swapped rarity). Trim.
  if (selectedItems.length !== state.selected.size) {
    state.selected = new Set(selectedItems.map((i) => i.uid));
  }

  const count = selectedItems.length;
  const totalIn = selectedItems.reduce((s, it) => s + computeSalePrice(it.basePrice), 0);
  const preview = count > 0 ? previewTradeUp(selectedItems) : { resultRarity: null, outputs: [] };
  const expectedValue = preview.outputs.reduce(
    (s, o) => s + computeSalePrice(o.item.basePrice) * o.probability,
    0,
  );
  const profitDelta = expectedValue - totalIn;
  const nextRarity = RARITY_NEXT[state.rarity];

  container.textContent = '';

  const bar = document.createElement('div');
  bar.className = 'trade-up-bar';
  const stat = document.createElement('div');
  stat.className = 'trade-up-stat';
  const statLabel = document.createElement('span');
  statLabel.className = 'trade-up-stat-label';
  statLabel.textContent = 'Selected';
  const statValue = document.createElement('span');
  statValue.className = 'trade-up-stat-value';
  statValue.textContent = `${count}/10`;
  stat.append(statLabel, statValue);
  bar.appendChild(stat);
  container.appendChild(bar);

  const tabs = document.createElement('div');
  tabs.className = 'trade-up-tabs';
  ELIGIBLE_RARITIES.forEach((r) => {
    const n = eligible.filter((i) => i.rarity === r).length;
    const sameTier = r === 'extraordinary';
    const nextLabel = sameTier ? 'Random Knife / Glove' : RARITY_LABEL[RARITY_NEXT[r]];

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `trade-up-tab${r === state.rarity ? ' active' : ''}${sameTier ? ' is-knife' : ''}`;
    button.dataset.rarity = r;
    button.style.setProperty('--rarity', RARITY_COLOR[r]);
    if (n === 0) button.disabled = true;

    const tabName = document.createElement('span');
    tabName.className = 'trade-up-tab-name';
    tabName.textContent = RARITY_LABEL[r];

    const tabArrow = document.createElement('span');
    tabArrow.className = 'trade-up-tab-arrow';
    tabArrow.textContent = sameTier ? '↻' : '→';

    const tabNext = document.createElement('span');
    tabNext.className = 'trade-up-tab-next';
    tabNext.style.color = RARITY_COLOR[RARITY_NEXT[r]];
    tabNext.textContent = nextLabel;

    const tabCount = document.createElement('span');
    tabCount.className = 'trade-up-tab-count';
    tabCount.textContent = n;

    button.append(tabName, tabArrow, tabNext, tabCount);
    tabs.appendChild(button);
  });
  container.appendChild(tabs);

  if (state.rarity === 'extraordinary') {
    const notice = document.createElement('div');
    notice.className = 'trade-up-notice';
    const strong = document.createElement('strong');
    strong.textContent = 'Knife / Glove forge. ';
    notice.append(strong, '10 knives or gloves are consumed for one random result drawn from every case\'s special pool. Same tier — this is a re-roll, not a tier-up. Mostly worth it if you want a specific finish, not for profit.');
    container.appendChild(notice);
  }

  const body = document.createElement('div');
  body.className = 'trade-up-body';

  const pool = document.createElement('div');
  pool.className = 'trade-up-pool';

  const poolHead = document.createElement('div');
  poolHead.className = 'trade-up-pool-head';
  const poolHeadSpan = document.createElement('span');
  poolHeadSpan.textContent = `Your ${RARITY_LABEL[state.rarity]} items (${ofRarity.length})`;
  poolHead.appendChild(poolHeadSpan);

  if (count > 0) {
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'trade-up-link';
    clearBtn.dataset.action = 'clear';
    clearBtn.textContent = 'Clear selection';
    poolHead.appendChild(clearBtn);
  }
  pool.appendChild(poolHead);

  if (ofRarity.length === 0) {
    const p = document.createElement('p');
    p.className = 'trade-up-empty';
    p.textContent = `No ${RARITY_LABEL[state.rarity]} items in your inventory yet. Open a few cases first.`;
    pool.appendChild(p);
  } else {
    const poolGrid = document.createElement('div');
    poolGrid.className = 'trade-up-pool-grid';
    ofRarity.forEach((it) => {
      const isSelected = state.selected.has(it.uid);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `trade-up-pool-item${isSelected ? ' selected' : ''}`;
      button.dataset.uid = it.uid;
      button.style.setProperty('--rarity', RARITY_COLOR[it.rarity]);
      button.title = it.name;

      const artDiv = document.createElement('div');
      artDiv.className = 'trade-up-pool-art';
      const img = document.createElement('img');
      img.src = it.image ?? '';
      img.alt = it.name;
      img.loading = 'lazy';
      artDiv.appendChild(img);

      const nameDiv = document.createElement('div');
      nameDiv.className = 'trade-up-pool-name';
      nameDiv.textContent = it.name;

      const priceDiv = document.createElement('div');
      priceDiv.className = 'trade-up-pool-price';
      priceDiv.textContent = fmt(computeSalePrice(it.basePrice));

      button.append(artDiv, nameDiv, priceDiv);

      if (isSelected) {
        const check = document.createElement('div');
        check.className = 'trade-up-pool-check';
        check.textContent = '✓';
        button.appendChild(check);
      }

      poolGrid.appendChild(button);
    });
    pool.appendChild(poolGrid);
  }

  const previewAside = document.createElement('aside');
  previewAside.className = 'trade-up-preview';

  const previewHead = document.createElement('div');
  previewHead.className = 'trade-up-preview-head';
  const previewLabel = document.createElement('span');
  previewLabel.className = 'trade-up-preview-label';
  previewLabel.textContent = 'Possible outputs';
  previewHead.appendChild(previewLabel);

  if (nextRarity) {
    const previewRarity = document.createElement('span');
    previewRarity.className = 'trade-up-preview-rarity';
    previewRarity.style.color = RARITY_COLOR[nextRarity];
    previewRarity.textContent = state.rarity === 'extraordinary' ? 'Knife / Glove' : RARITY_LABEL[nextRarity];
    previewHead.appendChild(previewRarity);
  }
  previewAside.appendChild(previewHead);

  if (count === 0) {
    const p = document.createElement('p');
    p.className = 'trade-up-preview-empty';
    p.textContent = `Select 10 ${RARITY_LABEL[state.rarity]} items to see possible outputs and odds.`;
    previewAside.appendChild(p);
  } else if (preview.outputs.length === 0) {
    const p = document.createElement('p');
    p.className = 'trade-up-preview-empty';
    p.textContent = 'No outputs available for this combination.';
    previewAside.appendChild(p);
  } else {
    const list = document.createElement('ul');
    list.className = 'trade-up-preview-list';
    preview.outputs.forEach((o) => {
      const li = document.createElement('li');
      li.className = 'trade-up-preview-row';
      li.style.setProperty('--rarity', RARITY_COLOR[nextRarity]);

      const img = document.createElement('img');
      img.src = o.item.image;
      img.alt = o.item.name;
      img.loading = 'lazy';

      const metaDiv = document.createElement('div');
      metaDiv.className = 'trade-up-preview-meta';
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'trade-up-preview-name';
      nameDiv.textContent = o.item.name;

      const subDiv = document.createElement('div');
      subDiv.className = 'trade-up-preview-sub';
      subDiv.textContent = `${fmt(computeSalePrice(o.item.basePrice))} · ${o.item.caseName ?? ''}`;
      
      metaDiv.append(nameDiv, subDiv);

      const probDiv = document.createElement('div');
      probDiv.className = 'trade-up-preview-prob';
      probDiv.textContent = `${(o.probability * 100).toFixed(1)}%`;

      li.append(img, metaDiv, probDiv);
      list.appendChild(li);
    });
    previewAside.appendChild(list);
  }

  const summary = document.createElement('div');
  summary.className = 'trade-up-summary';

  const totalInRow = document.createElement('div');
  totalInRow.className = 'trade-up-summary-row';
  const totalInSpan = document.createElement('span');
  totalInSpan.textContent = 'Total in';
  const totalInStrong = document.createElement('strong');
  totalInStrong.textContent = fmt(totalIn);
  totalInRow.append(totalInSpan, totalInStrong);

  const evRow = document.createElement('div');
  evRow.className = 'trade-up-summary-row';
  const evSpan = document.createElement('span');
  evSpan.textContent = 'Expected value';
  const evStrong = document.createElement('strong');
  evStrong.className = profitDelta >= 0 ? 'pos' : 'neg';
  evStrong.textContent = fmt(expectedValue);
  evRow.append(evSpan, evStrong);

  const deltaRow = document.createElement('div');
  deltaRow.className = 'trade-up-summary-row trade-up-summary-delta';
  const deltaSpan = document.createElement('span');
  deltaSpan.textContent = `Expected ${profitDelta >= 0 ? 'profit' : 'loss'}`;
  const deltaStrong = document.createElement('strong');
  deltaStrong.className = profitDelta >= 0 ? 'pos' : 'neg';
  deltaStrong.textContent = `${profitDelta >= 0 ? '+' : ''}${fmt(profitDelta)}`;
  deltaRow.append(deltaSpan, deltaStrong);

  const forgeBtn = document.createElement('button');
  forgeBtn.type = 'button';
  forgeBtn.className = 'open-btn trade-up-forge';
  forgeBtn.dataset.action = 'forge';
  if (count !== 10) forgeBtn.disabled = true;
  forgeBtn.textContent = count === 10 ? 'Forge Trade-Up' : `Need ${10 - count} more`;

  summary.append(totalInRow, evRow, deltaRow, forgeBtn);
  previewAside.appendChild(summary);

  body.append(pool, previewAside);
  container.appendChild(body);

  // Wire interactions with one delegated click handler to reduce listener churn.
  container.onclick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const tab = target.closest('.trade-up-tab');
    if (tab) {
      if (tab.disabled) return;
      state.rarity = tab.dataset.rarity;
      state.selected.clear();
      renderTradeUpPanel(container, items, handlers);
      return;
    }

    const card = target.closest('.trade-up-pool-item');
    if (card) {
      const uid = card.dataset.uid;
      if (state.selected.has(uid)) {
        state.selected.delete(uid);
      } else if (state.selected.size < 10) {
        state.selected.add(uid);
      }
      renderTradeUpPanel(container, items, handlers);
      return;
    }

    const clearBtn = target.closest('[data-action="clear"]');
    if (clearBtn) {
      state.selected.clear();
      renderTradeUpPanel(container, items, handlers);
      return;
    }

    const forgeBtn = target.closest('[data-action="forge"]');
    if (!forgeBtn) return;
    if (state.selected.size !== 10) return;

    const chosen = [...state.selected].map((uid) => ofRarityByUid.get(uid)).filter(Boolean);
    const validation = validateTradeUp(chosen);
    if (!validation.valid) {
      handlers.onError?.(validation.reason);
      return;
    }
    const tradeUp = executeTradeUp(chosen);
    state.selected.clear();
    handlers.onComplete?.(tradeUp, chosen);
  };
}
