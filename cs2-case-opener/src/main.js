import { CASES, getCaseById } from './data/cases.js';
import { claimDailyReward, getMissions, getProgressionState, addXp, recordCaseOpen, getNextLevelReward } from './store/progression.js';
import { add as addInventoryItem, getAll as getInventoryItems, sell as sellInventoryItem, remove as removeInventoryItem } from './store/inventory.js';
import { recordOpenResult, getBestDrop, getRecent } from './store/history.js';
import { getBalance, earn, spend, canAfford } from './store/wallet.js';
import { ensureGuestSession } from './auth/session.js';
import { ensureAuthSession } from './auth/authModal.js';
import { canOpenCase, recordOpenAttempt } from './utils/rateLimiter.js';
import { recordOpen, getSessionCount } from './utils/responsible.js';
import { track } from './utils/analytics.js';
import { sound, preload, play, setMuted } from './utils/sound.js';
import { renderCaseGrid } from './ui/caseGrid.js';
import { renderSpinner } from './ui/spinner.js';
import { renderCasePreview } from './ui/casePreview.js';
import { renderResultModal } from './ui/resultModal.js';
import { renderInventory } from './ui/inventory.js';
import { renderTradeUpPanel } from './ui/tradeUpPanel.js';
import { openTradeUpReveal } from './ui/tradeUpReveal.js';
import { previewTradeUp } from './engine/tradeup.js';
import { openShowcaseModal } from './ui/showcaseModal.js';
import { focusTrap } from './utils/focusTrap.js';
import { renderProgressPanel } from './ui/progressPanel.js';
import { show as showToast } from './ui/notifications.js';
import { openCase } from './engine/caseEngine.js';

const caseGrid = document.getElementById('caseGrid');
const progressPanel = document.getElementById('progressPanel');
const tradeUpPanel = document.getElementById('tradeUpPanel');
const tradeUpWindow = document.getElementById('tradeUpWindow');
const openTradeUpBtn = document.getElementById('openTradeUpBtn');
const closeTradeUpWindowBtn = document.getElementById('closeTradeUpWindowBtn');
const caseWindow = document.getElementById('caseWindow');
const spinnerContainer = document.getElementById('spinnerContainer');
const casePreview = document.getElementById('casePreview');
const selectedCaseName = document.getElementById('selectedCaseName');
const inventoryBtn = document.getElementById('inventoryBtn');
const openBtn = document.getElementById('openBtn');
const batchResults = document.getElementById('batchResults');
const resultModal = document.getElementById('resultModal');
const inventoryWindow = document.getElementById('inventoryWindow');
const inventoryGrid = document.getElementById('inventoryGrid');
const inventoryCount = document.getElementById('inventoryCount');
const totalOpenedLabel = document.getElementById('totalOpened');
const bestDropLabel = document.getElementById('bestDrop');
const closeCaseWindowBtn = document.getElementById('closeCaseWindowBtn');
const closeInventoryBtn = document.getElementById('closeInventoryBtn');
const statusOnline = document.getElementById('statusOnline');
const statusSessionEv = document.getElementById('statusSessionEv');
const statusLastRare = document.getElementById('statusLastRare');

let selectedCaseId = CASES[0]?.id ?? null;

ensureGuestSession();
await ensureAuthSession();

const footer = document.createElement('footer');
footer.className = 'site-footer shell';
footer.textContent = 'This is a free simulator. No real money is involved. Not affiliated with Valve Corporation.';
document.body.appendChild(footer);

function renderAll() {
  renderCaseGrid(caseGrid, CASES, selectedCaseId, handleSelectCase);
  renderInventoryPanel();
  renderProgress();
  renderStats();
  syncSelectedCaseSelection();
}

function handleSelectCase(caseId) {
  selectedCaseId = caseId;
  const caseData = getCaseById(caseId);
  selectedCaseName.textContent = caseData?.name ?? 'No Case Selected';
  showPreviewState(caseData);
  openCaseWindow();
  renderCaseGrid(caseGrid, CASES, selectedCaseId, handleSelectCase);
}

function showPreviewState(caseData) {
  if (caseData) {
    renderCasePreview(casePreview, caseData);
  }
  casePreview.classList.remove('hidden');
  spinnerContainer.classList.add('hidden');
  spinnerContainer.innerHTML = '';
  updateOpenButton(caseData);
}

