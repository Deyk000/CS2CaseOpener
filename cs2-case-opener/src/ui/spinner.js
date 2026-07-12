import { play } from '../utils/sound.js';

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

  container.textContent = '';

  const reelContainer = document.createElement('div');
  reelContainer.className = 'reel-container';

  const indicator = document.createElement('div');
  indicator.className = 'reel-indicator';
  indicator.setAttribute('aria-hidden', 'true');

  const fadeLeft = document.createElement('div');
  fadeLeft.className = 'reel-fade reel-fade-left';
  fadeLeft.setAttribute('aria-hidden', 'true');

  const fadeRight = document.createElement('div');
  fadeRight.className = 'reel-fade reel-fade-right';
  fadeRight.setAttribute('aria-hidden', 'true');

  const reelOverflow = document.createElement('div');
  reelOverflow.className = 'reel-overflow';

  const reel = document.createElement('div');
  reel.className = 'reel';

  reelItems.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = `reel-item${index === landingIndex ? ' is-winner' : ''}`;
    article.dataset.index = index;
    article.dataset.rarity = item.rarity;

    const art = document.createElement('div');
    art.className = 'reel-item-art';
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    img.loading = 'eager';
    art.appendChild(img);

    const name = document.createElement('div');
    name.className = 'reel-item-name';
    name.textContent = item.name;

    article.append(art, name);
    reel.appendChild(article);
  });

  reelOverflow.appendChild(reel);
  reelContainer.append(indicator, fadeLeft, fadeRight, reelOverflow);
  container.appendChild(reelContainer);

  const winnerEl = reel.querySelector(`.reel-item[data-index="${landingIndex}"]`);

  if (!reel || !winnerEl || !reelContainer || !indicator) {
    return Promise.resolve();
  }

  // Respect prefers-reduced-motion by shortening the spin, not skipping it.
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const effectiveDuration = reducedMotion ? 1200 : duration;

  if (options.skipAnimation === true) {
    requestAnimationFrame(() => {
      const winnerRect = winnerEl.getBoundingClientRect();
      const indicatorRect = indicator.getBoundingClientRect();
      const delta = (winnerRect.left + winnerRect.width / 2) - (indicatorRect.left + indicatorRect.width / 2);
      reel.style.transition = 'none';
      reel.style.transform = `translate3d(${-delta}px, 0, 0)`;
      winnerEl.classList.add('reveal');
    });
    return Promise.resolve();
  }

  function computeLanding() {
    reel.style.transition = 'none';
    reel.style.transform = 'translate3d(0, 0, 0)';
    void reel.offsetHeight;

    const containerRect = reelContainer.getBoundingClientRect();
    const winnerRect = winnerEl.getBoundingClientRect();
    const indicatorRect = indicator.getBoundingClientRect();

    const winnerCenterX = winnerRect.left + winnerRect.width / 2;
    const indicatorCenterX = indicatorRect.left + indicatorRect.width / 2;
    const jitter = (Math.random() - 0.5) * winnerRect.width * 0.35;
    const delta = winnerCenterX - indicatorCenterX + jitter;
    return { toX: -delta, fromX: Math.max(containerRect.width * 0.5, 240) };
  }

  return new Promise((resolve) => {
    const winnerImg = winnerEl.querySelector('img');
    const ready = winnerImg && !winnerImg.complete
      ? new Promise((r) => {
          const done = () => r();
          winnerImg.addEventListener('load', done, { once: true });
          winnerImg.addEventListener('error', done, { once: true });
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
          
          let lastCenteredIndex = -1;
          let active = true;

          function trackTicks() {
            if (!active) return;
            const indicatorRect = indicator.getBoundingClientRect();
            const indicatorCenter = indicatorRect.left + indicatorRect.width / 2;

            const items = reel.querySelectorAll('.reel-item');
            let currentCenteredIndex = -1;

            for (let i = 0; i < items.length; i++) {
              const rect = items[i].getBoundingClientRect();
              if (indicatorCenter >= rect.left && indicatorCenter <= rect.right) {
                currentCenteredIndex = i;
                break;
              }
            }

            if (currentCenteredIndex !== -1 && currentCenteredIndex !== lastCenteredIndex) {
              lastCenteredIndex = currentCenteredIndex;
              const itemEl = items[currentCenteredIndex];
              const rarity = itemEl.dataset.rarity;

              if (rarity === 'covert' || rarity === 'extraordinary') {
                play('rare');
                indicator.classList.add('near-win-flash');
                setTimeout(() => indicator.classList.remove('near-win-flash'), 150);
              } else {
                play('tick');
              }
            }
            requestAnimationFrame(trackTicks);
          }

          reel.classList.add('spinning');
          requestAnimationFrame(trackTicks);

          window.setTimeout(() => {
            active = false;
            reel.classList.remove('spinning');
            reel.style.transition = 'transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1)';
            reel.style.transform = `translate3d(${toX}px, 0, 0)`;
            winnerEl.classList.add('reveal');
            
            // Play stinger sound depending on rarity
            const rarity = openResult.item.rarity;
            if (rarity === 'extraordinary') {
              play('legendary');
            } else if (rarity === 'covert' || rarity === 'classified') {
              play('reveal');
            } else {
              play('levelup');
            }

            resolve();
          }, effectiveDuration);
        });
      });
    });
  });
}
