import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCopy,
  Clock,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import { isAccessReportViewerByMember } from '@/lib/admin-access';

const formatarAcesso = (value) => {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nunca';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAcessoKey = (acesso) =>
  String(acesso?.user_email || '').trim().toLowerCase() || acesso?.membro_id || acesso?.user_nome || 'usuario';

const getAcessosDoCoral = (acessos = [], coralId) =>
  acessos
    .filter((acesso) => acesso.coral_id === coralId)
    .sort((left, right) => new Date(right.acessado_em || right.created_date || 0).getTime() - new Date(left.acessado_em || left.created_date || 0).getTime());

const getResumoAcessosPorPessoa = (acessos = []) => {
  const records = new Map();

  acessos.forEach((acesso) => {
    const key = getAcessoKey(acesso);
    const current = records.get(key) || {
      key,
      nome: acesso.user_nome || acesso.user_email || 'Usuario',
      email: acesso.user_email || '',
      papel: acesso.papel || 'membro',
      total: 0,
      ultimo: null,
      paginas: new Map(),
    };
    const dataAcesso = acesso.acessado_em || acesso.created_date || '';
    const pagina = acesso.pagina_nome || acesso.pagina || 'Plataforma';

    current.total += 1;
    current.ultimo = !current.ultimo || new Date(dataAcesso).getTime() > new Date(current.ultimo).getTime()
      ? dataAcesso
      : current.ultimo;
    current.paginas.set(pagina, (current.paginas.get(pagina) || 0) + 1);
    records.set(key, current);
  });

  return [...records.values()].sort((left, right) => new Date(right.ultimo || 0).getTime() - new Date(left.ultimo || 0).getTime());
};

const formatarPaginas = (paginas) =>
  [...paginas.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([pagina, total]) => `${pagina} (${total})`)
    .join(', ');

const getPapelAcessoLabel = (papel) => (papel === 'maestro' ? 'Maestro/Maestrina' : 'Membro');

const montarRelatorioAcessos = ({
  coral,
  acessos = [],
  resumoPessoas = [],
  totalAcessosMaestro = 0,
  totalAcessosMembros = 0,
}) => {
  const linhas = [
    'RELATORIO DE ACESSO DA PLATAFORMA',
    `Plataforma: ${coral?.nome || 'Plataforma'}`,
    `Cidade: ${coral?.cidade || 'Nao informado'}`,
    `Maestro/Maestrina: ${coral?.maestro_nome || coral?.maestro_email || 'Nao informado'}`,
    `Gerado em: ${formatarAcesso(new Date().toISOString())}`,
    '',
    'TOTAIS',
    `Total de acessos: ${acessos.length}`,
    `Acessos de maestro/maestrina: ${totalAcessosMaestro}`,
    `Acessos de membros: ${totalAcessosMembros}`,
    '',
    'RESUMO POR PESSOA',
  ];

  if (resumoPessoas.length === 0) {
    linhas.push('Nenhum acesso registrado.');
  } else {
    resumoPessoas.forEach((pessoa, index) => {
      linhas.push(
        `${index + 1}. ${pessoa.nome || 'Usuario'} - ${getPapelAcessoLabel(pessoa.papel)}`,
        `   Email: ${pessoa.email || 'Nao informado'}`,
        `   Total: ${pessoa.total} acesso${pessoa.total !== 1 ? 's' : ''}`,
        `   Ultimo acesso: ${formatarAcesso(pessoa.ultimo)}`,
        `   Acessou: ${formatarPaginas(pessoa.paginas) || 'Nao informado'}`
      );
    });
  }

  linhas.push('', 'ULTIMOS ACESSOS');

  if (acessos.length === 0) {
    linhas.push('Nenhum acesso registrado.');
  } else {
    acessos.forEach((acesso, index) => {
      linhas.push(
        `${index + 1}. ${formatarAcesso(acesso.acessado_em || acesso.created_date)} - ${acesso.user_nome || acesso.user_email || 'Usuario'} - ${getPapelAcessoLabel(acesso.papel)} - ${acesso.pagina_nome || acesso.pagina || 'Plataforma'}`
      );
    });
  }

  return linhas.join('\n');
};

export default function AdminAcessos() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [corais, setCorais] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [coralSelecionado, setCoralSelecionado] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const me = await firebaseClient.auth.me();
        const [allCorais, allMembros, allAcessos] = await Promise.all([
          firebaseClient.entities.Coral.list('-created_date').catch(() => []),
          firebaseClient.entities.Membro.list('-created_date').catch(() => []),
          firebaseClient.entities.AcessoPlataforma.list('-created_date', 1000).catch(() => []),
        ]);

        if (!active) return;

        if (!isAccessReportViewerByMember(me, allMembros)) {
          navigate('/mural', { replace: true });
          return;
        }

        firebaseClient.entities.AcessoRelatorioAdmin.create({
          user_email: me.email || '',
          user_nome: me.full_name || me.member_nome || me.email || 'Usuario',
          pagina: '/admin/acessos',
          pagina_nome: 'Relatorios de acesso',
          acessado_em: new Date().toISOString(),
        }).catch((error) => {
          console.warn('Falha ao registrar acesso ao relatorio admin:', error);
        });

        setUser(me);
        setCorais(allCorais);
        setAcessos(allAcessos);
      } catch (error) {
        console.error('Falha ao carregar relatorios de acesso:', error);
        if (active) navigate('/mural', { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [navigate]);

  const coraisFiltrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return corais;

    return corais.filter((coral) =>
      [coral.nome, coral.cidade, coral.maestro_email]
        .some((value) => String(value || '').toLowerCase().includes(termo))
    );
  }, [corais, search]);

  const acessosDoCoralSelecionado = coralSelecionado
    ? getAcessosDoCoral(acessos, coralSelecionado.id)
    : [];
  const resumoPessoasAcesso = getResumoAcessosPorPessoa(acessosDoCoralSelecionado);
  const totalAcessosMaestro = acessosDoCoralSelecionado.filter((acesso) => acesso.papel === 'maestro').length;
  const totalAcessosMembros = acessosDoCoralSelecionado.length - totalAcessosMaestro;
  const relatorioAcessosTexto = coralSelecionado
    ? montarRelatorioAcessos({
      coral: coralSelecionado,
      acessos: acessosDoCoralSelecionado,
      resumoPessoas: resumoPessoasAcesso,
      totalAcessosMaestro,
      totalAcessosMembros,
    })
    : '';

  const copiarRelatorioAcessos = async () => {
    if (!relatorioAcessosTexto.trim()) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(relatorioAcessosTexto);
      } else {
        const area = document.createElement('textarea');
        area.value = relatorioAcessosTexto;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }

      alert('Relatorio copiado.');
    } catch (error) {
      console.error('Falha ao copiar relatorio de acessos:', error);
      alert('Nao foi possivel copiar automaticamente. Selecione o texto do relatorio e copie manualmente.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center app-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-background">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-gray-900 to-gray-700 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/mural')}
            className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">Relatorios de acesso</h1>
            <p className="truncate text-xs text-white/70">{user?.full_name || user?.email}</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-white/70" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar plataforma"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {coraisFiltrados.map((coral) => {
            const acessosDoCoral = getAcessosDoCoral(acessos, coral.id);
            const ultimoAcesso = acessosDoCoral[0];

            return (
              <div key={coral.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-gray-900">{coral.nome || 'Plataforma sem nome'}</h2>
                    <p className="truncate text-xs text-gray-500">{coral.cidade || coral.maestro_email || 'Sem cidade informada'}</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                    {acessosDoCoral.length}
                  </span>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  Ultimo acesso: {formatarAcesso(ultimoAcesso?.acessado_em || ultimoAcesso?.created_date)}
                </p>
                <button
                  type="button"
                  onClick={() => setCoralSelecionado(coral)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  <Users className="h-4 w-4" />
                  Ver relatorio
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {coralSelecionado && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-gray-900">
                  Acessos - {coralSelecionado.nome || 'Plataforma'}
                </h3>
                <p className="text-xs text-gray-500">
                  {acessosDoCoralSelecionado.length} acesso{acessosDoCoralSelecionado.length !== 1 ? 's' : ''} registrado{acessosDoCoralSelecionado.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoralSelecionado(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-500">Total</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{acessosDoCoralSelecionado.length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-500">Maestro/Maestrina</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{totalAcessosMaestro}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-500">Membros</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{totalAcessosMembros}</p>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Relatorio para arquivar</h4>
                    <p className="text-xs text-gray-500">Texto pronto para copiar e guardar.</p>
                  </div>
                  <button
                    type="button"
                    onClick={copiarRelatorioAcessos}
                    disabled={acessosDoCoralSelecionado.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" />
                    Copiar
                  </button>
                </div>
                <textarea
                  readOnly
                  value={relatorioAcessosTexto}
                  className="h-44 w-full resize-y rounded-lg border border-indigo-100 bg-white p-3 font-mono text-xs text-gray-700 outline-none focus:border-indigo-300"
                />
              </div>

              {acessosDoCoralSelecionado.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">Ainda nao ha acessos registrados para esta plataforma.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-bold text-gray-800">Resumo por pessoa</h4>
                    <div className="space-y-2">
                      {resumoPessoasAcesso.map((pessoa) => (
                        <div key={pessoa.key} className="rounded-xl border border-gray-100 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800">{pessoa.nome}</p>
                              <p className="truncate text-xs text-gray-400">{pessoa.email || pessoa.papel}</p>
                            </div>
                            <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                              {pessoa.total}x
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">Ultimo: {formatarAcesso(pessoa.ultimo)}</p>
                          <p className="mt-1 break-words text-xs text-gray-500">
                            Acessou: {formatarPaginas(pessoa.paginas)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-bold text-gray-800">Ultimos acessos</h4>
                    <div className="space-y-2">
                      {acessosDoCoralSelecionado.slice(0, 50).map((acesso) => (
                        <div key={acesso.id} className="rounded-xl border border-gray-100 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800">
                                {acesso.user_nome || acesso.user_email || 'Usuario'}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                {acesso.pagina_nome || acesso.pagina || 'Plataforma'}
                              </p>
                            </div>
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                              {acesso.papel === 'maestro' ? 'Maestro' : 'Membro'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-400">
                            {formatarAcesso(acesso.acessado_em || acesso.created_date)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
