import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabaseClient, isSupabaseConfigured } from '@/api/supabaseClient';
import { redirectToLogin } from '@/lib/auth-redirect';
import { clearAppSession, logoutToApp } from '@/lib/logout';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState({
    id: 'supabase',
    public_settings: 'supabase',
  });

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    const start = async () => {
      setIsLoadingAuth(true);
      setIsLoadingPublicSettings(false);
      setAuthError(null);

      if (!isSupabaseConfigured) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingAuth(false);
        setAuthError({
          type: 'supabase_config_missing',
          message: 'Supabase nao configurado.',
        });
        return;
      }

      try {
        const initialUser = await supabaseClient.auth.completeRedirectLogin().catch(() => null);

        if (!cancelled && initialUser) {
          setUser(initialUser);
          setIsAuthenticated(true);
          setAuthError(null);
          setAuthChecked(true);
          setIsLoadingAuth(false);
        }

        unsubscribe = supabaseClient.auth.onAuthStateChanged((currentUser, error) => {
          if (cancelled) return;

          if (error) {
            setUser(null);
            setIsAuthenticated(false);
            setAuthError({
              type: error?.status === 401 ? 'auth_required' : 'unknown',
              message: error?.message || 'Falha ao carregar autenticacao.',
            });
            setAuthChecked(true);
            setIsLoadingAuth(false);
            return;
          }

          setUser(currentUser);
          setIsAuthenticated(Boolean(currentUser));
          setAuthError(currentUser ? null : {
            type: 'auth_required',
            message: 'Authentication required',
          });
          setAuthChecked(true);
          setIsLoadingAuth(false);
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Supabase auth check failed:', error);
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingAuth(false);
        setAuthError({
          type: error?.status === 401 ? 'auth_required' : 'unknown',
          message: error?.message || 'Falha ao carregar autenticacao.',
        });
      }
    };

    start();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await supabaseClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      return currentUser;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: error?.status === 401 ? 'auth_required' : 'unknown',
        message: error?.message || 'Falha ao carregar usuario.',
      });
      throw error;
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleNativeAuthComplete = (event) => {
      if (event?.detail?.user) {
        setUser(event.detail.user);
        setIsAuthenticated(true);
        setAuthError(null);
        setAuthChecked(true);
        setIsLoadingAuth(false);
      }

      checkUserAuth().catch(() => null);
    };

    window.addEventListener('coralhub:auth-complete', handleNativeAuthComplete);
    return () => {
      window.removeEventListener('coralhub:auth-complete', handleNativeAuthComplete);
    };
  }, [checkUserAuth]);

  const checkAppState = async () => {
    if (!isSupabaseConfigured) {
      setAuthError({
        type: 'supabase_config_missing',
        message: 'Supabase nao configurado.',
      });
      return;
    }

    await checkUserAuth();
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    clearAppSession();

    if (shouldRedirect) {
      await logoutToApp('/');
    } else {
      await supabaseClient.auth.signOutOnly();
    }
  };

  const navigateToLogin = () => {
    redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
        setAppPublicSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
