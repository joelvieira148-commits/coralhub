import { createClient } from '@supabase/supabase-js';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'coralhub';
const nativeAuthRedirectUrl = 'coralhub://auth/callback';
const authReturnPathKey = 'coralhub_auth_return_path';

const PLACEHOLDER_VALUES = new Set([
  '',
  'sua_url',
  'sua_anon_key',
  'your_supabase_url',
  'your_supabase_anon_key',
]);

const hasConfigValue = (value) =>
  !PLACEHOLDER_VALUES.has(String(value || '').trim().toLowerCase());

export const isSupabaseConfigured =
  hasConfigValue(supabaseUrl) && hasConfigValue(supabaseAnonKey);
export const isUsingLocalSupabase = false;

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
      },
    })
  : null;

const configurationError = () => {
  const error = new Error(
    'Supabase nao configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local.'
  );
  error.status = 503;
  return error;
};

const requireSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw configurationError();
  }
};

const cleanPayload = (payload = {}) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

const toDataPayload = (payload = {}) => {
  const { id, created_date, updated_date, created_at, updated_at, ...data } = cleanPayload(payload);
  return data;
};

const normalizeSort = (sort) => {
  if (!sort || typeof sort !== 'string') return null;
  const desc = sort.startsWith('-');
  return {
    field: sort.replace(/^-/, ''),
    direction: desc ? -1 : 1,
  };
};

const sortItems = (items, sort) => {
  const normalized = normalizeSort(sort);
  if (!normalized) return items;

  const { field, direction } = normalized;
  return [...items].sort((left, right) => {
    const a = left?.[field];
    const b = right?.[field];

    if (a === b) return 0;
    if (a === undefined || a === null) return 1;
    if (b === undefined || b === null) return -1;

    return a > b ? direction : -direction;
  });
};

const paginate = (items, limit, skip = 0) => {
  const start = Number(skip) || 0;
  const max = Number(limit) || 0;
  return max > 0 ? items.slice(start, start + max) : items.slice(start);
};

const matchesQuery = (item, query = {}) =>
  Object.entries(query || {}).every(([key, value]) => item?.[key] === value);

const rowToItem = (row) => ({
  id: row.id,
  created_date: row.created_at,
  updated_date: row.updated_at,
  ...(row.data || {}),
});

const getAuthUser = async () => {
  requireSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user || null;
};

const getSessionUser = async () => {
  requireSupabase();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.user || null;
};

const getSafeRedirectUrl = (value = '/mural') => {
  if (typeof window === 'undefined') return undefined;

  try {
    const url = new URL(value || '/mural', window.location.origin);
    if (url.origin !== window.location.origin && !String(value).startsWith('/')) {
      return new URL('/mural', window.location.origin).toString();
    }
    return url.toString();
  } catch {
    return new URL('/mural', window.location.origin).toString();
  }
};

const getAuthCallbackUrl = (returnPath = '/mural') => {
  const params = new URLSearchParams({ from_url: getReturnPath(returnPath) });
  return getSafeRedirectUrl(`/api/apps/auth/final-callback?${params.toString()}`);
};

const isNativeRuntime = () =>
  typeof window !== 'undefined' && Capacitor.isNativePlatform();

const getReturnPath = (value = '/mural') => {
  if (typeof window === 'undefined') return '/mural';

  try {
    const url = new URL(value || '/mural', window.location.origin);
    if (url.origin !== window.location.origin && !String(value).startsWith('/')) {
      return '/mural';
    }
    return `${url.pathname}${url.search}${url.hash}` || '/mural';
  } catch {
    return String(value || '').startsWith('/') ? value : '/mural';
  }
};

const getOAuthParams = (url) => {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);

  if (parsed.hash?.startsWith('#')) {
    const hashParams = new URLSearchParams(parsed.hash.slice(1));
    hashParams.forEach((value, key) => params.set(key, value));
  }

  return params;
};