function updateOpenButton(caseData) {
  if (!caseData) {
    openBtn.disabled = true;
    openBtn.textContent = 'Open Case';
    return;
  }
  const price = Number(caseData.keyPrice) || 0;
  const affordable = canAfford(price);
  openBtn.disabled = !affordable;
  openBtn.textContent = affordable
    ? `Open Case · €${price.toFixed(2)}`
    : `Need €${price.toFixed(2)}`;
}

function showSpinnerState() {
  casePreview.classList.add('hidden');
  spinnerContainer.classList.remove('hidden');
}

function syncSelectedCaseSelection() {
  renderCaseGrid(caseGrid, CASES, selectedCaseId, handleSelectCase);
}

let caseWindowTrap = null;
let inventoryWindowTrap = null;

function openCaseWindow() {
  caseWindow.classList.remove('hidden');
  caseWindow.setAttribute('aria-hidden', 'false');
  caseWindowTrap?.deactivate();
  caseWindowTrap = focusTrap(caseWindow);
  caseWindowTrap.activate();
}

function closeCaseWindow() {
  caseWindow.classList.add('hidden');
  caseWindow.setAttribute('aria-hidden', 'true');
  caseWindowTrap?.deactivate();
  caseWindowTrap = null;
}

function openInventoryWindow() {
  renderInventoryPanel();
  inventoryWindow.classList.remove('hidden');
  inventoryWindow.setAttribute('aria-hidden', 'false');
  inventoryWindowTrap?.deactivate();
  inventoryWindowTrap = focusTrap(inventoryWindow);
  inventoryWindowTrap.activate();
}

function closeInventoryWindow() {
  inventoryWindow.classList.add('hidden');
  inventoryWindow.setAttribute('aria-hidden', 'true');
  inventoryWindowTrap?.deactivate();
  inventoryWindowTrap = null;
}

let tradeUpWindowTrap = null;
function openTradeUpWindow() {
  renderTradeUp();
  tradeUpWindow.classList.remove('hidden');
  tradeUpWindow.setAttribute('aria-hidden', 'false');
  tradeUpWindowTrap?.deactivate();
  tradeUpWindowTrap = focusTrap(tradeUpWindow);
  tradeUpWindowTrap.activate();
}

function closeTradeUpWindow() {
  tradeUpWindow.classList.add('hidden');
  tradeUpWindow.setAttribute('aria-hidden', 'true');
  tradeUpWindowTrap?.deactivate();
  tradeUpWindowTrap = null;
}

async function openSelectedCase() {
  const gate = canOpenCase();
  if (!gate.allowed) {
    showToast(`You can open again in ${Math.ceil(gate.resetInMs / 1000)}s`, 'warning');
    return;
  }

  if (!selectedCaseId) {
    return;
  }

  const caseData = getCaseById(selectedCaseId);
  if (!caseData) {
    return;
  }

  const price = Number(caseData.keyPrice) || 0;
  if (!spend(price, 'open_case')) {
    showToast(`Not enough balance — need €${price.toFixed(2)}. Sell some skins!`, 'warning');
    return;
  }

  let committed = false;
  try {
    recordOpenAttempt();
    const result = await openCase(selectedCaseId, null);
    result.caseName = caseData.name;
    selectedCaseName.textContent = caseData.name;
    openBtn.disabled = true;
    openBtn.textContent = 'Opening…';
    // Swap preview → spinner with a brief fade so the reel doesn't pop in instantly.
    showSpinnerState();
    await new Promise((r) => setTimeout(r, 220));
    await renderSpinner(spinnerContainer, caseData, result, {});
    await new Promise((r) => setTimeout(r, 650));
    renderResultModal(resultModal, result, {
      // Store mutations emit CustomEvents that re-render inventory/progress;
      // don't manually call render* here or you get a double render.
      onKeep: () => {
        addInventoryItem(result);
        resultModal.classList.add('hidden');
        showPreviewState(caseData);
        showToast(`Kept: ${result.item.name}`, 'success');
      },
      onSell: (_result, salePrice) => {
        earn(salePrice, 'instant_sell');
        resultModal.classList.add('hidden');
        showPreviewState(caseData);
        showToast(`Sold for €${salePrice.toFixed(2)}`, 'success');
      },
    });

    committed = true;
    recordOpenResult(result, caseData.name);

    const xpResult = addXp(50);
    if (xpResult?.leveledUp) {
      showToast(`Level ${xpResult.newLevel} reached!`, 'success');
      for (const r of xpResult.rewardsGranted ?? []) {
        showToast(`Milestone bonus: +€${r.coins.toFixed(2)} (level ${r.level})`, 'success');
      }
    }
    recordOpen();
    const completed = recordCaseOpen({ caseId: caseData.id, rarity: result.item.rarity });
    for (const mission of completed) {
      showToast(`Mission complete: ${mission.label} (+€${mission.reward.coins.toFixed(2)}, +${mission.reward.xp} XP)`, 'success');
    }
    play(result.statTrak ? 'legendary' : 'reveal');
    track('case_opened', {
      caseId: selectedCaseId,
      rarity: result.item.rarity,
      wear: result.wear,
      float: result.float,
      statTrak: result.statTrak,
      sessionOpenCount: getSessionCount(),
    });
    renderProgress();
  } catch (error) {
    if (!committed) {
      earn(price, 'open_case_refund');
      showToast('Open failed. Balance refunded. Please try again.', 'warning');
      showPreviewState(caseData);
    }
    console.error('Case open failed', error);
  }
}

