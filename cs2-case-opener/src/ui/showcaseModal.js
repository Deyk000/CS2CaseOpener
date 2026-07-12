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

  const content = document.createElement('div');
  content.className = 'modal-content showcase-content';

  const banner = document.createElement('div');
  banner.className = 'rarity-banner';
  banner.style.background = `${rarityColor}22`;
  banner.style.color = rarityColor;
  banner.textContent = rarityLabel;

  const layout = document.createElement('div');
  layout.className = 'result-layout';

  const art = document.createElement('div');
  art.className = 'result-art';
  art.style.perspective = '1000px';

  const img = document.createElement('img');
  img.className = 'result-image';
  img.src = item.image ?? '';
  img.alt = item.name;
  img.style.transition = 'transform 0.1s ease-out';
  art.appendChild(img);

  // Add 3D Tilt/Parallax Effect
  art.addEventListener('mousemove', (e) => {
    const rect = art.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((centerY - y) / centerY) * 15;
    const rotateY = ((x - centerX) / centerX) * 15;
    img.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
  });

  art.addEventListener('mouseleave', () => {
    img.style.transition = 'transform 0.3s ease';
    img.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
  });

  const details = document.createElement('div');
  details.className = 'result-details';

  const name = document.createElement('div');
  name.id = 'showcase-name';
  name.className = 'result-name';
  name.style.color = rarityColor;
  name.textContent = item.name;

  const meta = document.createElement('div');
  meta.className = 'result-meta';
  meta.textContent = item.caseName || 'Inventory item';

  const wear = document.createElement('div');
  wear.className = 'result-wear';
  const wearStrong = document.createElement('strong');
  wearStrong.textContent = item.wear ?? '—';
  wear.appendChild(wearStrong);

  const float = document.createElement('div');
  float.className = 'result-float';
  float.textContent = `Float: ${formatFloat(item.float)}`;

  const weapon = document.createElement('div');
  weapon.className = 'result-float';
  weapon.textContent = `Weapon: ${item.weapon ?? 'Unknown'}`;

  const finish = document.createElement('div');
  finish.className = 'result-float';
  finish.textContent = `Finish: ${item.finish ?? 'Unknown'}`;

  const seed = document.createElement('div');
  seed.className = 'result-float';
  seed.textContent = `Seed: ${String(item.seed ?? '').slice(0, 8) || '—'}`;

  const opened = document.createElement('div');
  opened.className = 'result-float';
  opened.textContent = `Opened: ${formatDate(item.openedAt)}`;

  details.append(name, meta, wear, float, weapon, finish, seed, opened);

  if (item.statTrak) {
    const st = document.createElement('div');
    st.className = 'result-stattrak';
    st.textContent = `StatTrak™ · ${stCount} kills`;
    details.appendChild(st);
  }

  const sell = document.createElement('div');
  sell.id = 'showcase-sell';
  sell.className = 'result-sell-price';
  sell.textContent = 'Sells for ';
  const sellStrong = document.createElement('strong');
  sellStrong.textContent = formatPrice(salePrice);
  sell.appendChild(sellStrong);
  details.appendChild(sell);

  const actions = document.createElement('div');
  actions.className = 'result-actions';

  const sellBtn = document.createElement('button');
  sellBtn.type = 'button';
  sellBtn.className = 'open-btn modal-btn';
  sellBtn.dataset.action = 'sell';
  sellBtn.textContent = `Sell · ${formatPrice(salePrice)}`;

  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'open-btn ghost modal-btn';
  shareBtn.dataset.action = 'share';
  shareBtn.textContent = 'Copy share text';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'open-btn ghost modal-btn';
  closeBtn.dataset.action = 'close';
  closeBtn.textContent = 'Close';

  actions.append(sellBtn, shareBtn, closeBtn);
  details.appendChild(actions);

  layout.append(art, details);
  content.append(banner, layout);
  overlay.appendChild(content);

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
    if (event.target === overlay) {
      teardown();
      handlers.onClose?.();
    }
  });

  sellBtn.addEventListener('click', () => {
    teardown();
    handlers.onSell?.(item.uid, salePrice);
  });

  closeBtn.addEventListener('click', () => {
    teardown();
    handlers.onClose?.();
  });

  shareBtn.addEventListener('click', async (event) => {
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
      handlers.onShareFailed?.(text);
    }
  });
}
