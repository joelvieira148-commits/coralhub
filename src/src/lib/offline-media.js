const DEFAULT_CACHE_NAME = 'coralhub-media-v1';

const canUseCache = () =>
  typeof window !== 'undefined' &&
  'caches' in window &&
  typeof fetch === 'function';

const throwIfAborted = (signal) => {
  if (signal?.aborted) {
    const error = new Error('Operacao cancelada.');
    error.name = 'AbortError';
    throw error;
  }
};

export const fetchOfflineMedia = async (
  url,
  { cacheName = DEFAULT_CACHE_NAME, fetchOptions = {}, signal } = {}
) => {
  if (!url) {
    throw new Error('URL obrigatoria.');
  }

  throwIfAborted(signal);

  if (!canUseCache()) {
    const response = await fetch(url, { ...fetchOptions, signal });
    return { response, source: 'network', cached: false };
  }

  const cache = await window.caches.open(cacheName);
  const cachedResponse = await cache.match(url);
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  if (isOffline && cachedResponse) {
    return { response: cachedResponse, source: 'cache', cached: true };
  }

  try {
    const response = await fetch(url, { ...fetchOptions, signal });

    if (response.ok) {
      await cache.put(url, response.clone());
    } else if (cachedResponse) {
      return { response: cachedResponse, source: 'cache', cached: true };
    }

    return { response, source: 'network', cached: response.ok };
  } catch (error) {
    if (cachedResponse) {
      return { response: cachedResponse, source: 'cache', cached: true };
    }

    throw error;
  }
};

export const getOfflineMediaObjectUrl = async (
  url,
  { cacheName = DEFAULT_CACHE_NAME, fetchOptions = {}, signal } = {}
) => {
  const { response, source, cached } = await fetchOfflineMedia(url, {
    cacheName,
    fetchOptions,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Nao foi possivel baixar o arquivo: ${response.status}`);
  }

  const blob = await response.blob();
  throwIfAborted(signal);

  return {
    objectUrl: URL.createObjectURL(blob),
    source,
    cached,
    size: blob.size,
    type: blob.type,
  };
};

export const revokeOfflineObjectUrl = (objectUrl) => {
  if (objectUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(objectUrl);
  }
};
