import { CASES } from './data/skins.js';
import { rollDrop } from './utils/probability.js';
import { Spinner } from './components/Spinner.js';
import { Inventory } from './components/Inventory.js';
import { renderCaseSelector } from './components/CaseSelector.js';
import { renderResultModal } from './components/ResultModal.js';
import { sound } from './utils/sound.js';

const STATS_KEY = 'cs2_opener_stats';

let selectedCase = null;
let pendingResult = null;

const state = loadStats();

const caseGrid = document.getElementById('caseGrid');
const spinnerSection = document.getElementById('spinnerSection');
const spinnerContainer = document.getElementById('spinnerContainer');
const selectedCaseName = document.getElementById('selectedCaseName');
const openBtn = document.getElementById('openBtn');
const openX10Btn = document.getElementById('openX10Btn');
const batchResults = document.getElementById('batchResults');
const resultModal = document.getElementById('resultModal');
const inventoryGrid = document.getElementById('inventoryGrid');
const inventoryCount = document.getElementById('inventoryCount');
const totalOpenedLabel = document.getElementById('totalOpened');
const bestDropLabel = document.getElementById('bestDrop');
const closeResultBtn = document.getElementById('closeResultBtn');
const clearInventoryBtn = document.getElementById('clearInventoryBtn');

const spinner = new Spinner(spinnerContainer);
const inventory = new Inventory();

buildCaseGrid();
renderStats();
renderInventory();

openBtn.addEventListener('click', openSingleCase);
openX10Btn.addEventListener('click', openTenCases);
closeResultBtn.addEventListener('click', closeResultModal);
clearInventoryBtn.addEventListener('click', () => {
  inventory.clear();
  renderInventory();
});

function buildCaseGrid() {
  renderCaseSelector(caseGrid, CASES, (card) => {
    sound.init();
    sound.playClick();

    caseGrid.querySelectorAll('.case-card').forEach((element) => element.classList.remove('active'));
    card.classList.add('active');

    selectedCase = card.dataset.case;
    selectedCaseName.textContent = selectedCase;
    spinnerSection.classList.remove('hidden');
    batchResults.classList.add('hidden');
    batchResults.innerHTML = '';
  });
}

function openSingleCase() {
  if (!selectedCase || spinner.isSpinning) {
    return;
  }

  sound.init();
  sound.playSpinStart();

  const result = rollDrop(selectedCase, CASES);
  const caseData = CASES[selectedCase];
  const allSkins = caseData.displayItems || [...caseData.skins, ...(caseData.specialItemPool || [])];

  setOpenButtons(false);

  spinner.spin(allSkins, result.skin, () => {
    pendingResult = result;

    if (result.skin.rarity.name === 'Rare Special Item') {
      sound.playRareWin();
    } else {
      sound.playWin();
    }

    showResult(result);
    setOpenButtons(true);
  });
}

function openTenCases() {
  if (!selectedCase || spinner.isSpinning) {
    return;
  }

  sound.init();
  sound.playClick();

  const results = Array.from({ length: 10 }, () => rollDrop(selectedCase, CASES));
  inventory.addMany(results);

  for (const result of results) {
    trackResult(result);
  }

  renderBatchResults(results);
  renderInventory();
  renderStats();
}

function showResult(result) {
  const modalView = renderResultModal(result);
  const rarityBanner = document.getElementById('resultRarityBanner');
  const resultImage = document.getElementById('resultImage');
  const resultName = document.getElementById('resultName');
  const resultWear = document.getElementById('resultWear');
  const resultFloat = document.getElementById('resultFloat');
  const resultStattrak = document.getElementById('resultStattrak');

  rarityBanner.textContent = modalView.rarityText;
  rarityBanner.style.backgroundColor = `${modalView.rarityColor}33`;
  rarityBanner.style.color = modalView.rarityColor;

  resultImage.src = modalView.image;
  resultImage.alt = modalView.name;

  resultName.textContent = modalView.name;
  resultName.style.color = modalView.rarityColor;
  resultWear.textContent = modalView.wear;
  resultFloat.textContent = `Float: ${modalView.floatValue}`;

  if (modalView.isStatTrak) {
    resultStattrak.classList.remove('hidden');
  } else {
    resultStattrak.classList.add('hidden');
  }

  resultModal.classList.remove('hidden');
}

function closeResultModal() {
  resultModal.classList.add('hidden');

  if (!pendingResult) {
    return;
  }

  inventory.add(pendingResult);
  trackResult(pendingResult);

  pendingResult = null;
  renderInventory();
  renderStats();
}

function setOpenButtons(enabled) {
  openBtn.disabled = !enabled;
  openX10Btn.disabled = !enabled;
}

function renderInventory() {
  inventory.render(inventoryGrid);
  inventoryCount.textContent = `(${inventory.items.length} items)`;
}

function renderStats() {
  totalOpenedLabel.textContent = `Opened: ${state.totalOpened}`;
  bestDropLabel.textContent = `Best: ${state.bestDrop}`;
}

function renderBatchResults(results) {
  batchResults.classList.remove('hidden');

  batchResults.innerHTML = `
    <h3>Latest x10 Results</h3>
    <div class="batch-grid">
      ${results
        .map(
          (result) => `
            <article class="batch-item" style="border-color:${result.skin.rarity.color}">
              <strong style="color:${result.skin.rarity.color}">${result.skin.name}</strong>
              <div>${result.wear.name}</div>
              <div>${result.isStatTrak ? 'StatTrak' : 'Normal'}</div>
            </article>
          `,
        )
        .join('')}
    </div>
  `;
}

function trackResult(result) {
  state.totalOpened += 1;

  if (isBetterRarity(result.skin.rarity.name, state.bestRarityName)) {
    state.bestRarityName = result.skin.rarity.name;
    state.bestDrop = result.skin.name;
  }

  saveStats(state);
}

function isBetterRarity(next, current) {
  const score = {
    'Consumer Grade': 1,
    'Industrial Grade': 2,
    'Mil-Spec Grade': 3,
    Restricted: 4,
    Classified: 5,
    Covert: 6,
    'Rare Special Item': 7,
  };

  return (score[next] ?? 0) > (score[current] ?? 0);
}

function loadStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATS_KEY));
    if (!parsed || typeof parsed !== 'object') {
      return { totalOpened: 0, bestDrop: 'None', bestRarityName: '' };
    }

    return {
      totalOpened: Number(parsed.totalOpened) || 0,
      bestDrop: parsed.bestDrop || 'None',
      bestRarityName: parsed.bestRarityName || '',
    };
  } catch {
    return { totalOpened: 0, bestDrop: 'None', bestRarityName: '' };
  }
}

function saveStats(value) {
  localStorage.setItem(STATS_KEY, JSON.stringify(value));
}
