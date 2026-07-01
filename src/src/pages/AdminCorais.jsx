import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Check,
  Library,
  Mail,
  MapPin,
  Music,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { supabaseClient } from '@/api/supabaseClient';
import AdminPasswordGate from '@/components/coral/AdminPasswordGate';
import { isAdminUser } from '@/lib/admin-access';
import { publicarCoraisNoCatalogo, removerCoralDoCatalogo } from '@/lib/coral-directory';

const emptyForm = {
  nome: '',
  telefone_contato: '',
  cidade: '',
  endereco: '',
  descricao: '',
};

export default function AdminCorais() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [corais, setCorais] = useState([]);
  const [membros, setMembros] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);

  useEffect(() => {
    async function load() {
      const me = await supabaseClient.auth.me();
      setUser(me);

      if (!isAdminUser(me)) {
        navigate('/mural', { replace: true });
        return;
      }

      const [allCorais, allMembros] = await Promise.all([
        supabaseClient.entities.Coral.list(),
        supabaseClient.entities.Membro.list(),
      ]);

      setCorais(allCorais);
      setMembros(allMembros);
      publicarCoraisNoCatalogo(supabaseClient, allCorais).catch((error) => {
        console.warn('Falha ao sincronizar catalogo de corais:', error);
      });
      setLoading(false);
    }

    load();
  }, [navigate]);

  const filtered = corais.filter((coral) => {
    const termo = search.toLowerCase();
    return [
      coral.nome,
      coral.telefone_contato,
      coral.cidade,
      coral.endereco,
      coral.maestro_email,
    ].some((value) => String(value || '').toLowerCase().includes(termo));
  });

  const iniciarEdicao = (coral) => {
    setEditando(coral.id);
    setForm({
      nome: coral.nome || '',
      telefone_contato: coral.telefone_contato || '',
      cidade: coral.cidade || '',
      endereco: coral.endereco || '',
      descricao: coral.descricao || '',
    });
  };

  const cancelar = () => {
    setEditando(null);
    setForm(emptyForm);
  };

  const sincronizarCadastro = async () => {
    setSincronizando(true);
    try {
      await publicarCoraisNoCatalogo(supabaseClient, corais);
      alert('Nomes publicados para o cadastro dos membros.');
    } catch (error) {
      console.warn('Falha ao publicar nomes para cadastro:', error);
      alert('Nao foi possivel publicar os nomes. Tente novamente.');
    } finally {
      setSincronizando(false);
    }
  };

  const salvar = async (coralId) => {
    setSalvando(true);
    const updated = await supabaseClient.entities.Coral.update(coralId, form);
    setCorais((prev) => prev.map((coral) => (coral.id === coralId ? updated : coral)));
    publicarCoraisNoCatalogo(supabaseClient, [updated]).catch((error) => {
      console.warn('Falha ao atualizar catalogo de corais:', error);
    });
    setSalvando(false);
    cancelar();
  };

  const excluirRegistrosDoCoral = async (entityName, coralId) => {
    try {
      const registros = await supabaseClient.entities[entityName].filter({ coral_id: coralId });
      await Promise.all(registros.map((registro) => supabaseClient.entities[entityName].delete(registro.id)));
      return registros.length;
    } catch (error) {
      console.warn(`Falha ao excluir registros de ${entityName}:`, error);
      return 0;
    }
  };

  const excluirCoral = async (coral) => {
    const nome = coral.nome || 'este coral';
    const confirmado = confirm(
      `Excluir ${nome}?\n\nIsso vai apagar o coral, membros, musicas, eventos e avisos ligados a ele. Esta acao nao pode ser desfeita.`
    );

    if (!confirmado) return;

    setExcluindo(coral.id);

    try {
      await Promise.all([
        excluirRegistrosDoCoral('Membro', coral.id),
        excluirRegistrosDoCoral('Musica', coral.id),
        excluirRegistrosDoCoral('Evento', coral.id),
        excluirRegistrosDoCoral('Aviso', coral.id),
      ]);

      await removerCoralDoCatalogo(supabaseClient, coral.id);
      await supabaseClient.entities.Coral.delete(coral.id);

      setCorais((prev) => prev.filter((item) => item.id !== coral.id));
      setMembros((prev) => prev.filter((item) => item.coral_id !== coral.id));
      if (editando === coral.id) cancelar();
      alert('Coral excluido com sucesso.');
    } catch (error) {
      console.error('Falha ao excluir coral:', error);
      alert('Nao foi possivel excluir o coral. Tente novamente.');
    } finally {
      setExcluindo(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AdminPasswordGate user={user} backPath="/mural">
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-gray-900 to-gray-700 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-5 h-5 text-white/70 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-bold text-sm">Admin · Corais</h1>
              <p className="text-xs text-white/60">{corais.length} coral{corais.length !== 1 ? 'is' : ''} registrado{corais.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={sincronizarCadastro}
              disabled={sincronizando || corais.length === 0}
              className="flex items-center gap-1.5 text-white/75 hover:text-white text-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} /> Publicar nomes
            </button>
            <button
              onClick={() => navigate('/admin/biblioteca')}
              className="hidden sm:flex items-center gap-1.5 text-white/75 hover:text-white text-xs transition-colors"
            >
              <Library className="w-4 h-4" /> Biblioteca
            </button>
            <button
              onClick={() => navigate('/mural')}
              className="flex items-center gap-1.5 text-white/75 hover:text-white text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-16">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar coral, maestro, telefone ou endereço..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <Music className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum coral encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((coral) => {
              const totalMembros = membros.filter((membro) => membro.coral_id === coral.id).length;
              const primary = coral.cor_primaria || '#6366f1';
              const isEditing = editando === coral.id;

              return (
                <div key={coral.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nome do coral</label>
                          <input
                            value={form.nome}
                            onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                            <input
                              value={form.telefone_contato}
                              onChange={(event) => setForm((prev) => ({ ...prev, telefone_contato: event.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
                            <input
                              value={form.cidade}
                              onChange={(event) => setForm((prev) => ({ ...prev, cidade: event.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
                          <input
                            value={form.endereco}
                            onChange={(event) => setForm((prev) => ({ ...prev, endereco: event.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                          <textarea
                            value={form.descricao}
                            onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => salvar(coral.id)}
                            disabled={salvando}
                            className="flex items-center justify-center gap-1.5 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium disabled:opacity-60"
                          >
                            <Check className="w-4 h-4" /> Salvar
                          </button>
                          <button
                            onClick={cancelar}
                            className="flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium"
                          >
                            <X className="w-4 h-4" /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          {coral.logo_url ? (
                            <img src={coral.logo_url} alt={coral.nome} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${primary}18` }}
                            >
                              <Music className="w-5 h-5" style={{ color: primary }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h2 className="font-semibold text-gray-800 truncate">{coral.nome}</h2>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Users className="w-3.5 h-3.5" /> {totalMembros} membro{totalMembros !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => iniciarEdicao(coral)}
                            className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                            title="Editar coral"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => excluirCoral(coral)}
                            disabled={excluindo === coral.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                            title="Excluir coral"
                          >
                            {excluindo === coral.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        <div className="space-y-1.5 text-sm text-gray-500">
                          {coral.maestro_email && (
                            <p className="flex items-center gap-2 min-w-0">
                              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{coral.maestro_email}</span>
                            </p>
                          )}
                          {coral.telefone_contato && (
                            <p className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{coral.telefone_contato}</span>
                            </p>
                          )}
                          {(coral.endereco || coral.cidade) && (
                            <p className="flex items-center gap-2 min-w-0">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{[coral.endereco, coral.cidade].filter(Boolean).join(' · ')}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
    </AdminPasswordGate>
  );
}
