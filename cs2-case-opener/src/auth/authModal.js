import { ensureGuestSession } from './session.js';

export async function ensureAuthSession() {
  return ensureGuestSession();
}
