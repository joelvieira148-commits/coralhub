import { firebaseClient } from '@/api/firebaseClient';
import { clearAdminSessions } from '@/lib/admin-access';
import { clearCoralContextCache } from '@/hooks/useCoralContext';

const SESSION_KEYS = [
  'firebase_access_token',
  'token',
  'coralhub_local_user_v1',
  'coralhub_local_token_v1',
];

export const clearAppSession = () => {
  if (typeof window === 'undefined') return;

  try {
    SESSION_KEYS.forEach((key) => window.localStorage.removeItem(key));
    clearCoralContextCache();
    clearAdminSessions();
  } catch {
    // Redirect/reload will still reset in-memory state.
  }
};

export const logoutToApp = async (redirectPath = '/') => {
  clearAppSession();

  try {
    await firebaseClient.auth.signOutOnly();
  } catch (error) {
    console.warn('Falha ao sair do Firebase:', error);
  }

  if (typeof window !== 'undefined') {
    window.location.replace(redirectPath);
  }
};
