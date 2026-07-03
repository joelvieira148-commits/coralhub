import { useCallback, useEffect, useState } from 'react';
import { firebaseClient } from '@/api/firebaseClient';
import {
  clearCurrentUserCoralMembership,
  hasCoralMembershipData,
  syncCurrentUserCoralMembership,
} from '@/lib/coral-membership';
import { isCoralAvailable } from '@/lib/coral-approval';
import { carregarCoraisParaCadastro, publicarCoraisNoCatalogo } from '@/lib/coral-directory';
import { getMemberPhotoFields, getMemberPhotoUrl } from '@/lib/member-photo';

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

const criarCoralFallback = (coralId, dados = {}) => ({
  id: coralId,
  nome: dados.nome || dados.coral_nome || dados.active_coral_nome || 'Meu Coral',
  cidade: dados.cidade || dados.active_coral_cidade || '',
  maestro_email: dados.maestro_email || '',
  cor_primaria: dados.cor_primaria || '#6366f1',
  cor_secundaria: dados.cor_secundaria || '#a78bfa',
  tema: dados.tema || 'classico',
  armazenamento_usado_bytes: dados.armazenamento_usado_bytes || 0,
});

const criarMembroFallback = (user) => ({
  id: user?.active_member_id || `user-${user?.id || user?.email || 'membro'}`,
  nome: user?.member_nome || user?.full_name || user?.email || 'Membro',
  email: user?.email || '',
  user_email: user?.email || '',
  coral_id: user?.active_coral_id || '',
  naipe: user?.member_naipe || '',
  cargo: 'membro',
  ...getMemberPhotoFields(user?.member_foto_url || getMemberPhotoUrl(user)),
  ativo: true,
});

const getActiveRoleFromCargo = (cargo) => {
  if (cargo === 'maestro' || cargo === 'maestrina') return 'maestro';
  return cargo || 'membro';
};

const carregarContextoCoral = async () => {
  const me = await firebaseClient.auth.me();
  const contexto = { ...emptyContext, user: me };

  let corais = [];
  try {
    corais = await firebaseClient.entities.Coral.filter({ maestro_email: me.email });
  } catch (error) {
    console.warn('Falha ao carregar corais do maestro:', error);
  }

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
  contexto.membro = membroAtual;
  contexto.isMaestro = activeRole === 'maestro';
  const coralId = membroAtual.coral_id || me.active_coral_id;
  contexto.user = await syncCurrentUserCoralMembership(firebaseClient, me, {
    active_coral_id: coralId,
    active_coral_role: activeRole,
    active_member_id: membroAtual.id || '',
    member_nome: membroAtual.nome || me.full_name || me.email || '',
    member_naipe: membroAtual.naipe || '',
    member_foto_url: getMemberPhotoUrl(membroAtual) || '',
  });

  let coralData = [];
  try {
    coralData = await firebaseClient.entities.Coral.filter({ id: coralId });
  } catch (error) {
    console.warn('Falha ao carregar coral do membro:', error);
  }

  if (coralData.length > 0) {
    if (!isCoralAvailable(coralData[0])) {
      contexto.membro = null;
      contexto.isMaestro = false;
      contexto.user = await clearCurrentUserCoralMembership(firebaseClient, me);
      return contexto;
    }

    contexto.coral = coralData[0];
    return contexto;
  }

  const diretorio = await carregarCoraisParaCadastro(firebaseClient);
  const coralDoDiretorio = diretorio.find((item) => item.id === coralId || item.coral_id === coralId);

  if (coralId) {
    contexto.coral = criarCoralFallback(coralId, coralDoDiretorio || me);
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
