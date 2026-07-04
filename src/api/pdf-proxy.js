const PDF_TIMEOUT_MS = 25000;

const isSafePdfUrl = (value = '') => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!rawUrl || !isSafePdfUrl(rawUrl)) {
    res.status(400).json({ error: 'URL do PDF invalida.' });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PDF_TIMEOUT_MS);

  try {
    const response = await fetch(rawUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'CoralHub PDF Proxy',
        Accept: 'application/pdf,*/*',
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: 'Nao foi possivel buscar o PDF.' });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    res.status(aborted ? 504 : 500).json({
      error: aborted ? 'Tempo esgotado ao buscar o PDF.' : 'Erro ao buscar o PDF.',
    });
  } finally {
    clearTimeout(timer);
  }
}
