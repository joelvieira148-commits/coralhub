import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Calendar, Clock, MapPin, Pencil, Trash2, Music, Users, Presentation, HelpCircle, Upload } from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import CoralLayout from '@/components/coral/CoralLayout';
import useCoralContext from '@/hooks/useCoralContext';
import { getUploadErrorMessage, uploadCoralFile } from '@/lib/coral-file-upload';
import { verificarEspaco, formatarBytes } from '@/utils/storage';

const TIPOS_EVENTO = [
  { value: 'ensaio', label: 'Ensaio', icon: Music, color: '#6366f1', bg: '#eef2ff' },
  { value: 'apresentacao', label: 'Apresentação', icon: Users, color: '#10b981', bg: '#ecfdf5' },
  { value: 'reuniao', label: 'Reunião', icon: Presentation, color: '#f59e0b', bg: '#fffbeb' },
  { value: 'outro', label: 'Outro', icon: HelpCircle, color: '#94a3b8', bg: '#f8fafc' },
];

function getTipoEvento(value) {
  return TIPOS_EVENTO.find(t => t.value === value) || TIPOS_EVENTO[0];
}

const podeGerenciar = (isMaestro, membro) =>
  isMaestro || membro?.cargo === 'secretaria' || membro?.cargo === 'vice_secretaria';

