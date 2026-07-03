import { ADMIN_EMAIL } from '@/lib/admin-access';
import { isCoralAvailable } from '@/lib/coral-approval';

const STORAGE_KEY = 'coralhub_coral_directory_v1';
const PUBLIC_ENTITY = 'CoralPublico';
const DIRECTORY_ENTITY = 'Aviso';
const DIRECTORY_CORAL_ID = '__coralhub_directory__';
const DIRECTORY_TYPE = 'diretorio_coral';
const PRIMARY_ENTITY = 'Coral';
const PUBLIC_FIELDS = [
  'id',
  'coral_id',
  'coral_ref_id',
  'nome',
  'coral_nome',
  'nome_coral',
  'nome_vocal',
  'vocal_nome',
  'name',
  'titulo',
  'title',
  'cidade',
  'maestro_email',
  'ativo',
  'bloqueado',
  'status_aprovacao',
  'updated_date',
];
const DIRECTORY_FIELDS = [
  'id',
  'coral_id',
  'coral_ref_id',
  'coral_nome',
  'nome',
  'cidade',
  'maestro_email',
  'titulo',
  'conteudo',
  'tipo',
  'publicacao_tipo',
  'ativo',
  'bloqueado',
  'status_aprovacao',
  'updated_date',
];
const SOURCE_ENTITIES = ['Coral', 'Corais', 'Vocal', 'Vocais', 'GrupoVocal', 'Grupo', 'Grupos'];
const LEGACY_SOURCE_ENTITIES = SOURCE_ENTITIES.filter((entityName) => entityName !== PRIMARY_ENTITY);

const hasStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const asText = (value) => String(value || '').trim();

const parseJson = (value) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const parseDirectoryRecord = (record) => {
  const payload = parseJson(record?.conteudo);
  return {
    ...payload,
    ...record,
    record_id: record?.id,
    id: record?.coral_ref_id || payload.coral_id || payload.id || record?.coral_id || record?.id,
    coral_id: record?.coral_ref_id || payload.coral_id || payload.id || record?.coral_id,
    nome: record?.coral_nome || payload.nome || record?.nome || record?.titulo,
    cidade: record?.cidade || payload.cidade,
    maestro_email: record?.maestro_email || payload.maestro_email,
    bloqueado: record?.bloqueado ?? payload.bloqueado,
    status_aprovacao: record?.status_aprovacao || payload.status_aprovacao,
  };
};

export const normalizeCoralOption = (coral) => {
  const source = parseDirectoryRecord(coral);
  const rawId = source?.coral_id === DIRECTORY_CORAL_ID ? source?.coral_ref_id : source?.coral_id;
  const id = asText(rawId || source?.coralId || source?.id);
  const nome = asText(
    source?.nome ||
      source?.coral_nome ||
      source?.nome_coral ||
      source?.nome_vocal ||
      source?.vocal_nome ||
      source?.name ||
      source?.titulo ||
      source?.title
  );

  if (!id || !nome) return null;

  return {
    id,
    coral_id: id,
    nome,
    cidade: asText(source?.cidade),
    maestro_email: asText(source?.maestro_email),
    ativo: source?.ativo !== false,
    bloqueado: source?.bloqueado === true,
    status_aprovacao: asText(source?.status_aprovacao),
    updated_date: source?.updated_date || source?.updated_at || null,
  };
};

export const dedupeCorais = (items) => {
  const map = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const normalized = normalizeCoralOption(item);
    if (!normalized) return;

    map.set(normalized.id, {
      ...(map.get(normalized.id) || {}),
      ...normalized,
    });
  });

  return Array.from(map.values())
    .filter(isCoralAvailable)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
};

export const lerCoraisDoCache = () => {
  if (!hasStorage()) return [];

  try {
    return dedupeCorais(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return [];
  }
};

export const salvarCoraisNoCache = (items) => {
  const corais = dedupeCorais(items);

  if (hasStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(corais));
    } catch {
      // Cache is only a convenience for the signup selector.
    }
  }

  return corais;
};

export const mesclarCoraisNoCache = (items) => salvarCoraisNoCache([...lerCoraisDoCache(), ...dedupeCorais(items)]);

export const removerCoralDoCache = (coralId) =>
  salvarCoraisNoCache(lerCoraisDoCache().filter((coral) => coral.id !== coralId && coral.coral_id !== coralId));

const tryList = async (entity, ...args) => {
  try {
    const result = await entity.list(...args);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.warn('Falha ao listar corais:', error);
    return [];
  }
};

