import { SELL_TAX } from '../data/economy.js';
import { earn } from './wallet.js';

const STORAGE_KEY = 'cs2_inventory';
const MAX_ITEMS = 500;

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function emitChange(detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('inventory:changed', { detail }));
  }
}

function loadState() {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const parsed = safeParse(localStorage.getItem(STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

let items = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function toEntry(openResult) {
  const item = openResult.item;
  return {
    uid: crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    itemId: item.id,
    // Case name lives on the open-result wrapper (set by main.js), not the item.
    caseName: openResult.caseName ?? item.caseName ?? '',
    name: item.name,
    weapon: item.weapon,
    finish: item.finish,
    rarity: item.rarity,
    image: item.image ?? '',
    wear: openResult.wear,
    float: openResult.float,
    statTrak: Boolean(openResult.statTrak),
    statTrakCount: 0,
    isFavorite: false,
    isListed: false,
    listPrice: 0,
    equippedSlot: null,
    openedAt: openResult.timestamp ?? Date.now(),
    seed: openResult.seed,
    basePrice: item.basePrice ?? 0,
  };
}

export function add(openResult) {
  if (items.length >= MAX_ITEMS) {
    return null;
  }

  const entry = toEntry(openResult);
  // StatTrak: bump the counter on every owned StatTrak copy of the same skin.
  // This mirrors how StatTrak™ in CS2 increments — every kill (or here, every
  // subsequent unbox of the same skin) ticks the badge.
  if (entry.itemId) {
    for (const it of items) {
      if (it.itemId === entry.itemId && it.statTrak) {
        it.statTrakCount = (Number(it.statTrakCount) || 0) + 1;
      }
    }
  }
  items.unshift(entry);
  saveState();
  emitChange({ type: 'add', item: entry });
  return clone(entry);
}

export function remove(uid) {
  const before = items.length;
  items = items.filter((item) => item.uid !== uid);
  const removed = items.length !== before;
  if (removed) {
    saveState();
    emitChange({ type: 'remove', uid });
  }
  return removed;
}

export function get(uid) {
  return clone(items.find((item) => item.uid === uid) ?? null);
}

export function getAll() {
  return clone(items);
}

export function filter(options = {}) {
  return items.filter((item) => {
    if (options.rarity && ![].concat(options.rarity).includes(item.rarity)) return false;
    if (options.weapon && String(item.weapon).toLowerCase() !== String(options.weapon).toLowerCase()) return false;
    if (options.wear && item.wear !== options.wear) return false;
    if (typeof options.statTrak === 'boolean' && item.statTrak !== options.statTrak) return false;
    if (typeof options.minFloat === 'number' && Number(item.float) < options.minFloat) return false;
    if (typeof options.maxFloat === 'number' && Number(item.float) > options.maxFloat) return false;
    if (options.search && !`${item.name} ${item.weapon} ${item.finish}`.toLowerCase().includes(String(options.search).toLowerCase())) return false;
    return true;
  });
}

export function sort(field = 'openedAt', direction = 'desc') {
  const factor = direction === 'asc' ? 1 : -1;
  return clone(items).sort((left, right) => {
    const a = left[field] ?? 0;
    const b = right[field] ?? 0;
    if (a === b) return 0;
    return a > b ? factor : -factor;
  });
}

export function favorite(uid, value) {
  const item = items.find((entry) => entry.uid === uid);
  if (!item) return;
  item.isFavorite = Boolean(value);
  saveState();
  emitChange({ type: 'favorite', uid, value: Boolean(value) });
}

export function equip(uid, slot) {
  const item = items.find((entry) => entry.uid === uid);
  if (!item) return;
  item.equippedSlot = slot ?? null;
  saveState();
  emitChange({ type: 'equip', uid, slot });
}

export function listOnMarket(uid, price) {
  const item = items.find((entry) => entry.uid === uid);
  if (!item) return;
  item.isListed = true;
  item.listPrice = Math.max(0, Number(price) || 0);
  saveState();
  emitChange({ type: 'list', uid, price: item.listPrice });
}

export function delistFromMarket(uid) {
  const item = items.find((entry) => entry.uid === uid);
  if (!item) return;
  item.isListed = false;
  item.listPrice = 0;
  saveState();
  emitChange({ type: 'delist', uid });
}

export function computeSalePrice(basePrice) {
  const value = (Number(basePrice) || 0) * (1 - SELL_TAX);
  // Keep two decimals so cheap skins don't all round to €0/€1.
  return Math.max(0, Math.round(value * 100) / 100);
}

export function sell(uid) {
  const item = items.find((entry) => entry.uid === uid);
  if (!item) return { coins: 0 };
  const coins = computeSalePrice(item.basePrice);
  earn(coins, 'sell_item');
  remove(uid);
  return { coins };
}

export function bulkSell(uids) {
  let totalCoins = 0;
  let count = 0;
  for (const uid of uids) {
    const result = sell(uid);
    if (result.coins > 0) {
      totalCoins += result.coins;
      count += 1;
    }
  }
  return { totalCoins, count };
}

export function getStats() {
  const byRarity = {};
  for (const item of items) {
    byRarity[item.rarity] = (byRarity[item.rarity] ?? 0) + 1;
  }

  return {
    totalValue: items.reduce((sum, item) => sum + Math.max(0, Number(item.basePrice) || 0), 0),
    totalItems: items.length,
    byRarity,
    favoriteCount: items.filter((item) => item.isFavorite).length,
  };
}

export function clear() {
  items = [];
  saveState();
  emitChange({ type: 'clear' });
}
