// Showcase modal — inspect a single inventory item.
//
// Self-mounting (creates its own .app-window overlay and removes it on close),
// because the static #resultModal is dedicated to the post-open Keep/Sell flow.

import { formatFloat } from '../utils/format.js';
import { computeSalePrice } from '../store/inventory.js';
import { focusTrap } from '../utils/focusTrap.js';

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

function formatDate(ms) {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '—';
  }
}

function buildShareText(item, salePrice) {
  const wear = item.wear ? ` (${item.wear})` : '';
  const fromCase = item.caseName ? ` from ${item.caseName}` : '';
  const st = item.statTrak ? 'StatTrak™ ' : '';
  return `Just unboxed ${st}${item.name}${wear}${fromCase} — worth ${formatPrice(salePrice)}!`;
}

export function openShowcaseModal(item, handlers = {}) {
  if (!item) return;
  const rarityColor = RARITY_COLOR[item.rarity] ?? '#e4ae39';
  const rarityLabel = String(item.rarity ?? '').toUpperCase();
  const salePrice = computeSalePrice(item.basePrice);
  const stCount = Number(item.statTrakCount) || 0;

  const overlay = document.createElement('div');
  overlay.className = 'app-window showcase-window';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'showcase-name');
  overlay.setAttribute('aria-describedby', 'showcase-sell');
  document.body.appendChild(overlay);

  overlay.innerHTML = `
    <div class="modal-content showcase-content">
      <div class="rarity-banner" style="background:${rarityColor}22;color:${rarityColor}">${rarityLabel}</div>
      <div class="result-layout">
        <div class="result-art">
          <img class="result-image" src="${item.image ?? ''}" alt="${item.name}" />
        </div>
        <div class="result-details">
          <div id="showcase-name" class="result-name" style="color:${rarityColor}">${item.name}</div>
          <div class="result-meta">${item.caseName || 'Inventory item'}</div>
          <div class="result-wear"><strong>${item.wear ?? '—'}</strong></div>
          <div class="result-float">Float: ${formatFloat(item.float)}</div>
          <div class="result-float">Weapon: ${item.weapon ?? 'Unknown'}</div>
          <div class="result-float">Finish: ${item.finish ?? 'Unknown'}</div>
          <div class="result-float">Seed: ${String(item.seed ?? '').slice(0, 8) || '—'}</div>
          <div class="result-float">Opened: ${formatDate(item.openedAt)}</div>
          ${item.statTrak ? `<div class="result-stattrak">StatTrak™ · ${stCount} kills</div>` : ''}
          <div id="showcase-sell" class="result-sell-price">
            Sells for <strong>${formatPrice(salePrice)}</strong>
          </div>
          <div class="result-actions">
            <button type="button" class="open-btn modal-btn" data-action="sell">Sell · ${formatPrice(salePrice)}</button>
            <button type="button" class="open-btn ghost modal-btn" data-action="share">Copy share text</button>
            <button type="button" class="open-btn ghost modal-btn" data-action="close">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Animate in.
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  const trap = focusTrap(overlay);
  trap.activate();

  function teardown() {
    trap.deactivate();
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }

  function onKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      teardown();
      handlers.onClose?.();
    }
  }
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (event) => {
    // Click on backdrop closes; clicks on the content shouldn't.
    if (event.target === overlay) {
      teardown();
      handlers.onClose?.();
    }
  });

  overlay.querySelector('[data-action="sell"]')?.addEventListener('click', () => {
    teardown();
    handlers.onSell?.(item.uid, salePrice);
  });

  overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => {
    teardown();
    handlers.onClose?.();
  });

  overlay.querySelector('[data-action="share"]')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    const text = buildShareText(item, salePrice);
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
      btn.disabled = true;
      setTimeout(() => {
        if (!btn.isConnected) return;
        btn.textContent = 'Copy share text';
        btn.disabled = false;
      }, 1400);
    } catch {
      // Clipboard API may be denied — fall back to a transient toast via the caller.
      handlers.onShareFailed?.(text);
    }
  });
}