const publicUserFromSupabase = async (authUser) => {
  if (!authUser) return null;

  const now = new Date().toISOString();
  const metadata = authUser.user_metadata || {};
  const baseProfile = {
    id: authUser.id,
    uid: authUser.id,
    email: authUser.email || '',
    full_name: metadata.full_name || metadata.name || authUser.email || '',
    photo_url: metadata.avatar_url || metadata.picture || '',
    role: 'user',
  };

  let profile = null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    profile = data;
  } catch (error) {
    console.warn('Falha ao carregar perfil; usando usuario autenticado:', error);
    return {
      ...baseProfile,
      created_date: now,
      updated_date: now,
    };
  }

  if (!profile) {
    const created = {
      id: authUser.id,
      email: baseProfile.email,
      full_name: baseProfile.full_name,
      photo_url: baseProfile.photo_url,
      role: 'user',
      data: {},
      created_at: now,
      updated_at: now,
    };

    const { error: insertError } = await supabase.from('profiles').insert(created);
    if (insertError) {
      console.warn('Falha ao criar perfil; continuando cadastro:', insertError);
    }

    return { ...baseProfile, created_date: now, updated_date: now };
  }

  const data = profile.data || {};
  const patch = {};
  if (!profile.email && baseProfile.email) patch.email = baseProfile.email;
  if (!profile.full_name && baseProfile.full_name) patch.full_name = baseProfile.full_name;
  if (!profile.photo_url && baseProfile.photo_url) patch.photo_url = baseProfile.photo_url;

  if (Object.keys(patch).length > 0) {
    const { error: patchError } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: now })
      .eq('id', authUser.id);

    if (patchError) {
      console.warn('Falha ao atualizar dados basicos do perfil:', patchError);
    }
  }

  return {
    ...data,
    id: authUser.id,
    uid: authUser.id,
    email: profile.email || baseProfile.email,
    full_name: profile.full_name || baseProfile.full_name,
    photo_url: profile.photo_url || baseProfile.photo_url,
    role: profile.role || data.role || 'user',
    created_date: profile.created_at,
    updated_date: profile.updated_at,
  };
};

const createEntityModule = (entityName) => ({
  async list(sort, limit, skip) {
    requireSupabase();
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('entity', entityName);

    if (error) throw error;

    const items = (data || []).map(rowToItem);
    return paginate(sortItems(items, sort), limit, skip);
  },

  async filter(query = {}, sort, limit, skip) {
    const items = await this.list(sort);
    return paginate(items.filter((item) => matchesQuery(item, query)), limit, skip);
  },

  async get(id) {
    requireSupabase();
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('entity', entityName)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const notFound = new Error(`${entityName} nao encontrado.`);
      notFound.status = 404;
      throw notFound;
    }

    return rowToItem(data);
  },

  async create(payload) {
    requireSupabase();
    const authUser = await getAuthUser();
    if (!authUser) {
      const error = new Error('Faca login para salvar.');
      error.status = 401;
      throw error;
    }

    const { data, error } = await supabase
      .from('records')
      .insert({
        entity: entityName,
        owner_id: authUser.id,
        data: toDataPayload(payload),
      })
      .select('*')
      .single();

    if (error) throw error;
    return rowToItem(data);
  },

  async update(id, payload) {
    requireSupabase();
    const current = await this.get(id);
    const { data, error } = await supabase
      .from('records')
      .update({
        data: toDataPayload({ ...current, ...payload }),
        updated_at: new Date().toISOString(),
      })
      .eq('entity', entityName)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return rowToItem(data);
  },

  async delete(id) {
    requireSupabase();
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('entity', entityName)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },
});

const entities = new Proxy(
  {},
  {
    get(_target, entityName) {
      if (typeof entityName !== 'string' || entityName === 'then') return undefined;
      return createEntityModule(entityName);
    },
  }
);

