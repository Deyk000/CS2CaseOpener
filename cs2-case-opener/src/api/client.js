import { clearSession, getSession } from '../auth/session.js';

function buildUrl(pathname) {
  const baseUrl = import.meta.env?.VITE_API_URL || '';
  if (!baseUrl) {
    return null;
  }
  return `${baseUrl.replace(/\/$/, '')}${pathname}`;
}

async function request(method, pathname, body) {
  const url = buildUrl(pathname);
  if (!url) {
    return { data: stubResponse(pathname, body), error: null };
  }

  const session = getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      return { data: null, error: 'Unauthorized' };
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return { data: null, error: payload?.error ?? response.statusText };
    }

    return { data: payload, error: null };
  } catch (error) {
    return { data: stubResponse(pathname, body), error: error?.message ?? 'Network error' };
  }
}

function stubResponse(pathname, body) {
  if (pathname.includes('/auth/login') || pathname.includes('/auth/register')) {
    return {
      userId: `user_${Math.random().toString(16).slice(2, 10)}`,
      displayName: body?.name ?? body?.email ?? 'Guest',
      token: 'offline-token',
      isGuest: false,
    };
  }

  if (pathname.includes('/inventory')) {
    return [];
  }

  if (pathname.includes('/wallet')) {
    return { balance: 1000 };
  }

  return { ok: true };
}

export async function authLogin(email, password) {
  return request('POST', '/api/auth/login', { email, password });
}

export async function authRegister(name, email, password) {
  return request('POST', '/api/auth/register', { name, email, password });
}

export async function authLogout() {
  return request('POST', '/api/auth/logout');
}

export async function inventoryGet() {
  return request('GET', '/api/inventory');
}

export async function inventoryAdd(item) {
  return request('POST', '/api/inventory', item);
}

export async function inventoryRemove(uid) {
  return request('DELETE', `/api/inventory/${uid}`);
}

export async function inventorySell(uid) {
  return request('POST', `/api/inventory/${uid}/sell`);
}

export async function caseOpen(caseId, seed) {
  return request('POST', '/api/cases/open', { caseId, seed });
}

export async function walletBalance() {
  return request('GET', '/api/wallet');
}

export async function purchaseCoins(packageId) {
  return request('POST', '/api/wallet/purchase', { packageId });
}

export async function progressionGet() {
  return request('GET', '/api/progression');
}

export async function claimDaily() {
  return request('POST', '/api/progression/daily');
}

export async function completeMission(id) {
  return request('POST', `/api/progression/missions/${id}/complete`);
}
