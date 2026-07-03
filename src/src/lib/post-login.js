import { firebaseClient } from '@/api/firebaseClient';
import { isCoralAvailable, isCoralPending } from '@/lib/coral-approval';
import { clearCoralMembershipFields } from '@/lib/coral-membership';

const normalizePath = (value = '/mural') => {
  if (!value || value === '/login' || value.startsWith('/login?')) {
    return '/mural';
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin && !String(value).startsWith('/')) {
      return '/mural';
    }

    return `${url.pathname}${url.search}${url.hash}` || '/mural';
  } catch {
    return String(value).startsWith('/') ? value : '/mural';
  }
};

const safeFilter = async (entity, query) => {
  try {
    return await entity.filter(query);
  } catch (error) {
    console.warn('Falha ao verificar cadastro pos-login:', error);
    return [];
  }
};

const pathForExistingUser = (preferredPath) => {
  const fallback = normalizePath(preferredPath);

  if (fallback !== '/mural' && fallback !== '/' && fallback !== '/login') {
    return fallback;
  }

  return '/mural';
};

export const getPostLoginPath = async (preferredPath = '/mural') => {
  const user = await firebaseClient.auth.me();

  const [corais, membrosPorUserEmail, membrosPorEmail] = await Promise.all([
    safeFilter(firebaseClient.entities.Coral, { maestro_email: user.email }),
    safeFilter(firebaseClient.entities.Membro, { user_email: user.email }),
    safeFilter(firebaseClient.entities.Membro, { email: user.email }),
  ]);

  const coralAprovado = corais.find(isCoralAvailable);
  if (coralAprovado) {
    const coral = coralAprovado;
    firebaseClient.auth.updateMe({
      active_coral_id: coral.id,
      active_coral_role: 'maestro',
      active_coral_nome: coral.nome || '',
      active_coral_cidade: coral.cidade || '',
      active_member_id: '',
      member_nome: user.full_name || user.email || '',
      member_naipe: '',
    }).catch((error) => {
      console.warn('Falha ao salvar coral ativo do maestro:', error);
    });

    return pathForExistingUser(preferredPath, 'maestro');
  }

  if (corais.some(isCoralPending)) {
    return '/onboarding';
  }

  const membro = membrosPorUserEmail[0] || membrosPorEmail[0];
  if (membro) {
    const coralDoMembro = membro.coral_id
      ? (await safeFilter(firebaseClient.entities.Coral, { id: membro.coral_id }))[0]
      : null;

    if (coralDoMembro && !isCoralAvailable(coralDoMembro)) {
      return '/onboarding';
    }

    const role = membro.cargo || 'membro';
    firebaseClient.auth.updateMe({
      active_coral_id: membro.coral_id || '',
      active_coral_role: role,
      active_member_id: membro.id || '',
      member_nome: membro.nome || user.full_name || user.email || '',
      member_naipe: membro.naipe || '',
      member_foto_url: membro.foto_url || membro.foto || membro.photo_url || '',
    }).catch((error) => {
      console.warn('Falha ao salvar coral ativo do membro:', error);
    });

    return pathForExistingUser(preferredPath, role);
  }

  if (user?.active_coral_id || user?.active_member_id || user?.active_coral_role) {
    firebaseClient.auth.updateMe(clearCoralMembershipFields).catch((error) => {
      console.warn('Falha ao limpar cadastro antigo do perfil:', error);
    });
  }

  return '/onboarding';
};
