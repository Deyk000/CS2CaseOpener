// Roulette-style spinner.
//
// Correctness rule: the element that ends up centered under the gold indicator
// MUST be the one whose item === openResult.item. We achieve that by:
//   1. Putting the winning item at a known index in the reel array.
//   2. After layout, asking the browser for the *actual* DOM rect of that
//      element and the indicator, and computing the transform that aligns
//      their centers — never re-deriving from "index * assumedWidth".

// Visual-only weighting for the reel fillers. Cosmetic — does NOT affect drop
// odds (those live in rng.js). The roulette should look like it has lots of
// blues/purples whizzing by and only the occasional red/gold, which matches
// how the actual game's UI feels.
const FILLER_WEIGHT_BY_RARITY = {
  consumer: 60,
  industrial: 50,
  milspec: 50,         // blue — most common visually
  restricted: 28,      // purple
  classified: 8,       // pink
  covert: 2,           // red
  extraordinary: 1,    // gold (knife/glove)
};

function weightedRandom(items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickFillers(caseData, count) {
  const pool = [...caseData.items, ...caseData.specialPool];
  if (pool.length === 0) return [];
  const weightFn = (item) => FILLER_WEIGHT_BY_RARITY[item.rarity] ?? 10;
  return Array.from({ length: count }, () => weightedRandom(pool, weightFn));
}

export function renderSpinner(container, caseData, openResult, options = {}) {
  const duration = options.batch ? 3200 : 7200;
  const prefixCount = options.batch ? 28 : 46;
  const suffixCount = options.batch ? 16 : 24;

  const reelItems = [
    ...pickFillers(caseData, prefixCount),
    openResult.item,
    ...pickFillers(caseData, suffixCount),
  ];
  const landingIndex = prefixCount;

  container.innerHTML = `
    <div class="reel-container">
      <div class="reel-indicator" aria-hidden="true"></div>
      <div class="reel-fade reel-fade-left" aria-hidden="true"></div>
      <div class="reel-fade reel-fade-right" aria-hidden="true"></div>
      <div class="reel-overflow">
        <div class="reel">
          ${reelItems
            .map(
              (item, index) => `
                <article class="reel-item${index === landingIndex ? ' is-winner' : ''}" data-index="${index}" data-rarity="${item.rarity}">
                  <div class="reel-item-art">
                    <img src="${item.image}" alt="${item.name}" loading="eager" />
                  </div>
                  <div class="reel-item-name">${item.name}</div>
                </article>
              `,
            )
            .join('')}
        </div>
      </div>
    </div>
  `;

  const reelContainer = container.querySelector('.reel-container');
  const reel = container.querySelector('.reel');
  const indicator = container.querySelector('.reel-indicator');
  const winnerEl = container.querySelector(`.reel-item[data-index="${landingIndex}"]`);

  if (!reel || !winnerEl || !reelContainer || !indicator) {
    return Promise.resolve();
  }

  // Respect prefers-reduced-motion by shortening the spin, not skipping it.
  // Seeing which skin won IS the whole point of the app; we just dial it down
  // from a 5s physics-y reel to a quick ~1.2s ease.
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const effectiveDuration = reducedMotion ? 1200 : duration;

  if (options.skipAnimation === true) {
    // Explicit opt-out (used by batch flows / tests): snap to the winner.
    requestAnimationFrame(() => {
      const containerRect = reelContainer.getBoundingClientRect();
      const winnerRect = winnerEl.getBoundingClientRect();
      const indicatorRect = indicator.getBoundingClientRect();
      const delta = (winnerRect.left + winnerRect.width / 2) - (indicatorRect.left + indicatorRect.width / 2);
      reel.style.transition = 'none';
      reel.style.transform = `translate3d(${-delta}px, 0, 0)`;
      winnerEl.classList.add('reveal');
    });
    return Promise.resolve();
  }

  // Compute landing transform from real DOM measurements.
  function computeLanding() {
    // Reset any prior transform so measurements are taken from the natural layout.
    reel.style.transition = 'none';
    reel.style.transform = 'translate3d(0, 0, 0)';
    // Force reflow.
    void reel.offsetHeight;

    const containerRect = reelContainer.getBoundingClientRect();
    const winnerRect = winnerEl.getBoundingClientRect();
    const indicatorRect = indicator.getBoundingClientRect();

    const winnerCenterX = winnerRect.left + winnerRect.width / 2;
    const indicatorCenterX = indicatorRect.left + indicatorRect.width / 2;

    // Add a tiny per-spin jitter (±35% of slot width) so it doesn't feel
    // mechanically perfect, but stays clearly inside the winning slot.
    const jitter = (Math.random() - 0.5) * winnerRect.width * 0.35;

    // How far we need to shift the reel left so the winner sits under the indicator.
    const delta = winnerCenterX - indicatorCenterX + jitter;
    return { toX: -delta, fromX: Math.max(containerRect.width * 0.5, 240) };
  }

  return new Promise((resolve) => {
    // Wait for the winner image to actually load so we measure final layout.
    const winnerImg = winnerEl.querySelector('img');
    const ready = winnerImg && !winnerImg.complete
      ? new Promise((r) => {
          const done = () => r();
          winnerImg.addEventListener('load', done, { once: true });
          winnerImg.addEventListener('error', done, { once: true });
          // Hard cap in case the image takes forever.
          setTimeout(done, 600);
        })
      : Promise.resolve();

    ready.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const { toX, fromX } = computeLanding();

          reel.style.setProperty('--spin-from', `${fromX}px`);
          reel.style.setProperty('--spin-to', `${toX}px`);
          reel.style.setProperty('--spin-duration', `${effectiveDuration}ms`);
          reel.classList.add('spinning');

          // After animation: lock to the exact position and add a small settle bounce.
          window.setTimeout(() => {
            reel.classList.remove('spinning');
            reel.style.transition = 'transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1)';
            reel.style.transform = `translate3d(${toX}px, 0, 0)`;
            winnerEl.classList.add('reveal');
            resolve();
          }, effectiveDuration);
        });
      });
    });
  });
}
