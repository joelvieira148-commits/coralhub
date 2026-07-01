import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { firebaseClient, isFirebaseConfigured } from '@/api/firebaseClient';
import { getPostLoginPath } from '@/lib/post-login';

const processedAuthUrls = new Set();

export const isNativeApp = () =>
  typeof window !== 'undefined' && Capacitor.isNativePlatform();

export const openExternalUrl = async (url) => {
  if (!url || typeof window === 'undefined') {
    return;
  }

  if (isNativeApp() && /^https?:\/\//i.test(url)) {
    await Browser.open({
      url,
      presentationStyle: 'fullscreen',
    });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};

const navigateInsideApp = (path = '/mural') => {
  if (typeof window === 'undefined') return;

  window.location.replace(path || '/mural');
};

const completeNativeAuth = async (url) => {
  if (!url || !isFirebaseConfigured || !/^coralhub:\/\/auth\/callback/i.test(url)) {
    return;
  }

  if (processedAuthUrls.has(url)) {
    return;
  }

  processedAuthUrls.add(url);

  try {
    const result = await firebaseClient.auth.handleOAuthCallbackUrl(url);
    await Browser.close().catch(() => null);

    if (typeof window !== 'undefined') {
      const postLoginPath = await getPostLoginPath(result?.returnPath || '/mural')
        .catch((error) => {
          console.warn('Falha ao resolver destino do login nativo:', error);
          return result?.user ? '/onboarding' : '/login';
        });
      window.dispatchEvent(new CustomEvent('coralhub:auth-complete', { detail: result }));
      navigateInsideApp(postLoginPath);
    }
  } catch (error) {
    console.warn('Falha ao concluir login nativo:', error);
    await Browser.close().catch(() => null);

    try {
      const user = await firebaseClient.auth.completeRedirectLogin();
      if (user) {
        const postLoginPath = await getPostLoginPath('/mural').catch(() => '/onboarding');
        window.dispatchEvent(new CustomEvent('coralhub:auth-complete', { detail: { user, returnPath: postLoginPath } }));
        navigateInsideApp(postLoginPath);
        return;
      }
    } catch (sessionError) {
      console.warn('Sessao nativa indisponivel apos retorno do Google:', sessionError);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coralhub:auth-error', {
        detail: { message: error?.message || 'Nao foi possivel concluir o login Google.' },
      }));
    }
  }
};

export const setupNativeAuthListener = () => {
  if (!isNativeApp()) {
    return () => {};
  }

  let removeListener = () => {};
  let cancelled = false;

  App.getLaunchUrl()
    .then((launch) => completeNativeAuth(launch?.url))
    .catch(() => null);

  App.addListener('appUrlOpen', ({ url }) => {
    completeNativeAuth(url);
  }).then((listener) => {
    if (cancelled) {
      listener.remove();
      return;
    }
    removeListener = () => listener.remove();
  });

  return () => {
    cancelled = true;
    removeListener();
  };
};