function renderInventoryPanel() {
  const items = getInventoryItems();
  renderInventory(inventoryGrid, items, {
    onSelect: (uid) => {
      const item = items.find((entry) => entry.uid === uid);
      if (!item) return;
      openShowcaseModal(item, {
        onSell: (sellUid, salePrice) => {
          const { coins } = sellInventoryItem(sellUid);
          showToast(`Sold ${item.name} for €${(coins || salePrice).toFixed(2)}`, 'success');
        },
        onShareFailed: (text) => showToast(`Copy failed — text: ${text}`, 'warning'),
      });
    },
    onSell: (uid) => {
      const item = items.find((entry) => entry.uid === uid);
      if (!item) return;
      const { coins } = sellInventoryItem(uid);
      // sell() emits inventory:changed + wallet:changed, which trigger
      // renderInventoryPanel + renderProgress — no manual re-render needed.
      showToast(`Sold ${item.name} for €${coins.toFixed(2)}`, 'success');
    },
  });
  inventoryCount.textContent = `(${items.length} items)`;
  inventoryBtn.textContent = `Inventory (${items.length})`;
  // Trade-up panel mirrors the inventory state.
  renderTradeUp();
}

function renderTradeUp() {
  const items = getInventoryItems();
  renderTradeUpPanel(tradeUpPanel, items, {
    onError: (reason) => showToast(reason, 'warning'),
    onComplete: (tradeUp, inputs) => {
      // Close the trade-up window so the reveal overlay is unambiguously on top.
      closeTradeUpWindow();
      // Build the candidate pool from previewTradeUp so the spinner has plenty
      // of variety to roll past. Always include the winner.
      const preview = previewTradeUp(inputs);
      const poolFromPreview = preview.outputs.map((o) => o.item);
      const pool = poolFromPreview.length > 0 ? poolFromPreview : [tradeUp.resultItem];

      openTradeUpReveal({
        pool,
        result: tradeUp,
        onKeep: (openResult) => {
          for (const it of inputs) removeInventoryItem(it.uid);
          addInventoryItem(openResult);
          showToast(`Kept: ${openResult.item.name}`, 'success');
        },
        onSell: (openResult, salePrice) => {
          for (const it of inputs) removeInventoryItem(it.uid);
          earn(salePrice, 'trade_up_sell');
          showToast(`Sold ${openResult.item.name} for €${salePrice.toFixed(2)}`, 'success');
        },
      });
    },
  });
}

function renderProgress() {
  const state = getProgressionState();
  renderProgressPanel(progressPanel, state, getBalance(), {
    nextReward: getNextLevelReward(state.level),
    onMidnight: () => renderProgress(),
    onClaimDaily: () => {
      const claim = claimDailyReward();
      if (claim) {
        showToast(`Daily reward claimed: +€${claim.coins.toFixed(2)}`, 'success');
        renderProgress();
      }
    },
  });
}