const tryFilter = async (entity, query, ...args) => {
  try {
    const result = await entity.filter(query, ...args);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.warn('Falha ao filtrar corais:', error);
    return [];
  }
};

const isDirectoryRecord = (item) =>
  item?.publicacao_tipo === DIRECTORY_TYPE ||
  item?.tipo === DIRECTORY_TYPE ||
  item?.coral_id === DIRECTORY_CORAL_ID ||
  Boolean(item?.coral_ref_id);

const carregarDiretorioPorAvisos = async (firebaseClient) => {
  const aviso = firebaseClient.entities[DIRECTORY_ENTITY];
  const items = [
    ...(await tryFilter(aviso, { publicacao_tipo: DIRECTORY_TYPE }, '-updated_date', 500, 0, DIRECTORY_FIELDS)),
    ...(await tryFilter(aviso, { tipo: DIRECTORY_TYPE }, '-updated_date', 500, 0, DIRECTORY_FIELDS)),
    ...(await tryFilter(aviso, { coral_id: DIRECTORY_CORAL_ID }, '-updated_date', 500, 0, DIRECTORY_FIELDS)),
    ...(await tryList(aviso, '-updated_date', 500, 0, DIRECTORY_FIELDS)),
  ];

  return items.filter(isDirectoryRecord).map(parseDirectoryRecord);
};

const carregarCoraisDaEntidade = async (firebaseClient, entityName) => {
  const entity = firebaseClient.entities[entityName];
  const fontes = [
    await tryList(entity, 'nome', 500, 0, PUBLIC_FIELDS),
    await tryList(entity, '-created_date', 500, 0, PUBLIC_FIELDS),
    await tryFilter(entity, {}, 'nome', 500, 0, PUBLIC_FIELDS),
    await tryFilter(entity, { ativo: true }, 'nome', 500, 0, PUBLIC_FIELDS),
    await tryFilter(entity, { maestro_email: ADMIN_EMAIL }, 'nome', 500, 0, PUBLIC_FIELDS),
  ];

  return dedupeCorais(fontes.flat());
};

export const carregarCoraisAtivos = async (firebaseClient) =>
  carregarCoraisDaEntidade(firebaseClient, PRIMARY_ENTITY);

export const carregarCoraisParaCadastro = async (firebaseClient) => {
  const coraisAtivos = await carregarCoraisAtivos(firebaseClient);

  if (coraisAtivos.length > 0) {
    return salvarCoraisNoCache(coraisAtivos);
  }

  const fontes = [];

  for (const entityName of LEGACY_SOURCE_ENTITIES) {
    const entity = firebaseClient.entities[entityName];
    fontes.push(await tryList(entity, 'nome', 500, 0, PUBLIC_FIELDS));
    fontes.push(await tryList(entity, '-created_date', 500, 0, PUBLIC_FIELDS));
    fontes.push(await tryFilter(entity, {}, 'nome', 500, 0, PUBLIC_FIELDS));
    fontes.push(await tryFilter(entity, { ativo: true }, 'nome', 500, 0, PUBLIC_FIELDS));
    fontes.push(await tryFilter(entity, { maestro_email: ADMIN_EMAIL }, 'nome', 500, 0, PUBLIC_FIELDS));
  }

  fontes.push(await tryList(firebaseClient.entities[PUBLIC_ENTITY], 'nome', 500, 0, PUBLIC_FIELDS));
  fontes.push(await tryFilter(firebaseClient.entities[PUBLIC_ENTITY], {}, 'nome', 500, 0, PUBLIC_FIELDS));
  fontes.push(await carregarDiretorioPorAvisos(firebaseClient));

  return salvarCoraisNoCache(fontes.flat());
};

