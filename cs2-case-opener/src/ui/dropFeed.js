// Live Drop Feed component.
// Simulates live case opening drops by other virtual players.

import { CASES } from '../data/cases.js';

const PLAYER_NAMES = [
  'Xizt', 'GeT_RiGhT', 'f0rest', 'Friberg', 'Fifflaren', 'KennyS', 'ZywOo', 's1mple', 'dev1ce',
  'tarik', 'Stewie2k', 'shox', 'ScreaM', 'pashaBiceps', 'Snax', 'byali', 'NEO', 'TaZ', 'NiKo',
  'coldzera', 'Fallen', 'fer', 'fnx', 'TACO', 'olofmeister', 'KRIMZ', 'JW', 'flusha', 'pronax',
  'shroud', 'n0thing', 'Skadoodle', 'autimatic', 'RUSH', 'ELiGE', 'nitr0', 'twistzz', 'NAF'
];

const RARITY_COLORS = {
  consumer: '#b0c3d9',
  industrial: '#5e98d9',
  milspec: '#4b69ff',
  restricted: '#8847ff',
  classified: '#d32ce6',
  covert: '#eb4b4b',
  extraordinary: '#e4ae39',
};

class LiveDropFeed {
  constructor(container) {
    this.container = container;
    this.drops = [];
    this.maxDrops = 6;
    this.intervalId = null;
  }

  start() {
    if (this.intervalId) return;

    // Seed initial drops
    for (let i = 0; i < 3; i++) {
      this.generateRandomDrop();
    }
    this.render();

    // Periodically add new drops
    const tick = () => {
      this.generateRandomDrop();
      this.render();
      const nextDelay = 3000 + Math.random() * 4000; // 3-7s delay
      this.intervalId = setTimeout(tick, nextDelay);
    };
    this.intervalId = setTimeout(tick, 3000);
  }

  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  generateRandomDrop() {
    // Choose a random case
    const caseData = CASES[Math.floor(Math.random() * CASES.length)];
    if (!caseData || !caseData.items || caseData.items.length === 0) return;

    // Simulate opening logic visually
    // Odds: Mil-spec 79.9%, Restricted 16%, Classified 3.2%, Covert 0.64%, Extraordinary 0.26%
    const roll = Math.random() * 100;
    let targetRarity = 'milspec';

    if (roll < 0.26) {
      targetRarity = 'extraordinary';
    } else if (roll < 0.9) {
      targetRarity = 'covert';
    } else if (roll < 4.1) {
      targetRarity = 'classified';
    } else if (roll < 20.1) {
      targetRarity = 'restricted';
    }

    // Filter items in the case
    let pool = caseData.items.filter((item) => item.rarity === targetRarity);
    if (pool.length === 0 && targetRarity === 'extraordinary') {
      pool = caseData.specialPool ?? [];
    }
    if (pool.length === 0) {
      pool = caseData.items;
    }

    const item = pool[Math.floor(Math.random() * pool.length)];
    if (!item) return;

    const player = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)] + ' (bot)';
    const newDrop = {
      id: Math.random().toString(36).substr(2, 9),
      player,
      itemName: item.name,
      rarity: item.rarity,
      image: item.image,
      caseName: caseData.name,
    };

    this.drops.unshift(newDrop);
    if (this.drops.length > this.maxDrops) {
      this.drops.pop();
    }
  }

  render() {
    if (!this.container) return;
    this.container.textContent = '';

    const feedList = document.createElement('div');
    feedList.className = 'drop-feed-list';

    this.drops.forEach((drop) => {
      const color = RARITY_COLORS[drop.rarity] ?? '#888';
      const itemEl = document.createElement('div');
      itemEl.className = 'drop-feed-pill';
      itemEl.style.setProperty('--rarity', color);

      const avatar = document.createElement('div');
      avatar.className = 'drop-feed-avatar';
      avatar.textContent = drop.player.slice(0, 2).toUpperCase();

      const details = document.createElement('div');
      details.className = 'drop-feed-details';

      const userSpan = document.createElement('span');
      userSpan.className = 'drop-feed-user';
      userSpan.textContent = drop.player;

      const itemSpan = document.createElement('span');
      itemSpan.className = 'drop-feed-item';
      itemSpan.textContent = drop.itemName;

      details.append(userSpan, itemSpan);

      const img = document.createElement('img');
      img.src = drop.image;
      img.alt = drop.itemName;
      img.className = 'drop-feed-img';

      itemEl.append(avatar, details, img);
      feedList.appendChild(itemEl);
    });

    this.container.appendChild(feedList);
  }
}

export function initLiveDropFeed(container) {
  const feed = new LiveDropFeed(container);
  feed.start();
  return feed;
}
