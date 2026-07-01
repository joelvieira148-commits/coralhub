const DEFAULT_RETURN_PATH = '/mural';

const toReturnPath = (value = DEFAULT_RETURN_PATH) => {
  if (!value) return DEFAULT_RETURN_PATH;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin && !value.startsWith('/')) {
      return DEFAULT_RETURN_PATH;
    }

    return `${url.pathname}${url.search}${url.hash}` || DEFAULT_RETURN_PATH;
  } catch {
    return value.startsWith('/') ? value : DEFAULT_RETURN_PATH;
  }
};

const goToLogin = (fromUrl = DEFAULT_RETURN_PATH, extra = {}) => {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams({
    from_url: toReturnPath(fromUrl),
    ...extra,
  });

  window.location.href = `/login?${params.toString()}`;
};

export const redirectToLogin = (fromUrl = DEFAULT_RETURN_PATH) => {
  goToLogin(fromUrl);
};

export const redirectToEmailLogin = (fromUrl = DEFAULT_RETURN_PATH) => {
  goToLogin(fromUrl, { mode: 'email' });
};

export const getSupabaseLoginUrl = (fromUrl = DEFAULT_RETURN_PATH) => {
  const params = new URLSearchParams({ from_url: toReturnPath(fromUrl) });
  return `/login?${params.toString()}`;
};
