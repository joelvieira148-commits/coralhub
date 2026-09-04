import { useCallback, useEffect, useState } from 'react';
import { firebaseClient } from '@/api/firebaseClient';
import {
  clearCurrentUserCoralMembership,
  hasCoralMembershipData,
  syncCurrentUserCoralMembership,
} from '@/lib/coral-membership';
import { isCoralAvailable, isCoralPending } from '@/lib/coral-approval';
import { publicarCoraisNoCatalogo } from '@/lib/coral-directory';
import { getMemberPhotoFields, getMemberPhotoUrl } from '@/lib/member-photo';
import { getAdminCoralOverride, isAdminUser } from '@/lib/admin-access';
import { getBlockedCadastro, requestCadastroAuthorization } from '@/lib/cadastro-autorizacao';
import { canManageCoral, getSafeMemberRole } from '@/lib/coral-permissions';

const CACHE_KEY = 'coralhub_context_cache_v2';

const emptyContext = {
  user: null,
  coral: null,
  membro: null,
  isMaestro: false,
};

let memoryContext = null;
let loadingPromise = null;

const hasStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readContextCache = () => {
  if (memoryContext) return memoryContext;
  if (!hasStorage()) return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
    memoryContext = parsed?.user ? { ...emptyContext, ...parsed } : null;
    return memoryContext;
  } catch {
    return null;
  }
};

export const saveCoralContextCache = (context) => {
  const next = { ...emptyContext, ...(readContextCache() || {}), ...context };
  memoryContext = next;

  if (hasStorage()) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      // Cache only improves perceived navigation speed.
    }
  }

  return next;
};

export const clearCoralContextCache = () => {
  memoryContext = null;
  loadingPromise = null;

  if (hasStorage()) {
    try {
      window.localStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore storage cleanup errors.
    }
  }
};

const getMemberNaipes = (member) => {
  const values = Array.isArray(member?.naipes) && member.naipes.length > 0
    ? member.naipes
    : Array.isArray(member?.member_naipes) && member.member_naipes.length > 0
      ? member.member_naipes
      : [member?.naipe || member?.member_naipe];

  return [...new Set(values.filter(Boolean))];
};

const criarMembroFallback = (user) => ({
  id: user?.active_member_id || `user-${user?.id || user?.email || 'membro'}`,
  nome: user?.member_nome || user?.full_name || user?.email || 'Membro',
  email: user?.email || '',
  user_email: user?.email || '',
  coral_id: user?.active_coral_id || '',
  naipe: user?.member_naipe || '',
  naipes: getMemberNaipes(user),
  cargo: 'membro',
  ...getMemberPhotoFields(user?.member_foto_url || getMemberPhotoUrl(user)),
  ativo: true,
});

const getActiveRoleFromCargo = (cargo) => {
  if (cargo === 'maestro' || cargo === 'maestrina') return 'maestro';
  return cargo || 'membro';
};

const uniqueById = (items = []) => {
  const records = new Map();
  items.forEach((item) => {
    if (item?.id) records.set(item.id, item);
  });
  return [...records.values()];
};

const safeFilter = async (entity, query) => {
  try {
    return await entity.filter(query);
  } catch (error) {
    console.warn('Falha ao carregar dados do coral:', error);
    return [];
  }
};

const getCoraisDoMaestro = async (user) => {
  const [porEmail, porPendente] = await Promise.all([
    safeFilter(firebaseClient.entities.Coral, { maestro_email: user.email }),
    user?.pending_coral_id ? safeFilter(firebaseClient.entities.Coral, { id: user.pending_coral_id }) : [],
  ]);

  return uniqueById([...porEmail, ...porPendente]);
};