export default function Agenda() {
  const navigate = useNavigate();
  const { user, coral, membro, isMaestro, loading, setCoral } = useCoralContext();
  const [eventos, setEventos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [uploadingFundo, setUploadingFundo] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const emptyForm = { titulo: '', descricao: '', data: '', hora: '', local: '', tipo: 'ensaio' };
  const [form, setForm] = useState(emptyForm);

  const canManage = podeGerenciar(isMaestro, membro);

  useEffect(() => {
    if (!loading && user && !coral && !membro) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, user, coral, membro, navigate]);

  useEffect(() => {
    if (!coral) return;
    firebaseClient.entities.Evento.filter({ coral_id: coral.id }, 'data').then(data => {
      // Ordena por data crescente
      const sorted = [...data].sort((a, b) => new Date(a.data) - new Date(b.data));
      setEventos(sorted);
    });
  }, [coral]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const abrirEdicao = (ev) => {
    setEditando(ev);
    setForm({ titulo: ev.titulo, descricao: ev.descricao || '', data: ev.data, hora: ev.hora || '', local: ev.local || '', tipo: ev.tipo });
    setShowForm(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    const payload = { ...form, coral_id: coral.id, autor_nome: membro?.nome || user.email };

    if (editando) {
      const updated = await firebaseClient.entities.Evento.update(editando.id, payload);
      setEventos(prev => {
        const list = prev.map(ev => ev.id === editando.id ? updated : ev);
        return list.sort((a, b) => new Date(a.data) - new Date(b.data));
      });
    } else {
      const novo = await firebaseClient.entities.Evento.create(payload);
      setEventos(prev => [...prev, novo].sort((a, b) => new Date(a.data) - new Date(b.data)));
    }

    setShowForm(false);
    setSalvando(false);
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este evento?')) return;
    await firebaseClient.entities.Evento.delete(id);
    setEventos(prev => prev.filter(ev => ev.id !== id));
  };

  const trocarFundoAgenda = async (file) => {
    if (!file || !coral) return;

    const espaco = verificarEspaco(coral, file.size);
    if (!espaco.ok) {
      alert(`Limite de armazenamento atingido (1 TB). Espaco restante: ${formatarBytes(espaco.restante)}.`);
      return;
    }

    setUploadingFundo(true);
    try {
      const upload = await uploadCoralFile(firebaseClient, file, { kind: 'image' });
      const updated = await firebaseClient.entities.Coral.update(coral.id, {
        agenda_fundo_url: upload.file_url,
        armazenamento_usado_bytes: (coral.armazenamento_usado_bytes || 0) + upload.file_size,
      });
      setCoral(updated);
    } catch (error) {
      console.error('Erro ao enviar fundo da agenda:', error);
      alert(getUploadErrorMessage(error, 'o fundo da agenda'));
    } finally {
      setUploadingFundo(false);
    }
  };

  const hoje = new Date().toISOString().split('T')[0];

  const eventosFiltrados = eventos.filter(ev =>
    filtroTipo === 'todos' || ev.tipo === filtroTipo
  );

  const proximos = eventosFiltrados.filter(ev => ev.data >= hoje);
  const passados = eventosFiltrados.filter(ev => ev.data < hoje);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (!coral) return null;

  const primary = coral.cor_primaria || '#6366f1';
  const agendaBackgroundStyle = coral.agenda_fundo_url
    ? {
        backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.80), rgba(248, 250, 252, 0.92)), url("${coral.agenda_fundo_url}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {};

  const EventoCard = ({ ev }) => {
    const tipo = getTipoEvento(ev.tipo);
    const Icon = tipo.icon;
    const dataObj = new Date(ev.data + 'T00:00:00');
    const passado = ev.data < hoje;

    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${passado ? 'opacity-60' : ''}`}>
        <div className="flex">
          {/* Data */}
          <div className="w-16 flex-shrink-0 flex flex-col items-center justify-center py-4 text-white rounded-l-2xl"
            style={{ backgroundColor: passado ? '#94a3b8' : tipo.color }}>
            <span className="text-xs font-medium uppercase">
              {dataObj.toLocaleDateString('pt-BR', { month: 'short' })}
            </span>
            <span className="text-2xl font-bold leading-tight">
              {dataObj.getDate()}
            </span>
          </div>
          {/* Conteúdo */}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: tipo.bg, color: tipo.color }}>
                    {tipo.label}
                  </span>
                  {passado && <span className="text-xs text-gray-400">Encerrado</span>}
                </div>
                <h3 className="font-semibold text-gray-800 truncate">{ev.titulo}</h3>
                {ev.descricao && <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.descricao}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {ev.hora && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />{ev.hora}
                    </span>
                  )}
                  {ev.local && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />{ev.local}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => abrirEdicao(ev)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => excluir(ev.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <CoralLayout coral={coral} user={user} isMaestro={isMaestro}>
      <div
        className={coral.agenda_fundo_url ? 'rounded-3xl p-4 -mx-2 -mt-2 shadow-inner' : ''}
        style={agendaBackgroundStyle}
      >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Agenda do Coral</h2>
          <p className="text-sm text-gray-500">{proximos.length} próximo{proximos.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap justify-end gap-2">
            <label
              className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm border border-gray-100 hover:bg-gray-50 cursor-pointer"
              title="Trocar fundo da agenda"
            >
              <Upload className="w-4 h-4" />
              {uploadingFundo ? 'Enviando...' : 'Trocar fundo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingFundo}
                onChange={(event) => event.target.files[0] && trocarFundoAgenda(event.target.files[0])}
              />
            </label>
            <button
              onClick={abrirNovo}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              <Plus className="w-4 h-4" /> Novo Evento
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[{ value: 'todos', label: 'Todos' }, ...TIPOS_EVENTO].map(t => (
          <button
            key={t.value}
            onClick={() => setFiltroTipo(t.value)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all border"
            style={filtroTipo === t.value
              ? { backgroundColor: primary, color: '#fff', borderColor: primary }
              : { backgroundColor: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Modal */}
      {showForm && canManage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800">{editando ? 'Editar Evento' : 'Novo Evento'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={salvar} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input required value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input required type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                <input value={form.local} onChange={e => setForm(p => ({ ...p, local: e.target.value }))}
                  placeholder="Ex: Igreja Central, Auditório..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
              </div>
              <button type="submit" disabled={salvando}
                className="w-full text-white font-semibold py-3 rounded-xl disabled:opacity-60"
                style={{ backgroundColor: primary }}>
                {salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar Evento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Próximos */}
      {proximos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Próximos Eventos</h3>
          <div className="space-y-3">
            {proximos.map(ev => <EventoCard key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      {/* Passados */}
      {passados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Eventos Anteriores</h3>
          <div className="space-y-3">
            {[...passados].reverse().map(ev => <EventoCard key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      {eventosFiltrados.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum evento agendado.</p>
        </div>
      )}
      </div>
    </CoralLayout>
  );
}
