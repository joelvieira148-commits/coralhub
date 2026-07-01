export const ADMIN_EMAIL = 'joelvieira148@gmail.com';
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'joel148';
export const ADMIN_SESSION_PREFIX = 'coralhub_admin_unlocked_v1';

export const isAdminUser = (user) =>
  String(user?.email || '').trim().toLowerCase() === ADMIN_EMAIL;

const getAdminSessionKey = (user) =>
  `${ADMIN_SESSION_PREFIX}:${String(user?.email || '').trim().toLowerCase()}`;

export const isAdminUnlocked = (user) => {
  if (!isAdminUser(user) || typeof window === 'undefined') return false;

  try {
    return window.sessionStorage.getItem(getAdminSessionKey(user)) === '1';
  } catch {
    return false;
  }
};

export const unlockAdmin = (user, password) => {
  if (!isAdminUser(user) || String(password || '') !== ADMIN_PASSWORD) {
    return false;
  }

  try {
    window.sessionStorage.setItem(getAdminSessionKey(user), '1');
  } catch {
    return false;
  }

  return true;
};

export const clearAdminSessions = () => {
  if (typeof window === 'undefined') return;

  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(ADMIN_SESSION_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Session storage may be unavailable in restricted webviews.
  }
};
