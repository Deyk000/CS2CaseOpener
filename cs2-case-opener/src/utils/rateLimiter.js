const STORAGE_KEY = 'cs2_case_bucket';
const MAX_OPENS = 10;
const WINDOW_MS = 60_000;

function loadBucket() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? { opens: [] };
  } catch {
    return { opens: [] };
  }
}

function saveBucket(bucket) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bucket));
  } catch {
    // ignore
  }
}

export function canOpenCase() {
  const bucket = loadBucket();
  const now = Date.now();
  bucket.opens = bucket.opens.filter((timestamp) => now - timestamp < WINDOW_MS);
  saveBucket(bucket);
  return { allowed: bucket.opens.length < MAX_OPENS, remaining: Math.max(0, MAX_OPENS - bucket.opens.length), resetInMs: bucket.opens[0] ? WINDOW_MS - (now - bucket.opens[0]) : 0 };
}

export function recordOpenAttempt() {
  const bucket = loadBucket();
  bucket.opens.push(Date.now());
  saveBucket(bucket);
}
