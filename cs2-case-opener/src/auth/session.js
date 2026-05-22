const STORAGE_KEY = 'cs2_session';

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function loadGuestId() {
  try {
    const stored = localStorage.getItem('cs2_guest_id');
    if (stored) {
      return stored;
    }
    const guestId = `guest_${Math.random().toString(16).slice(2, 10)}`;
    localStorage.setItem('cs2_guest_id', guestId);
    return guestId;
  } catch {
    return `guest_${Math.random().toString(16).slice(2, 10)}`;
  }
}

export function getSession() {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return safeParse(localStorage.getItem(STORAGE_KEY), null);
}

export function setSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isLoggedIn() {
  return Boolean(getSession()?.token);
}

export function isGuest() {
  return Boolean(getSession()?.isGuest);
}

export function getCurrentUserId() {
  const session = getSession();
  return session?.userId ?? null;
}

export function ensureGuestSession() {
  const current = getSession();
  if (current) {
    return current;
  }

  const session = {
    userId: loadGuestId(),
    displayName: 'Guest',
    isGuest: true,
    token: '',
    expiresAt: null,
  };
  setSession(session);
  return session;
}
