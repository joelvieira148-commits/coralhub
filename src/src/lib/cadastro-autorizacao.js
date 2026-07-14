import { normalizeEmail } from '@/lib/coral-membership';

export const AUTORIZACAO_STATUS = {
  blocked: 'bloqueado',
  pending: 'pendente',
  authorized: 'autorizado',
  used: 'usado',
};

const normalizeName = (value = '') =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const sameIdentity = (record, { email = '', nome = '' } = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(nome);
  const recordEmail = normalizeEmail(record.email_normalizado || record.email);
  const recordName = normalizeName(record.nome_normalizado || record.nome);

  if (recordEmail) return Boolean(normalizedEmail && recordEmail === normalizedEmail);

  return Boolean(normalizedName && recordName === normalizedName);
};

export const getBlockedCadastro = async (firebaseClient, { email = '', nome = '' } = {}) => {
  const registros = await firebaseClient.entities.AutorizacaoCadastro.list();
  const bloqueios = registros.filter((record) =>
    sameIdentity(record, { email, nome }) &&
    record.status !== AUTORIZACAO_STATUS.authorized &&
    record.status !== AUTORIZACAO_STATUS.used
  );

  return bloqueios[0] || null;
};

export const getAuthorizedCadastro = async (firebaseClient, { email = '', nome = '' } = {}) => {
  const registros = await firebaseClient.entities.AutorizacaoCadastro.list();
  const autorizados = registros.filter((record) =>
    sameIdentity(record, { email, nome }) &&
    record.status === AUTORIZACAO_STATUS.authorized
  );

  return autorizados[0] || null;
};

export const markCadastroAuthorizationUsed = async (firebaseClient, recordId) => {
  if (!recordId) return null;

  return firebaseClient.entities.AutorizacaoCadastro.update(recordId, {
    status: AUTORIZACAO_STATUS.used,
    usado_em: new Date().toISOString(),
  });
};

export const requestCadastroAuthorization = async (firebaseClient, { email = '', nome = '', motivo = '', coralNome = '' } = {}) => {
  const existing = await getBlockedCadastro(firebaseClient, { email, nome });

  if (!existing) return null;

  return firebaseClient.entities.AutorizacaoCadastro.update(existing.id, {
    status: AUTORIZACAO_STATUS.pending,
    pedido_em: new Date().toISOString(),
    pedido_nome: nome || existing.nome || '',
    pedido_email: email || existing.email || '',
    pedido_motivo: motivo || existing.motivo || '',
    pedido_coral_nome: coralNome || existing.coral_nome || '',
  });
};

export const registerCadastroBlock = async (
  firebaseClient,
  { email = '', nome = '', motivo = '', coralId = '', coralNome = '', papel = '', adminEmail = '' } = {}
) => {
  const emailNormalizado = normalizeEmail(email);
  const nomeNormalizado = normalizeName(nome);

  if (!emailNormalizado && !nomeNormalizado) return null;

  const existing = await getBlockedCadastro(firebaseClient, { email: emailNormalizado, nome: nomeNormalizado });
  const payload = {
    status: AUTORIZACAO_STATUS.blocked,
    email: email || emailNormalizado,
    email_normalizado: emailNormalizado,
    nome: nome || '',
    nome_normalizado: nomeNormalizado,
    motivo,
    coral_id: coralId,
    coral_nome: coralNome,
    papel,
    bloqueado_em: new Date().toISOString(),
    bloqueado_por: adminEmail,
  };

  if (existing?.id) {
    return firebaseClient.entities.AutorizacaoCadastro.update(existing.id, payload);
  }

  return firebaseClient.entities.AutorizacaoCadastro.create(payload);
};

export const registerCadastroBlocks = async (firebaseClient, items = []) => {
  const unique = new Map();

  items.forEach((item) => {
    const key = normalizeEmail(item.email) || normalizeName(item.nome);
    if (key) unique.set(key, item);
  });

  await Promise.all([...unique.values()].map((item) => registerCadastroBlock(firebaseClient, item)));
};

export const buildAuthorizationMessage = ({ nome = '', email = '', coralNome = '' } = {}) =>
  `Ola, preciso de autorizacao para entrar novamente na plataforma Maestro Coral. Nome: ${nome || 'nao informado'}. E-mail: ${email || 'nao informado'}. Coral: ${coralNome || 'nao informado'}.`;
