const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

const supabaseBucket =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  'coralhub-media';

export const isSupabaseStorageConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const normalizeSupabaseUrl = (url = '') => String(url || '').replace(/\/+$/, '');

const getMaxUploadMb = () => {
  const value = Number(
    import.meta.env.VITE_SUPABASE_MAX_UPLOAD_MB ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_MAX_UPLOAD_MB ||
    50
  );

  return Number.isFinite(value) && value > 0 ? value : 50;
};

const getUploadBaseUrl = (url = '') => {
  const baseUrl = normalizeSupabaseUrl(url);

  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname.endsWith('.supabase.co') && !parsed.hostname.includes('.storage.')) {
      parsed.hostname = parsed.hostname.replace('.supabase.co', '.storage.supabase.co');
      return parsed.origin;
    }
  } catch {
    return baseUrl;
  }

  return baseUrl;
};

const encodeStoragePath = (path = '') =>
  String(path || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

export const uploadToSupabaseStorage = async ({ file, ownerId, safeName }) => {
  if (!isSupabaseStorageConfigured) {
    throw new Error('Supabase Storage nao configurado. Confira as variaveis na Vercel.');
  }

  if (!file) {
    throw new Error('Arquivo obrigatorio.');
  }

  const maxUploadMb = getMaxUploadMb();
  const maxUploadBytes = maxUploadMb * 1024 * 1024;
  if (file.size > maxUploadBytes) {
    throw new Error(
      `Arquivo maior que ${maxUploadMb} MB. Comprima o video ou aumente VITE_SUPABASE_MAX_UPLOAD_MB se o seu plano do Supabase permitir.`
    );
  }

  const folder = ownerId || 'public';
  const filePath = `${folder}/${Date.now()}-${safeName || file.name || 'arquivo'}`;
  const baseUrl = normalizeSupabaseUrl(supabaseUrl);
  const uploadBaseUrl = getUploadBaseUrl(supabaseUrl);
  const encodedBucket = encodeURIComponent(supabaseBucket);
  const encodedPath = encodeStoragePath(filePath);

  let response;
  try {
    response = await fetch(`${uploadBaseUrl}/storage/v1/object/${encodedBucket}/${encodedPath}`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': file.type || 'application/octet-stream',
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'false',
      },
      body: file,
    });
  } catch (error) {
    throw new Error(`Falha de rede no Supabase Storage: ${error?.message || 'sem resposta da nuvem'}`);
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      message = errorBody?.message || errorBody?.error || message;
    } catch {
      message = await response.text();
    }
    if (
      response.status === 413 ||
      /file size|payload|too large|exceed|maximum|max/i.test(message)
    ) {
      throw new Error(
        `Arquivo muito grande para enviar. O limite configurado esta em ${maxUploadMb} MB.`
      );
    }

    throw new Error(`Falha no Supabase Storage: ${message || `HTTP ${response.status}`}`);
  }

  const fileUrl = `${baseUrl}/storage/v1/object/public/${encodedBucket}/${encodedPath}`;

  if (!fileUrl) {
    throw new Error('O Supabase nao retornou a URL publica do arquivo.');
  }

  return {
    file_url: fileUrl,
    file_name: file.name || safeName || 'arquivo',
    file_type: file.type || '',
    file_size: file.size || 0,
    storage_provider: 'supabase',
    storage_bucket: supabaseBucket,
    storage_path: filePath,
  };
};