export const publicarCoraisNoCatalogo = async (firebaseClient, items) => {
  const corais = salvarCoraisNoCache((Array.isArray(items) ? items : []).filter(isCoralAvailable));
  if (corais.length === 0) return corais;

  let existentes = [];

  try {
    existentes = await firebaseClient.entities[PUBLIC_ENTITY].list('nome', 500, 0, PUBLIC_FIELDS);
  } catch (error) {
    console.warn('Falha ao carregar catalogo de corais:', error);
  }

  const porCoralId = new Map(
    (Array.isArray(existentes) ? existentes : [])
      .map((item) => [asText(item?.coral_id || item?.id), item])
      .filter(([id]) => Boolean(id))
  );

  let avisosDiretorio = [];

  try {
    avisosDiretorio = await carregarDiretorioPorAvisos(firebaseClient);
  } catch (error) {
    console.warn('Falha ao carregar diretorio por avisos:', error);
  }

  const avisoPorCoralId = new Map(
    (Array.isArray(avisosDiretorio) ? avisosDiretorio : [])
      .map((item) => [asText(item?.coral_id || item?.id), item])
      .filter(([id]) => Boolean(id))
  );

  await Promise.all(
    corais.map(async (coral) => {
      const payload = {
        coral_id: coral.id,
        nome: coral.nome,
        cidade: coral.cidade,
        maestro_email: coral.maestro_email,
        status_aprovacao: coral.status_aprovacao || 'aprovado',
        bloqueado: coral.bloqueado === true,
        ativo: coral.ativo !== false,
      };
      const existente = porCoralId.get(coral.id);

      try {
        if (existente?.id && existente.id !== coral.id) {
          await firebaseClient.entities[PUBLIC_ENTITY].update(existente.id, payload);
        } else {
          const encontrados = await tryFilter(firebaseClient.entities[PUBLIC_ENTITY], { coral_id: coral.id }, 'nome', 1, 0, PUBLIC_FIELDS);
          if (encontrados[0]?.id) {
            await firebaseClient.entities[PUBLIC_ENTITY].update(encontrados[0].id, payload);
          } else {
            await firebaseClient.entities[PUBLIC_ENTITY].create(payload);
          }
        }
      } catch (error) {
        console.warn('Falha ao publicar coral no catalogo:', error);
      }

      try {
        const avisoPayload = {
          coral_id: DIRECTORY_CORAL_ID,
          coral_ref_id: coral.id,
          coral_nome: coral.nome,
          nome: coral.nome,
          cidade: coral.cidade,
          maestro_email: coral.maestro_email,
          titulo: coral.nome,
          conteudo: JSON.stringify({
            id: coral.id,
            coral_id: coral.id,
            nome: coral.nome,
            cidade: coral.cidade,
            maestro_email: coral.maestro_email,
            status_aprovacao: coral.status_aprovacao || 'aprovado',
            bloqueado: coral.bloqueado === true,
          }),
          tipo: DIRECTORY_TYPE,
          publicacao_tipo: DIRECTORY_TYPE,
          autor_nome: 'Sistema',
          ativo: coral.ativo !== false,
        };
        const existenteAviso = avisoPorCoralId.get(coral.id);
        const avisoId = existenteAviso?.record_id || existenteAviso?.aviso_id;

        if (avisoId) {
          await firebaseClient.entities[DIRECTORY_ENTITY].update(avisoId, avisoPayload);
        } else {
          await firebaseClient.entities[DIRECTORY_ENTITY].create(avisoPayload);
        }
      } catch (error) {
        console.warn('Falha ao publicar coral em avisos:', error);
      }
    })
  );

  return corais;
};

export const removerCoralDoCatalogo = async (firebaseClient, coralId) => {
  const id = asText(coralId);
  if (!id) return;

  removerCoralDoCache(id);

  const publicos = [
    ...(await tryFilter(firebaseClient.entities[PUBLIC_ENTITY], { coral_id: id }, 'nome', 100, 0, PUBLIC_FIELDS)),
    ...(await tryFilter(firebaseClient.entities[PUBLIC_ENTITY], { id }, 'nome', 100, 0, PUBLIC_FIELDS)),
  ];

  const avisos = [
    ...(await tryFilter(firebaseClient.entities[DIRECTORY_ENTITY], { coral_ref_id: id }, '-updated_date', 100, 0, DIRECTORY_FIELDS)),
    ...(await carregarDiretorioPorAvisos(firebaseClient)).filter((item) => item.coral_id === id || item.id === id),
  ];

  await Promise.all(
    [...publicos, ...avisos]
      .filter((item, index, items) => item?.record_id || item?.id)
      .filter((item, index, items) => {
        const recordId = item.record_id || item.id;
        return items.findIndex((candidate) => (candidate.record_id || candidate.id) === recordId) === index;
      })
      .map(async (item) => {
        const recordId = item.record_id || item.id;
        const entityName = item.publicacao_tipo === DIRECTORY_TYPE || item.tipo === DIRECTORY_TYPE || item.record_id
          ? DIRECTORY_ENTITY
          : PUBLIC_ENTITY;

        try {
          await firebaseClient.entities[entityName].delete(recordId);
        } catch (error) {
          console.warn('Falha ao remover coral do catalogo:', error);
          try {
            await firebaseClient.entities[entityName].update(recordId, { ativo: false });
          } catch (updateError) {
            console.warn('Falha ao desativar coral no catalogo:', updateError);
          }
        }
      })
  );
};