const carregarContextoCoral = async () => {
  const me = await firebaseClient.auth.me();
  const contexto = { ...emptyContext, user: me };
  const admin = isAdminUser(me);

  if (admin) {
    const adminCoralId = getAdminCoralOverride();
    if (adminCoralId) {
      const coralAdmin = (await safeFilter(firebaseClient.entities.Coral, { id: adminCoralId }))[0];
      if (coralAdmin) {
        contexto.coral = coralAdmin;
        contexto.membro = null;
        contexto.isMaestro = true;
        return contexto;
      }
    }
  }

  if (!admin) {
    const bloqueio = await getBlockedCadastro(firebaseClient, {
      email: me.email,
      nome: me.full_name || me.email,
    }).catch(() => null);

    if (bloqueio) {
      await requestCadastroAuthorization(firebaseClient, {
        email: me.email,
        nome: me.full_name || me.email,
        coralNome: bloqueio.coral_nome || '',
        motivo: 'Tentativa de acesso com cadastro removido ou bloqueado',
      }).catch((error) => {
        console.warn('Falha ao registrar pedido de autorizacao:', error);
      });

      contexto.user = await clearCurrentUserCoralMembership(firebaseClient, me);
      clearCoralContextCache();
      return contexto;
    }
  }

  const corais = await getCoraisDoMaestro(me);

  const coraisAprovados = corais.filter(isCoralAvailable);

  if (coraisAprovados.length > 0) {
    const coral = coraisAprovados[0];
    contexto.coral = coral;
    contexto.isMaestro = true;
    contexto.user = await syncCurrentUserCoralMembership(firebaseClient, me, {
      active_coral_id: coral.id,
      active_coral_role: 'maestro',
      active_coral_nome: coral.nome || '',
      active_coral_cidade: coral.cidade || '',
      active_member_id: '',
      member_nome: me.full_name || me.email || '',
      member_naipe: '',
      member_naipes: [],
    });
    publicarCoraisNoCatalogo(firebaseClient, [coral]).catch((error) => {
      console.warn('Falha ao publicar coral no catalogo:', error);
    });
    return contexto;
  }

  let membros = [];
  let membrosCarregados = false;
  try {
    membros = await firebaseClient.entities.Membro.filter({ user_email: me.email });
    if (membros.length === 0) {
      membros = await firebaseClient.entities.Membro.filter({ email: me.email });
    }
    membrosCarregados = true;
  } catch (error) {
    console.warn('Falha ao carregar membro:', error);
  }

  const membroDoCadastro = membros[0]
    ? {
        ...membros[0],
        ...(
          getMemberPhotoUrl(membros[0])
            ? {}
            : getMemberPhotoFields(me.member_foto_url || getMemberPhotoUrl(me))
        ),
      }
    : null;
  if (!membroDoCadastro && membrosCarregados) {
    if (hasCoralMembershipData(me)) {
      contexto.user = await clearCurrentUserCoralMembership(firebaseClient, me);
    }

    return contexto;
  }

  const membroAtual = membroDoCadastro || (me.active_coral_id ? criarMembroFallback(me) : null);

  if (!membroAtual) {
    return contexto;
  }

  const activeRole = getActiveRoleFromCargo(membroAtual.cargo);
  const coralId = membroAtual.coral_id || me.active_coral_id;
  const coralData = coralId ? await safeFilter(firebaseClient.entities.Coral, { id: coralId }) : [];

  if (coralData.length > 0) {
    if (!isCoralAvailable(coralData[0])) {
      if (activeRole === 'maestro' && isCoralPending(coralData[0])) {
        contexto.user = await syncCurrentUserCoralMembership(firebaseClient, me, {
          active_coral_id: '',
          active_coral_role: '',
          active_member_id: '',
          member_nome: me.full_name || me.email || '',
          member_naipe: '',
          member_naipes: [],
          pending_coral_id: coralData[0].id,
          pending_coral_nome: coralData[0].nome || '',
        });
        return contexto;
      }

      contexto.membro = null;
      contexto.isMaestro = false;
      contexto.user = await clearCurrentUserCoralMembership(firebaseClient, me);
      return contexto;
    }

    const coralAtual = coralData[0];
    const safeRole = getSafeMemberRole(me, coralAtual, activeRole);

    contexto.coral = coralAtual;
    contexto.membro = membroAtual;
    contexto.isMaestro = safeRole === 'maestro' && canManageCoral(me, coralAtual);
    contexto.user = await syncCurrentUserCoralMembership(firebaseClient, me, {
      active_coral_id: coralId,
      active_coral_role: safeRole,
      active_member_id: membroAtual.id || '',
      member_nome: membroAtual.nome || me.full_name || me.email || '',
      member_naipe: membroAtual.naipe || '',
      member_naipes: getMemberNaipes(membroAtual),
      member_foto_url: getMemberPhotoUrl(membroAtual) || '',
    });
    return contexto;
  }

  if (coralId) {
    contexto.membro = null;
    contexto.isMaestro = false;
    contexto.user = await clearCurrentUserCoralMembership(firebaseClient, me);
  }

  return contexto;
};

const carregarContextoCompartilhado = () => {
  if (!loadingPromise) {
    loadingPromise = carregarContextoCoral()
      .then((contexto) => saveCoralContextCache(contexto))
      .finally(() => {
        loadingPromise = null;
      });
  }

  return loadingPromise;
};

export default function useCoralContext() {
  const cached = readContextCache();
  const [context, setContext] = useState(() => ({ ...emptyContext, ...(cached || {}) }));
  const [loading, setLoading] = useState(() => !cached?.user);

  useEffect(() => {
    let active = true;
    const cachedNow = readContextCache();

    if (cachedNow?.user) {
      setContext({ ...emptyContext, ...cachedNow });
      setLoading(false);
    }

    carregarContextoCompartilhado()
      .then((contexto) => {
        if (active) {
          setContext({ ...emptyContext, ...contexto });
        }
      })
      .catch((error) => {
        console.error('Failed to load coral context:', error);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const setCoral = useCallback((value) => {
    setContext((prev) => {
      const coral = typeof value === 'function' ? value(prev.coral) : value;
      return saveCoralContextCache({ ...prev, coral });
    });
  }, []);

  const setMembro = useCallback((value) => {
    setContext((prev) => {
      const membro = typeof value === 'function' ? value(prev.membro) : value;
      return saveCoralContextCache({ ...prev, membro });
    });
  }, []);

  return {
    user: context.user,
    coral: context.coral,
    membro: context.membro,
    isMaestro: context.isMaestro,
    loading,
    setCoral,
    setMembro,
  };
}
