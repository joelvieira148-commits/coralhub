import { useEffect, useState } from 'react';
import { Upload, Music, X, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { firebaseClient } from '@/api/firebaseClient';
import CoralLayout from '@/components/coral/CoralLayout';
import useCoralContext from '@/hooks/useCoralContext';
import AudioPlayer from '@/components/coral/AudioPlayer';
import PartituraViewer from '@/components/coral/PartituraViewer';
import StorageIndicator from '@/components/coral/StorageIndicator';
import { isAdminUser } from '@/lib/admin-access';
import { getUploadErrorMessage, uploadCoralFile } from '@/lib/coral-file-upload';
import { NAIPES } from '@/utils/coralTheme';
import { verificarEspaco, formatarBytes } from '@/utils/storage';

const CATEGORIAS = ['sacra', 'popular', 'classica', 'gospel', 'folclorica', 'outro'];

// Mapa de naipe do membro → chave de áudio na música
const NAIPE_AUDIO_KEY = {
  soprano1: 'audio_soprano1_url',
  soprano2: 'audio_soprano2_url',
  contralto: 'audio_contralto_url',
  tenor: 'audio_tenor_url',
  baritono: 'audio_baritono_url',
  baixo: 'audio_baixo_url',
};

export default function Biblioteca() {
  const navigate = useNavigate();
  const { user, coral, membro, isMaestro, loading, setCoral } = useCoralContext();
  const [musicas, setMusicas] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null); // música sendo editada
  const [uploading, setUploading] = useState(false);

  const emptyForm = { titulo: '', compositor: '', descricao: '', categoria: 'outro', tom: '' };
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState({});

  useEffect(() => {
    if (!loading && user && !coral && !membro) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, user, coral, membro, navigate]);

  useEffect(() => {
    if (!coral) return;
    firebaseClient.entities.Musica.filter({ coral_id: coral.id }).then(setMusicas);
  }, [coral]);

  const abrirNova = () => {
    setEditando(null);
    setForm(emptyForm);
    setFiles({});
    setShowForm(true);
  };

  const abrirEdicao = (m) => {
    setEditando(m);
    setForm({
      titulo: m.titulo || '',
      compositor: m.compositor || '',
      descricao: m.descricao || '',
      categoria: m.categoria || 'outro',
      tom: m.tom || '',
    });
    setFiles({});
    setShowForm(true);
  };

  const handleFile = async (key, file) => {
    const kind = key === 'partitura' ? 'pdf' : 'audio';
    const espaco = verificarEspaco(coral, file.size);
    if (!espaco.ok) {
      alert(`Limite de armazenamento atingido (1 TB). Espaço restante: ${formatarBytes(espaco.restante)}.`);
      return;
    }
    setFiles(p => ({ ...p, [key]: { file, name: file.name, uploading: true } }));
    try {
      const upload = await uploadCoralFile(firebaseClient, file, { kind });
      setFiles(p => ({
        ...p,
        [key]: {
          file_url: upload.file_url,
          name: upload.file_name,
          uploading: false,
          size: upload.file_size,
        },
      }));
    } catch (error) {
      console.error('Erro ao enviar arquivo da musica:', error);
      alert(getUploadErrorMessage(error, key === 'partitura' ? 'a partitura' : 'o audio'));
      setFiles(p => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    }
  };

  const salvar = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {

    // Para edição, mantém URLs existentes se não substituídas
    const base = editando || {};
    const payload = {
      ...form,
      coral_id: coral.id,
      uploaded_by: user.email,
      partitura_url: files.partitura?.file_url || base.partitura_url || '',
      audio_completo_url: files.audio_completo?.file_url || base.audio_completo_url || '',
      audio_soprano1_url: files.soprano1?.file_url || base.audio_soprano1_url || '',
      audio_soprano2_url: files.soprano2?.file_url || base.audio_soprano2_url || '',
      audio_contralto_url: files.contralto?.file_url || base.audio_contralto_url || '',
      audio_tenor_url: files.tenor?.file_url || base.audio_tenor_url || '',
      audio_baritono_url: files.baritono?.file_url || base.audio_baritono_url || '',
      audio_baixo_url: files.baixo?.file_url || base.audio_baixo_url || '',
    };

    if (editando) {
      const updated = await firebaseClient.entities.Musica.update(editando.id, payload);
      setMusicas(prev => prev.map(m => m.id === editando.id ? updated : m));
    } else {
      const nova = await firebaseClient.entities.Musica.create(payload);
      setMusicas(prev => [nova, ...prev]);
    }

    // Atualiza o contador de armazenamento do coral
    const novosBytes = Object.values(files).filter(f => f.size).reduce((s, f) => s + f.size, 0);
    if (novosBytes > 0) {
      const updatedCoral = await firebaseClient.entities.Coral.update(coral.id, {
        armazenamento_usado_bytes: (coral.armazenamento_usado_bytes || 0) + novosBytes,
      });
      setCoral(updatedCoral);
    }

    setShowForm(false);
    setEditando(null);
    setForm(emptyForm);
    setFiles({});
    } catch (error) {
      console.error('Erro ao salvar musica:', error);
      alert('Nao foi possivel salvar a musica. Confirme se voce esta como admin ou maestro deste coral e tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir esta música?')) return;
    await firebaseClient.entities.Musica.delete(id);
    setMusicas(prev => prev.filter(m => m.id !== id));
    if (selecionada?.id === id) setSelecionada(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
  if (!coral) return null;

  const primary = coral.cor_primaria || '#6366f1';
  const canManageMusic = isMaestro || isAdminUser(user);

  // Quais naipes o membro atual pode ver
  const naipeDoMembro = membro?.naipe;

  // Filtra áudios visíveis por papel
  const getAudiosVisiveis = (m) => {
    if (canManageMusic) {
      // Maestro vê tudo
      return NAIPES.filter(n => m[`audio_${n.value}_url`]);
    } else {
      // Membro vê só o próprio naipe
      return NAIPES.filter(n => n.value === naipeDoMembro && m[`audio_${n.value}_url`]);
    }
  };

  const FileInput = ({ label, fieldKey, accept, existingUrl }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-indigo-300 transition-colors">
        <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-xs text-gray-500 truncate">
          {files[fieldKey]?.uploading
            ? 'Enviando...'
            : files[fieldKey]?.name
              ? files[fieldKey].name
              : existingUrl
                ? '✅ Arquivo atual (clique para substituir)'
                : 'Clique para enviar'}
        </span>
        <input type="file" accept={accept} className="hidden"
          onChange={e => e.target.files[0] && handleFile(fieldKey, e.target.files[0])} />
      </label>
    </div>
  );

  return (
    <CoralLayout coral={coral} user={user} isMaestro={canManageMusic}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Biblioteca Musical</h2>
          <p className="text-sm text-gray-500">
            {musicas.length} música{musicas.length !== 1 ? 's' : ''}
            {!canManageMusic && naipeDoMembro && (
              <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                {NAIPES.find(n => n.value === naipeDoMembro)?.label}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminUser(user) && coral && (
            <button
              onClick={() => navigate('/admin/biblioteca')}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-md transition-colors"
              title="Ver todos os corais"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          {canManageMusic && (
            <button
              onClick={abrirNova}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primary }}
            >
              <Plus className="w-4 h-4" /> Nova Música
            </button>
          )}
        </div>
      </div>

      {/* Indicador de armazenamento (apenas maestro) */}
      {canManageMusic && (
        <div className="mb-6">
          <StorageIndicator coral={coral} primary={primary} />
        </div>
      )}

      {/* Modal de adição/edição (apenas maestro) */}
      {showForm && canManageMusic && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800">{editando ? 'Editar Música' : 'Adicionar Nova Música'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={salvar} className="p-5 space-y-4">
              {/* Dados básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input required value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compositor</label>
                  <input value={form.compositor} onChange={e => setForm(p => ({ ...p, compositor: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tom</label>
                  <input value={form.tom} onChange={e => setForm(p => ({ ...p, tom: e.target.value }))}
                    placeholder="Ex: Dó maior"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>

              {/* Partitura e áudio completo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FileInput label="📄 Partitura (PDF)" fieldKey="partitura" accept=".pdf" existingUrl={editando?.partitura_url} />
                <FileInput label="🎵 Áudio Completo" fieldKey="audio_completo" accept="audio/*" existingUrl={editando?.audio_completo_url} />
              </div>

              {/* Áudios por naipe — todos de uma vez */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">🎤 Áudios por Naipe</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {NAIPES.map(n => (
                    <FileInput
                      key={n.value}
                      label={n.label}
                      fieldKey={n.value}
                      accept="audio/*"
                      existingUrl={editando?.[`audio_${n.value}_url`]}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || Object.values(files).some(f => f.uploading)}
                className="w-full text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-60"
                style={{ backgroundColor: primary }}
              >
                {uploading ? 'Salvando...' : editando ? 'Atualizar Música' : 'Salvar Música'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lista de músicas */}
      {musicas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <Music className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">{canManageMusic ? 'Clique em "Nova Música" para começar.' : 'Nenhuma música disponível ainda.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {musicas.map(m => {
            const audiosVisiveis = getAudiosVisiveis(m);
            const aberta = selecionada?.id === m.id;

            return (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primary}20` }}>
                      <Music className="w-5 h-5" style={{ color: primary }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{m.titulo}</h3>
                      <p className="text-xs text-gray-400">
                        {m.compositor || 'Compositor não informado'} {m.tom ? `· Tom: ${m.tom}` : ''}
                      </p>
                      {m.categoria && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
                          {m.categoria}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canManageMusic && (
                        <>
                          <button
                            onClick={() => abrirEdicao(m)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => excluir(m.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelecionada(aberta ? null : m)}
                        className="text-xs font-medium px-2 py-1 rounded-lg hover:opacity-80 text-white"
                        style={{ backgroundColor: primary }}
                      >
                        {aberta ? 'Fechar' : 'Abrir'}
                      </button>
                    </div>
                  </div>

                  {aberta && (
                    <div className="mt-4 space-y-3">
                      {/* Partitura — maestro pode baixar, membro só visualiza */}
                      {m.partitura_url && (
                        <PartituraViewer
                          url={m.partitura_url}
                          canDownload={canManageMusic}
                          primary={primary}
                        />
                      )}

                      {/* Áudio completo — apenas maestro */}
                      {canManageMusic && m.audio_completo_url && (
                        <AudioPlayer url={m.audio_completo_url} label="Áudio Completo" allowDownload={true} />
                      )}

                      {/* Naipes visíveis conforme papel */}
                      {audiosVisiveis.length > 0 ? (
                        audiosVisiveis.map(n => (
                          <AudioPlayer
                            key={n.value}
                            naipe={n.value}
                            url={m[`audio_${n.value}_url`]}
                            allowDownload={canManageMusic}
                          />
                        ))
                      ) : (
                        !canManageMusic && (
                          <p className="text-xs text-gray-400 text-center py-2">
                            Nenhum áudio disponível para o seu naipe nesta música.
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CoralLayout>
  );
}
