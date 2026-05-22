import { CASE_COST, STARTING_BALANCE } from '../data/economy.js';

const STORAGE_KEY = 'cs2_wallet';

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function emitChange(detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wallet:changed', { detail }));
  }
}

function loadState() {
  if (typeof localStorage === 'undefined') {
    return { balance: STARTING_BALANCE, history: [] };
  }

  const stored = safeParse(localStorage.getItem(STORAGE_KEY), null);
  if (!stored || typeof stored !== 'object') {
    return { balance: STARTING_BALANCE, history: [] };
  }
  // Migrate old coin-based balances (>= 250) to the new EUR scale by
  // mapping ~100 coins → €1, so existing players don't feel robbed.
  let balance = Number(stored.balance);
  if (!Number.isFinite(balance)) balance = STARTING_BALANCE;
  if (balance > 250) balance = Math.max(STARTING_BALANCE, Math.round((balance / 100) * 100) / 100);
  return { balance, history: Array.isArray(stored.history) ? stored.history : [] };
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage may be unavailable
  }
}

export function getBalance() {
  return state.balance;
}

export function earn(amount, reason = 'earn') {
  const numeric = Math.max(0, Number(amount) || 0);
  const balanceBefore = state.balance;
  state.balance += numeric;
  const transaction = {
    id: crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    amount: numeric,
    reason,
    balanceBefore,
    balanceAfter: state.balance,
    timestamp: Date.now(),
  };
  state.history.unshift(transaction);
  saveState();
  emitChange(transaction);
  return transaction;
}

export function spend(amount, reason = 'spend') {
  const numeric = Math.max(0, Number(amount) || 0);

  if (state.balance < numeric) {
    return false;
  }

  const balanceBefore = state.balance;
  state.balance -= numeric;
  const transaction = {
    id: crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    amount: -numeric,
    reason,
    balanceBefore,
    balanceAfter: state.balance,
    timestamp: Date.now(),
  };
  state.history.unshift(transaction);
  saveState();
  emitChange(transaction);
  return true;
}

export function getHistory() {
  return [...state.history];
}

export function clearHistory() {
  state.history = [];
  saveState();
  emitChange({ reason: 'clearHistory' });
}

export function canAfford(amount) {
  return state.balance >= Math.max(0, Number(amount) || 0);
}

export function resetBalance(amount = CASE_COST) {
  state.balance = Number(amount) || 0;
  saveState();
  emitChange({ reason: 'reset' });
}
