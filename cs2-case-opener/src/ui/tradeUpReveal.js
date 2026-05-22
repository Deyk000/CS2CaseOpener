// Trade-up result reveal — full-screen overlay that runs the same roulette
// spin as case opening, then shows the result modal with Keep/Sell-style
// actions. Reused for any "you got X out of a pool" reveal.

import { renderSpinner } from './spinner.js';
import { renderResultModal } from './resultModal.js';
import { focusTrap } from '../utils/focusTrap.js';

export function openTradeUpReveal({ pool, result, onKeep, onSell }) {
  // Build a minimal case-shape so renderSpinner can reuse pickFillers().
  const fakeCase = {
    items: pool,
    specialPool: [],
  };

  const overlay = document.createElement('div');
  overlay.className = 'app-window trade-up-reveal-window';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Trade-Up reveal');
  overlay.innerHTML = `
    <div class="window-shell trade-up-reveal-shell">
      <div class="trade-up-reveal-banner">
        <div class="trade-up-reveal-eyebrow">Trade-Up Contract</div>
        <div class="trade-up-reveal-title">Forging…</div>
      </div>
      <div class="trade-up-reveal-spinner spinner-container"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  const trap = focusTrap(overlay);
  trap.activate();

  const spinnerHost = overlay.querySelector('.trade-up-reveal-spinner');
  const title = overlay.querySelector('.trade-up-reveal-title');

  // Hand the spinner a result-shaped object so the reel lands on `result.item`.
  const openResult = {
    item: result.resultItem,
    wear: 'Field-Tested',
    float: 0.25,
    statTrak: result.statTrak,
    seed: result.seed,
    timestamp: Date.now(),
    caseName: 'Trade-Up Contract',
  };

  renderSpinner(spinnerHost, fakeCase, openResult, {}).then(async () => {
    title.textContent = 'Forged!';
    // Brief breathing room before the result modal slides in.
    await new Promise((r) => setTimeout(r, 650));
    teardown();

    // Reuse the standard result modal so Keep/Sell look the same as a normal unbox.
    const modalRoot = document.getElementById('resultModal');
    if (!modalRoot) return;
    renderResultModal(modalRoot, openResult, {
      onKeep: () => {
        modalRoot.classList.add('hidden');
        onKeep?.(openResult);
      },
      onSell: (_result, salePrice) => {
        modalRoot.classList.add('hidden');
        onSell?.(openResult, salePrice);
      },
    });
  });

  function teardown() {
    trap.deactivate();
    overlay.remove();
  }
}
