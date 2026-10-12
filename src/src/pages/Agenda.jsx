import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Calendar, Clock, MapPin, Pencil, Trash2, Music, Users, Presentation, HelpCircle, Upload, Image, ImageOff, FileText } from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import CoralLayout from '@/components/coral/CoralLayout';
import useCoralContext from '@/hooks/useCoralContext';
import { canManageCoral } from '@/lib/coral-permissions';
import { getUploadErrorMessage, uploadCoralFile } from '@/lib/coral-file-upload';
import { getReadableTextStyle } from '@/lib/readable-text';
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

const formatarDataLonga = (value) => {
  if (!value) return 'Data nao informada';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export default function Agenda() {
  const navigate = useNavigate();
  const { user, coral, membro, loading, setCoral } = useCoralContext();
  const [eventos, setEventos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [uploadingFundo, setUploadingFundo] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const emptyForm = { titulo: '', descricao: '', data: '', hora: '', local: '', tipo: 'ensaio' };
  const [form, setForm] = useState(emptyForm);

  const canManage = canManageCoral(user, coral);

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
        agenda_sem_fundo: false,
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

  const removerFundoAgenda = async () => {
    if (!coral || uploadingFundo) return;

    setUploadingFundo(true);
    try {
      const updated = await firebaseClient.entities.Coral.update(coral.id, {
        agenda_fundo_url: '',
        agenda_sem_fundo: true,
      });
      setCoral(updated);
    } catch (error) {
      console.error('Erro ao remover fundo da agenda:', error);
      alert('Nao foi possivel deixar a agenda sem fundo. Tente novamente.');
    } finally {
      setUploadingFundo(false);
    }
  };

  const usarFundoGeralAgenda = async () => {
    if (!coral || uploadingFundo) return;

    setUploadingFundo(true);
    try {
      const updated = await firebaseClient.entities.Coral.update(coral.id, {
        agenda_fundo_url: '',
        agenda_sem_fundo: false,
      });
      setCoral(updated);
    } catch (error) {
      console.error('Erro ao usar fundo geral na agenda:', error);
      alert('Nao foi possivel voltar a usar o fundo geral. Tente novamente.');
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
  const agendaTextStyle = getReadableTextStyle(coral.agenda_texto_cor || '#111827');
  const agendaMutedTextStyle = { ...agendaTextStyle, opacity: 0.78 };
  const agendaImageUrl = coral.agenda_sem_fundo ? '' : (coral.agenda_fundo_url || coral.pagina_fundo_url);
  const hasAgendaBackground = Boolean(agendaImageUrl);
  const agendaBackgroundStyle = hasAgendaBackground
    ? {
        backgroundImage: `url("${agendaImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {};

  const AgendaInfoCard = ({ icon: Icon, label, children, className = '', accent = '#0f6fbb', iconBg = '#e0f2fe' }) => (
    <div className={`rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur-sm ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
          <Icon className="h-6 w-6" style={{ color: accent }} />
        </div>
        <div className="min-w-0 border-l border-sky-200 pl-3">
          <p className="text-sm font-bold text-sky-950">{label}</p>
          <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 sm:text-base">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  const EventoCard = ({ ev }) => {
    const tipo = getTipoEvento(ev.tipo);
    const Icon = tipo.icon;
    const dataObj = new Date(ev.data + 'T00:00:00');
    const passado = ev.data < hoje;
    const poster = (
      <div
        className={`relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/95 via-sky-50/95 to-emerald-50/90 p-4 shadow-xl shadow-sky-900/10 sm:p-6 ${passado ? 'opacity-75' : ''}`}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-200/40" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-28 w-48 rounded-full bg-sky-200/50" />
        <Music className="pointer-events-none absolute left-5 top-8 h-10 w-10 text-sky-300/70" />
        <Music className="pointer-events-none absolute bottom-8 right-5 h-9 w-9 text-emerald-300/70" />

        <div className="relative">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Musica • Comunhao • Proposito</p>
            <h3 className="mt-2 bg-gradient-to-r from-blue-800 via-sky-600 to-emerald-600 bg-clip-text text-3xl font-black text-transparent sm:text-5xl">
              Agenda Coral
            </h3>
            <div className="mx-auto mt-2 h-1 w-32 rounded-full bg-gradient-to-r from-blue-700 to-emerald-500" />
            <p className="mt-3 break-words text-sm font-semibold text-slate-600">{coral?.nome || 'Meu Coral'}</p>
            {passado && <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Encerrado</p>}
          </div>

          {canManage && (
            <div className="absolute right-0 top-0 flex gap-1">
              <button onClick={() => abrirEdicao(ev)}
                className="rounded-full bg-white/80 p-2 text-slate-500 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                title="Editar evento">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => excluir(ev.id)}
                className="rounded-full bg-white/80 p-2 text-slate-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                title="Excluir evento">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <AgendaInfoCard icon={Calendar} label="Data" accent="#0f5fa8" iconBg="#dbeafe">
              {formatarDataLonga(ev.data)}
            </AgendaInfoCard>
            <AgendaInfoCard icon={Clock} label="Horario" accent="#047857" iconBg="#d1fae5">
              {ev.hora || 'Horario a definir'}
            </AgendaInfoCard>
            <AgendaInfoCard icon={MapPin} label="Local" accent="#0f5fa8" iconBg="#dbeafe">
              {ev.local || 'Local a definir'}
            </AgendaInfoCard>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <AgendaInfoCard icon={Icon} label={tipo.label} accent={tipo.color} iconBg={tipo.bg}>
              {ev.titulo || 'Atividade a definir'}
            </AgendaInfoCard>
            <AgendaInfoCard icon={Presentation} label="Informacoes" accent="#0f5fa8" iconBg="#dbeafe">
              {ev.descricao || 'Sem informacoes adicionais.'}
            </AgendaInfoCard>
          </div>

          <AgendaInfoCard icon={FileText} label="Observacoes" className="mt-3" accent="#0f5fa8" iconBg="#dbeafe">
            {ev.descricao || 'Sem observacoes.'}
          </AgendaInfoCard>

          <div className="mt-5 h-2 rounded-full bg-gradient-to-r from-sky-300 via-emerald-300 to-sky-200" />
        </div>
      </div>
    );

    return poster || (
      <div
        className={`rounded-2xl overflow-hidden bg-transparent shadow-none border border-transparent ${passado ? 'opacity-60' : ''}`}
        style={{ background: 'transparent', backgroundColor: 'transparent' }}
      >
        <div className="flex bg-transparent" style={{ background: 'transparent', backgroundColor: 'transparent' }}>
          {/* Data */}
          <div className="w-16 flex-shrink-0 flex flex-col items-center justify-start py-4 text-white rounded-l-2xl"
            style={{ backgroundColor: passado ? '#94a3b8' : tipo.color }}>
            <span className="text-xs font-medium uppercase">
              {dataObj.toLocaleDateString('pt-BR', { month: 'short' })}
            </span>
            <span className="text-2xl font-bold leading-tight">
              {dataObj.getDate()}
            </span>
          </div>
          {/* Conteúdo */}
          <div className="flex-1 p-3 min-w-0 bg-transparent" style={{ background: 'transparent', backgroundColor: 'transparent' }}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: tipo.bg, color: tipo.color }}>
                    {tipo.label}
                  </span>
                  {passado && <span className="text-xs" style={agendaMutedTextStyle}>Encerrado</span>}
                </div>
                <h3 className="break-words text-base font-semibold leading-snug" style={agendaTextStyle}>{ev.titulo}</h3>
                {ev.descricao && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed" style={agendaMutedTextStyle}>
                    {ev.descricao}
                  </p>
                )}
                <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                  {ev.hora && (
                    <span className="flex min-w-0 items-center gap-1 text-xs" style={agendaMutedTextStyle}>
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="break-words">{ev.hora}</span>
                    </span>
                  )}
                  {ev.local && (
                    <span className="flex min-w-0 items-start gap-1 text-xs" style={agendaMutedTextStyle}>
                      <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="break-words">{ev.local}</span>
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex flex-shrink-0 justify-end gap-1 sm:justify-start">
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
    <CoralLayout coral={coral} user={user} isMaestro={canManage} membro={membro}>
      <div
        className={hasAgendaBackground ? 'rounded-3xl p-4 -mx-2 -mt-2' : ''}
        style={agendaBackgroundStyle}
      >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold" style={agendaTextStyle}>Agenda do Coral</h2>
          <p className="text-sm" style={agendaMutedTextStyle}>{proximos.length} próximo{proximos.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap justify-end gap-2">
            <label
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-transparent bg-transparent shadow-none cursor-pointer transition-colors hover:bg-transparent"
              style={agendaTextStyle}
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
              type="button"
              onClick={usarFundoGeralAgenda}
              disabled={uploadingFundo}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-transparent bg-transparent shadow-none transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              style={agendaTextStyle}
              title="Usar o fundo geral do coral na agenda"
            >
              <Image className="w-4 h-4" />
              Fundo geral
            </button>
            <button
              type="button"
              onClick={removerFundoAgenda}
              disabled={uploadingFundo}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-transparent bg-transparent shadow-none transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              style={agendaTextStyle}
              title="Deixar agenda sem fundo"
            >
              <ImageOff className="w-4 h-4" />
              Sem fundo
            </button>
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
              : {
                  backgroundColor: 'transparent',
                  color: agendaTextStyle.color,
                  borderColor: 'transparent',
                  textShadow: agendaTextStyle.textShadow,
                }}
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
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={agendaMutedTextStyle}>Próximos Eventos</h3>
          <div className="space-y-3">
            {proximos.map(ev => <EventoCard key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      {/* Passados */}
      {passados.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={agendaMutedTextStyle}>Eventos Anteriores</h3>
          <div className="space-y-3">
            {[...passados].reverse().map(ev => <EventoCard key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      {eventosFiltrados.length === 0 && (
        <div className="rounded-2xl p-12 text-center bg-transparent shadow-none border border-transparent">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p style={agendaMutedTextStyle}>Nenhum evento agendado.</p>
        </div>
      )}
      </div>
    </CoralLayout>
  );
}