function renderStats() {
  totalOpenedLabel.textContent = `Opened: ${getSessionCount()}`;
  const best = getBestDrop({ sinceMs: 7 * 24 * 60 * 60 * 1000 });
  const recentRare = getRecent(40).find((entry) =>
    ['classified', 'covert', 'extraordinary'].includes(entry.rarity),
  );

  if (statusOnline) {
    statusOnline.textContent = `Online feed · ${CASES.length} cases`; 
    statusOnline.classList.add('is-live');
  }

  if (statusSessionEv) {
    statusSessionEv.textContent = `€${getBalance().toFixed(2)} balance`;
  }

  if (statusLastRare) {
    statusLastRare.textContent = recentRare
      ? `${recentRare.itemName} (${recentRare.rarity})`
      : 'No rare drop yet';
    statusLastRare.title = recentRare
      ? `${recentRare.caseName} · ${recentRare.wear ?? ''}`
      : '';
  }

  if (best) {
    bestDropLabel.textContent = `Best (7d): ${best.itemName} (€${best.basePrice.toFixed(2)})`;
    bestDropLabel.title = `${best.caseName} · ${best.wear ?? ''}`;
  } else {
    bestDropLabel.textContent = `Balance: €${getBalance().toFixed(2)}`;
    bestDropLabel.title = '';
  }
}

inventoryBtn.addEventListener('click', openInventoryWindow);
openBtn.addEventListener('click', () => openSelectedCase());
closeCaseWindowBtn.addEventListener('click', closeCaseWindow);
closeInventoryBtn.addEventListener('click', closeInventoryWindow);
openTradeUpBtn?.addEventListener('click', openTradeUpWindow);
closeTradeUpWindowBtn?.addEventListener('click', closeTradeUpWindow);

caseWindow.addEventListener('click', (event) => {
  if (event.target === caseWindow) {
    closeCaseWindow();
  }
});

inventoryWindow.addEventListener('click', (event) => {
  if (event.target === inventoryWindow) {
    closeInventoryWindow();
  }
});

tradeUpWindow?.addEventListener('click', (event) => {
  if (event.target === tradeUpWindow) {
    closeTradeUpWindow();
  }
});

// Result modal is intentionally non-dismissible — the user must choose
// Keep or Sell. Backdrop click / Escape are ignored while it's open.

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  // Result modal can't be dismissed with Escape — must choose Keep or Sell.
  if (!resultModal.classList.contains('hidden')) {
    return;
  }

  if (!tradeUpWindow?.classList.contains('hidden')) {
    closeTradeUpWindow();
    return;
  }

  if (!inventoryWindow.classList.contains('hidden')) {
    closeInventoryWindow();
    return;
  }

  if (!caseWindow.classList.contains('hidden')) {
    closeCaseWindow();
  }
});

window.addEventListener('wallet:changed', () => {
  renderProgress();
  renderStats();
  // Affordability of the currently-selected case may have flipped.
  updateOpenButton(getCaseById(selectedCaseId));
});
window.addEventListener('progression:updated', renderProgress);
window.addEventListener('inventory:changed', renderInventoryPanel);
window.addEventListener('history:changed', renderStats);

document.addEventListener('pointerdown', () => {
  sound.init();
  preload();
}, { once: true });

const muteBtn = document.getElementById('muteBtn');
function syncMuteBtn() {
  if (!muteBtn) return;
  const muted = sound.isMuted();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
}
muteBtn?.addEventListener('click', () => {
  setMuted(!sound.isMuted());
  syncMuteBtn();
});
window.addEventListener('sound:changed', syncMuteBtn);
syncMuteBtn();

// Track pointer position on .open-btn so the CSS ::after radial highlight
// follows the cursor. rAF-throttled so we do at most one DOM read/write per
// frame instead of one per pixel.
let pendingPointer = null;
document.addEventListener('pointermove', (event) => {
  const btn = event.target?.closest?.('.open-btn');
  if (!btn) return;
  if (pendingPointer) {
    pendingPointer.btn = btn;
    pendingPointer.x = event.clientX;
    pendingPointer.y = event.clientY;
    return;
  }
  pendingPointer = { btn, x: event.clientX, y: event.clientY };
  requestAnimationFrame(() => {
    const p = pendingPointer;
    pendingPointer = null;
    if (!p?.btn?.isConnected) return;
    const rect = p.btn.getBoundingClientRect();
    p.btn.style.setProperty('--rx', `${((p.x - rect.left) / rect.width) * 100}%`);
    p.btn.style.setProperty('--ry', `${((p.y - rect.top) / rect.height) * 100}%`);
  });
});

renderAll();
showToast(`Welcome back. ${CASES.length} cases loaded.`, 'info');
track('app_loaded', { cases: CASES.length, isGuest: true });

