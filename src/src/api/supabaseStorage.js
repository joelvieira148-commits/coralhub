const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseBucket =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  'coralhub-media';

export const isSupabaseStorageConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const normalizeSupabaseUrl = (url = '') => String(url || '').replace(/\/+$/, '');

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

  const folder = ownerId || 'public';
  const filePath = `${folder}/${Date.now()}-${safeName || file.name || 'arquivo'}`;
  const baseUrl = normalizeSupabaseUrl(supabaseUrl);
  const encodedBucket = encodeURIComponent(supabaseBucket);
  const encodedPath = encodeStoragePath(filePath);

  const response = await fetch(`${baseUrl}/storage/v1/object/${encodedBucket}/${encodedPath}`, {
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

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      message = errorBody?.message || errorBody?.error || message;
    } catch {
      message = await response.text();
    }
    throw new Error(`Falha no Supabase Storage: ${message}`);
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
