// Append-only ring buffer of the last 100 case opens.
// Used for the "Recent drops" UI and the "best drop this week" stat.

const STORAGE_KEY = 'cs2_open_history';
const MAX_ENTRIES = 100;

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function loadState() {
  if (typeof localStorage === 'undefined') return [];
  const parsed = safeParse(localStorage.getItem(STORAGE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

let entries = loadState();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function emit(detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('history:changed', { detail }));
  }
}

export function recordOpenResult(openResult, caseName) {
  if (!openResult?.item) return;
  const entry = {
    id: crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    timestamp: openResult.timestamp ?? Date.now(),
    caseName: caseName ?? '',
    itemName: openResult.item.name,
    image: openResult.item.image ?? '',
    rarity: openResult.item.rarity,
    wear: openResult.wear,
    basePrice: Number(openResult.item.basePrice) || 0,
    statTrak: Boolean(openResult.statTrak),
  };
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  save();
  emit({ type: 'add', entry });
}

export function getRecent(limit = 10) {
  return entries.slice(0, Math.max(0, Math.min(limit, MAX_ENTRIES)));
}

export function getAll() {
  return [...entries];
}

export function getBestDrop({ sinceMs = null } = {}) {
  const cutoff = sinceMs == null ? 0 : Date.now() - sinceMs;
  let best = null;
  for (const e of entries) {
    if (e.timestamp < cutoff) continue;
    if (!best || e.basePrice > best.basePrice) best = e;
  }
  return best;
}
