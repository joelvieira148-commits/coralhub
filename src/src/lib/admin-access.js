export const ADMIN_EMAIL = 'joelvieira148@gmail.com';
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'joel148';
export const ADMIN_SESSION_PREFIX = 'coralhub_admin_unlocked_v1';
export const ADMIN_CORAL_OVERRIDE_KEY = 'coralhub_admin_coral_override_v1';
const ADMIN_PASSWORD_CONFIG_TYPE = 'admin_password';

export const isAdminUser = (user) =>
  String(user?.email || '').trim().toLowerCase() === ADMIN_EMAIL;

const getAdminSessionKey = (user) =>
  `${ADMIN_SESSION_PREFIX}:${String(user?.email || '').trim().toLowerCase()}`;

export const isAdminUnlocked = (user) => {
  if (!isAdminUser(user) || typeof window === 'undefined') return false;

  try {
    return window.sessionStorage.getItem(getAdminSessionKey(user)) === '1';
  } catch {
    return false;
  }
};

const hashPassword = async (password = '') => {
  const value = String(password || '');

  if (typeof crypto === 'undefined' || !crypto.subtle || typeof TextEncoder === 'undefined') {
    return `plain:${value}`;
  }

  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const getAdminPasswordRecord = async (firebaseClient) => {
  if (!firebaseClient?.entities?.AdminConfig) return null;

  const records = await firebaseClient.entities.AdminConfig.list().catch(() => []);
  return records.find((record) => record.tipo === ADMIN_PASSWORD_CONFIG_TYPE) || null;
};

const isAdminPasswordValid = async (firebaseClient, password) => {
  const value = String(password || '');
  const record = await getAdminPasswordRecord(firebaseClient);

  if (record?.senha_hash) {
    return await hashPassword(value) === record.senha_hash;
  }

  if (record?.senha) {
    return value === record.senha;
  }

  return value === ADMIN_PASSWORD;
};

export const unlockAdmin = async (user, password, firebaseClient) => {
  if (!isAdminUser(user) || !(await isAdminPasswordValid(firebaseClient, password))) {
    return false;
  }

  try {
    window.sessionStorage.setItem(getAdminSessionKey(user), '1');
  } catch {
    return false;
  }

  return true;
};

export const updateAdminPassword = async (firebaseClient, user, { senhaAtual = '', novaSenha = '' } = {}) => {
  if (!isAdminUser(user)) {
    throw new Error('Apenas o administrador pode trocar esta senha.');
  }

  if (!(await isAdminPasswordValid(firebaseClient, senhaAtual))) {
    throw new Error('Senha atual incorreta.');
  }

  const senhaLimpa = String(novaSenha || '').trim();
  if (senhaLimpa.length < 4) {
    throw new Error('A nova senha precisa ter pelo menos 4 caracteres.');
  }

  const record = await getAdminPasswordRecord(firebaseClient);
  const payload = {
    tipo: ADMIN_PASSWORD_CONFIG_TYPE,
    senha_hash: await hashPassword(senhaLimpa),
    atualizado_em: new Date().toISOString(),
    atualizado_por: user.email || '',
  };

  if (record?.id) {
    return firebaseClient.entities.AdminConfig.update(record.id, payload);
  }

  return firebaseClient.entities.AdminConfig.create(payload);
};

export const clearAdminSessions = () => {
  if (typeof window === 'undefined') return;

  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(ADMIN_SESSION_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key));
    window.localStorage.removeItem(ADMIN_CORAL_OVERRIDE_KEY);
  } catch {
    // Session storage may be unavailable in restricted webviews.
  }
};

export const setAdminCoralOverride = (coralId = '') => {
  if (typeof window === 'undefined') return;

  try {
    if (coralId) {
      window.localStorage.setItem(ADMIN_CORAL_OVERRIDE_KEY, coralId);
    } else {
      window.localStorage.removeItem(ADMIN_CORAL_OVERRIDE_KEY);
    }
  } catch {
    // The admin can still use the regular admin screens if storage is blocked.
  }
};

export const getAdminCoralOverride = () => {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(ADMIN_CORAL_OVERRIDE_KEY) || '';
  } catch {
    return '';
  }
};