const sanitizeFileName = (name = 'arquivo') =>
  String(name || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'arquivo';

const uploadFile = async ({ file }) => {
  requireSupabase();

  if (!file) {
    throw new Error('Arquivo obrigatorio.');
  }

  const authUser = await getAuthUser();
  if (!authUser) {
    const error = new Error('Faca login para enviar arquivos.');
    error.status = 401;
    throw error;
  }

  const safeName = sanitizeFileName(file.name);
  const filePath = `${authUser.id}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(filePath);

  return {
    file_url: data.publicUrl,
    file_name: file.name || safeName,
  };
};

export const supabaseClient = {
  isLocal: false,
  isConfigured: isSupabaseConfigured,

  auth: {
    onAuthStateChanged(callback) {
      requireSupabase();
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
          callback(session?.user ? await publicUserFromSupabase(session.user) : null);
        } catch (error) {
          console.error('Falha ao sincronizar perfil Supabase:', error);
          callback(null, error);
        }
      });

      return () => data.subscription.unsubscribe();
    },

    async completeRedirectLogin() {
      const authUser = await getSessionUser();
      return authUser ? publicUserFromSupabase(authUser) : null;
    },

    async isAuthenticated() {
      if (!isSupabaseConfigured) return false;
      return Boolean(await getSessionUser());
    },

    async me() {
      const authUser = await getAuthUser();
      if (!authUser) {
        const error = new Error('Usuario nao autenticado.');
        error.status = 401;
        throw error;
      }

      return publicUserFromSupabase(authUser);
    },

    async updateMe(data) {
      const authUser = await getAuthUser();
      if (!authUser) {
        const error = new Error('Usuario nao autenticado.');
        error.status = 401;
        throw error;
      }

      const current = await publicUserFromSupabase(authUser);
      const mergedData = cleanPayload({
        ...(current || {}),
        ...data,
        id: undefined,
        uid: undefined,
        email: undefined,
        full_name: undefined,
        photo_url: undefined,
        role: undefined,
        created_date: undefined,
        updated_date: undefined,
      });

      const nextProfile = {
        id: authUser.id,
        email: authUser.email || data?.email || '',
        full_name: data?.full_name || current?.full_name || authUser.email || '',
        photo_url: data?.photo_url || data?.foto_url || current?.photo_url || '',
        role: current?.role || 'user',
        data: mergedData,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          ...nextProfile,
          created_at: current?.created_date || new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.warn('Falha ao salvar perfil; mantendo dados em memoria:', error);
        return {
          ...(current || {}),
          ...data,
          id: authUser.id,
          uid: authUser.id,
          email: authUser.email || data?.email || current?.email || '',
          full_name: data?.full_name || current?.full_name || authUser.email || '',
          photo_url: data?.photo_url || data?.foto_url || current?.photo_url || '',
          role: current?.role || 'user',
        };
      }

      return this.me();
    },

    async saveProfile(data) {
      const authUser = await getAuthUser();
      if (!authUser) {
        const error = new Error('Usuario nao autenticado.');
        error.status = 401;
        throw error;
      }

      const current = await publicUserFromSupabase(authUser);
      const mergedData = cleanPayload({
        ...(current || {}),
        ...data,
        id: undefined,
        uid: undefined,
        email: undefined,
        full_name: undefined,
        photo_url: undefined,
        role: undefined,
        created_date: undefined,
        updated_date: undefined,
      });

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          email: authUser.email || data?.email || '',
          full_name: data?.full_name || current?.full_name || authUser.email || '',
          photo_url: data?.photo_url || data?.foto_url || current?.photo_url || '',
          role: current?.role || 'user',
          data: mergedData,
          created_at: current?.created_date || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      return this.me();
    },

    async loginViaEmailPassword(email, password) {
      requireSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      return {
        access_token: data.session?.access_token || '',
        user: data.user ? await publicUserFromSupabase(data.user) : null,
      };
    },

    async register({ email, password, full_name }) {
      requireSupabase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
          emailRedirectTo: getSafeRedirectUrl('/mural'),
        },
      });

      if (error) throw error;

      if (!data.session) {
        return {
          user: data.user ? {
            id: data.user.id,
            uid: data.user.id,
            email: data.user.email || email,
            full_name,
          } : null,
          needsEmailConfirmation: true,
        };
      }

      return {
        user: data.user ? await publicUserFromSupabase(data.user) : null,
        needsEmailConfirmation: false,
      };
    },

    async loginWithGoogle(fromUrl = '/mural') {
      requireSupabase();
      const native = isNativeRuntime();
      const returnPath = getReturnPath(fromUrl);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(authReturnPathKey, returnPath);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: native ? nativeAuthRedirectUrl : getAuthCallbackUrl(returnPath),
          skipBrowserRedirect: native,
        },
      });

      if (error) throw error;

      if (native && data?.url) {
        await Browser.open({
          url: data.url,
          presentationStyle: 'fullscreen',
        });
      }

      return { redirected: true };
    },

    async handleOAuthCallbackUrl(url) {
      requireSupabase();

      const params = getOAuthParams(url);
      const authError = params.get('error_description') || params.get('error');
      if (authError) {
        throw new Error(authError);
      }

      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      let user = null;

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        user = data.session?.user ? await publicUserFromSupabase(data.session.user) : null;
      } else if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        user = data.session?.user ? await publicUserFromSupabase(data.session.user) : null;
      }

      let returnPath = '/mural';

      if (typeof window !== 'undefined') {
        returnPath = getReturnPath(window.localStorage.getItem(authReturnPathKey) || '/mural');
        window.localStorage.removeItem(authReturnPathKey);
      }

      return { user, returnPath };
    },

    async verifyOtp() {
      return { success: true };
    },

    async resendOtp() {
      return { success: true };
    },

    async logout(redirectUrl = '/') {
      await this.signOutOnly();

      if (typeof window !== 'undefined') {
        window.location.replace(redirectUrl || '/');
      }
    },

    async signOutOnly() {
      if (!isSupabaseConfigured) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },

    redirectToLogin(nextUrl = '/mural') {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams({ from_url: nextUrl || '/mural' });
        window.location.href = `/login?${params.toString()}`;
      }
    },
  },

  entities,

  integrations: {
    Core: {
      UploadFile: uploadFile,
    },
  },
};
