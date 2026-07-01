import { useEffect } from 'react';
import { supabaseClient } from '@/api/supabaseClient';
import { getPostLoginPath } from '@/lib/post-login';

const getSafeReturnPath = (value) => {
  if (!value) return '/mural';

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin && !value.startsWith('/')) {
      return '/mural';
    }

    return `${url.pathname}${url.search}${url.hash}` || '/mural';
  } catch {
    return value.startsWith('/') ? value : '/mural';
  }
};

export default function AuthFinalCallback() {
  useEffect(() => {
    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const requestedPath = getSafeReturnPath(params.get('next') || params.get('from_url'));
      let returnPath = requestedPath;

      try {
        const result = await supabaseClient.auth.handleOAuthCallbackUrl(window.location.href)
          .catch(async (error) => {
            const user = await supabaseClient.auth.completeRedirectLogin();
            if (!user) throw error;
            return { user, returnPath: requestedPath };
          });

        returnPath = getSafeReturnPath(result?.returnPath || requestedPath);
        window.location.replace(await getPostLoginPath(returnPath));
      } catch (error) {
        console.warn('Falha ao finalizar login Google:', error);
        window.location.replace(`/login?from_url=${encodeURIComponent(returnPath || '/mural')}`);
      }
    };

    finish();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}
