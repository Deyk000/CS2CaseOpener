import { assetPath } from '../utils/assetPath.js';

const REEL_ITEMS = 60;
const SPIN_DURATION_MS = 8000;

export class Spinner {
  constructor(container) {
    this.container = container;
    this.isSpinning = false;
  }

  spin(skinPool, winningSkin, onComplete) {
    if (this.isSpinning) {
      return;
    }

    this.isSpinning = true;
    this.container.innerHTML = this.buildSpinnerHTML();

    const reel = this.container.querySelector('.reel');
    const winnerIndex = REEL_ITEMS - 10;
    const items = this.generateReelItems(skinPool, winningSkin, REEL_ITEMS, winnerIndex);

    reel.innerHTML = items.map((skin) => this.buildSkinCard(skin)).join('');
    reel.getBoundingClientRect();

    const firstItem = reel.querySelector('.reel-item');
    const itemWidth = firstItem.getBoundingClientRect().width;
    const stepWidth = itemWidth + this.getReelGap(reel);
    const containerWidth = this.container.querySelector('.reel-container').clientWidth;

    const targetOffset = -(winnerIndex * stepWidth - (containerWidth - itemWidth) / 2);
    const jitter = (Math.random() - 0.5) * 80;

    reel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.09, 0.8, 0.22, 1)`;
    reel.style.transform = `translateX(${targetOffset + jitter}px)`;

    window.setTimeout(() => {
      this.highlightWinner(reel, winnerIndex);
      this.isSpinning = false;
      onComplete(winningSkin);
    }, SPIN_DURATION_MS + 20);
  }

  generateReelItems(pool, winner, total, winnerIndex) {
    const items = [];

    for (let i = 0; i < total; i += 1) {
      if (i === winnerIndex) {
        items.push(winner);
      } else {
        items.push(pool[Math.floor(Math.random() * pool.length)]);
      }
    }

    return items;
  }

  buildSpinnerHTML() {
    return `
      <div class="spinner-wrapper">
        <div class="reel-container">
          <div class="reel-indicator"></div>
          <div class="reel-overflow">
            <div class="reel"></div>
          </div>
        </div>
      </div>
    `;
  }

  buildSkinCard(skin) {
    return `
      <article class="reel-item" style="border-color:${skin.rarity.color}">
        <img src="${assetPath('skins', skin.image)}" alt="${skin.name}" />
        <span class="reel-item-name">${skin.name}</span>
      </article>
    `;
  }

  highlightWinner(reel, winnerIndex) {
    const items = reel.querySelectorAll('.reel-item');
    const winner = items[winnerIndex];
    if (winner) {
      winner.classList.add('winner');
    }
  }

  getReelGap(reel) {
    const gap = window.getComputedStyle(reel).gap || window.getComputedStyle(reel).columnGap || '0px';
    return Number.parseFloat(gap) || 0;
  }
}
