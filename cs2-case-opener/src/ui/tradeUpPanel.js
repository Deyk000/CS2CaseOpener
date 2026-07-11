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

  container.innerHTML = `
    <div class="trade-up-bar">
      <div class="trade-up-stat">
        <span class="trade-up-stat-label">Selected</span>
        <span class="trade-up-stat-value">${count}/10</span>
      </div>
    </div>

    <div class="trade-up-tabs">
      ${ELIGIBLE_RARITIES.map((r) => {
        const n = eligible.filter((i) => i.rarity === r).length;
        const sameTier = r === 'extraordinary';
        const nextLabel = sameTier ? 'Random Knife / Glove' : RARITY_LABEL[RARITY_NEXT[r]];
        return `
          <button type="button" class="trade-up-tab${r === state.rarity ? ' active' : ''}${sameTier ? ' is-knife' : ''}"
                  data-rarity="${r}" style="--rarity:${RARITY_COLOR[r]}"
                  ${n === 0 ? 'disabled' : ''}>
            <span class="trade-up-tab-name">${RARITY_LABEL[r]}</span>
            <span class="trade-up-tab-arrow">${sameTier ? '↻' : '→'}</span>
            <span class="trade-up-tab-next" style="color:${RARITY_COLOR[RARITY_NEXT[r]]}">${nextLabel}</span>
            <span class="trade-up-tab-count">${n}</span>
          </button>
        `;
      }).join('')}
    </div>

    ${state.rarity === 'extraordinary' ? `
      <div class="trade-up-notice">
        <strong>Knife / Glove forge.</strong> 10 knives or gloves are consumed for one random result drawn from every case's special pool. Same tier — this is a re-roll, not a tier-up. Mostly worth it if you want a specific finish, not for profit.
      </div>
    ` : ''}

    <div class="trade-up-body">
      <div class="trade-up-pool">
        <div class="trade-up-pool-head">
          <span>Your ${RARITY_LABEL[state.rarity]} items (${ofRarity.length})</span>
          ${count > 0 ? `<button type="button" class="trade-up-link" data-action="clear">Clear selection</button>` : ''}
        </div>
        ${ofRarity.length === 0
          ? `<p class="trade-up-empty">No ${RARITY_LABEL[state.rarity]} items in your inventory yet. Open a few cases first.</p>`
          : `<div class="trade-up-pool-grid">
              ${ofRarity.map((it) => `
                <button type="button"
                        class="trade-up-pool-item${state.selected.has(it.uid) ? ' selected' : ''}"
                        data-uid="${it.uid}"
                        style="--rarity:${RARITY_COLOR[it.rarity]}"
                        title="${it.name}">
                  <div class="trade-up-pool-art">
                    <img src="${it.image ?? ''}" alt="${it.name}" loading="lazy" />
                  </div>
                  <div class="trade-up-pool-name">${it.name}</div>
                  <div class="trade-up-pool-price">${fmt(computeSalePrice(it.basePrice))}</div>
                  ${state.selected.has(it.uid) ? '<div class="trade-up-pool-check">✓</div>' : ''}
                </button>
              `).join('')}
            </div>`}
      </div>

      <aside class="trade-up-preview">
        <div class="trade-up-preview-head">
          <span class="trade-up-preview-label">Possible outputs</span>
          ${nextRarity ? `<span class="trade-up-preview-rarity" style="color:${RARITY_COLOR[nextRarity]}">${state.rarity === 'extraordinary' ? 'Knife / Glove' : RARITY_LABEL[nextRarity]}</span>` : ''}
        </div>

        ${count === 0
          ? `<p class="trade-up-preview-empty">Select 10 ${RARITY_LABEL[state.rarity]} items to see possible outputs and odds.</p>`
          : preview.outputs.length === 0
            ? `<p class="trade-up-preview-empty">No outputs available for this combination.</p>`
            : `<ul class="trade-up-preview-list">
                ${preview.outputs.map((o) => `
                  <li class="trade-up-preview-row" style="--rarity:${RARITY_COLOR[nextRarity]}">
                    <img src="${o.item.image}" alt="${o.item.name}" loading="lazy" />
                    <div class="trade-up-preview-meta">
                      <div class="trade-up-preview-name">${o.item.name}</div>
                      <div class="trade-up-preview-sub">${fmt(computeSalePrice(o.item.basePrice))} · ${o.item.caseName ?? ''}</div>
                    </div>
                    <div class="trade-up-preview-prob">${(o.probability * 100).toFixed(1)}%</div>
                  </li>
                `).join('')}
              </ul>`}

        <div class="trade-up-summary">
          <div class="trade-up-summary-row">
            <span>Total in</span><strong>${fmt(totalIn)}</strong>
          </div>
          <div class="trade-up-summary-row">
            <span>Expected value</span>
            <strong class="${profitDelta >= 0 ? 'pos' : 'neg'}">${fmt(expectedValue)}</strong>
          </div>
          <div class="trade-up-summary-row trade-up-summary-delta">
            <span>Expected ${profitDelta >= 0 ? 'profit' : 'loss'}</span>
            <strong class="${profitDelta >= 0 ? 'pos' : 'neg'}">${profitDelta >= 0 ? '+' : ''}${fmt(profitDelta)}</strong>
          </div>
          <button type="button" class="open-btn trade-up-forge" data-action="forge" ${count !== 10 ? 'disabled' : ''}>
            ${count === 10 ? 'Forge Trade-Up' : `Need ${10 - count} more`}
          </button>
        </div>
      </aside>
    </div>
  `;

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
