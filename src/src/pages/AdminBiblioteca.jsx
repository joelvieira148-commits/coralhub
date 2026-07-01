import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, X, Pencil, Trash2, Upload, ChevronDown, ChevronUp, Building2, Plus } from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import AudioPlayer from '@/components/coral/AudioPlayer';
import FixedAudioPlayer from '@/components/coral/FixedAudioPlayer';
import AdminPasswordGate from '@/components/coral/AdminPasswordGate';
import PartituraViewer from '@/components/coral/PartituraViewer';
import { isAdminUser } from '@/lib/admin-access';
import { getUploadErrorMessage, uploadCoralFile } from '@/lib/coral-file-upload';
import { publicarCoraisNoCatalogo } from '@/lib/coral-directory';
import { NAIPES } from '@/utils/coralTheme';

const CATEGORIAS = ['sacra', 'popular', 'classica', 'gospel', 'folclorica', 'outro'];

export default function AdminBiblioteca() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [corais, setCorais] = useState([]);
  const [musicasPorCoral, setMusicasPorCoral] = useState({});
  const [coraisAbertos, setCoraisAbertos] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [coralDoForm, setCoralDoForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [files, setFiles] = useState({});
  const emptyForm = { titulo: '', compositor: '', descricao: '', categoria: 'outro', tom: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    async function load() {
      const me = await firebaseClient.auth.me();
      setUser(me);
      if (!isAdminUser(me)) {
        navigate('/biblioteca', { replace: true });
        return;
      }
      const allCorais = await firebaseClient.entities.Coral.list();
      setCorais(allCorais);
      publicarCoraisNoCatalogo(firebaseClient, allCorais).catch((error) => {
        console.warn('Falha ao sincronizar catalogo de corais:', error);
      });
      setLoading(false);
    }
    load();
  }, []);

  const loadMusicasDoCoral = async (coralId) => {
    if (musicasPorCoral[coralId]) return; // já carregado
    const musicas = await firebaseClient.entities.Musica.filter({ coral_id: coralId });
    setMusicasPorCoral(prev => ({ ...prev, [coralId]: musicas }));
  };

  const toggleCoral = async (coralId) => {
    const nowOpen = !coraisAbertos[coralId];
    setCoraisAbertos(prev => ({ ...prev, [coralId]: nowOpen }));
    if (nowOpen) await loadMusicasDoCoral(coralId);
  };

  const abrirNova = (coral) => {
    setEditando(null);
    setCoralDoForm(coral);
    setForm(emptyForm);
    setFiles({});
    setShowForm(true);
  };

  const abrirEdicao = (m, coral) => {
    setEditando(m);
    setCoralDoForm(coral);
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
      console.error('Erro ao enviar arquivo da musica no admin:', error);
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
    const base = editando || {};
    const payload = {
      ...form,
      coral_id: coralDoForm.id,
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
      setMusicasPorCoral(prev => ({
        ...prev,
        [coralDoForm.id]: (prev[coralDoForm.id] || []).map(m => m.id === editando.id ? updated : m)
      }));
    } else {
      const nova = await firebaseClient.entities.Musica.create(payload);
      setMusicasPorCoral(prev => ({
        ...prev,
        [coralDoForm.id]: [nova, ...(prev[coralDoForm.id] || [])]
      }));
    }

    setShowForm(false);
    setEditando(null);
    setCoralDoForm(null);
    setForm(emptyForm);
    setFiles({});
    } catch (error) {
      console.error('Erro ao salvar musica no admin:', error);
      alert('Nao foi possivel salvar a musica. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const excluir = async (musicaId, coralId) => {
    if (!confirm('Excluir esta música?')) return;
    await firebaseClient.entities.Musica.delete(musicaId);
    setMusicasPorCoral(prev => ({
      ...prev,
      [coralId]: prev[coralId].filter(m => m.id !== musicaId)
    }));
    if (selecionada?.id === musicaId) setSelecionada(null);
    if (currentTrack?.musicId === musicaId) setCurrentTrack(null);
  };

  const playTrack = (musica, audioInfo, kind) => {
    setCurrentTrack({
      ...audioInfo,
      id: `${musica.id}-${kind}`,
      musicId: musica.id,
      title: musica.titulo || 'Musica',
      subtitle: audioInfo.label,
    });
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <AdminPasswordGate user={user} backPath="/biblioteca">
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 to-gray-700 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-white/70" />
            <div>
              <h1 className="font-bold text-sm">Admin · Biblioteca Global</h1>
              <p className="text-xs text-white/60">{corais.length} coral{corais.length !== 1 ? 'is' : ''} registrado{corais.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/corais')}
              className="text-white/70 hover:text-white text-xs transition-colors"
            >
              Corais
            </button>
          <button
            onClick={() => navigate('/biblioteca')}
            className="text-white/70 hover:text-white text-xs transition-colors"
          >
            ← Voltar
          </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-16">
        {corais.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <Music className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum coral registrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {corais.map(coral => {
              const isOpen = coraisAbertos[coral.id];
              const musicas = musicasPorCoral[coral.id] || [];
              const primary = coral.cor_primaria || '#6366f1';

              return (
                <div key={coral.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Cabeçalho do coral */}
                  <button
                    onClick={() => toggleCoral(coral.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {coral.logo_url ? (
                        <img src={coral.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${primary}20` }}>
                          <Music className="w-5 h-5" style={{ color: primary }} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">{coral.nome}</h3>
                        <p className="text-xs text-gray-400">
                          {coral.cidade || 'Cidade não informada'} · {coral.maestro_email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOpen && (
                        <span className="text-xs text-gray-400">{musicas.length} música{musicas.length !== 1 ? 's' : ''}</span>
                      )}
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Lista de músicas */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                      <div className="mb-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => abrirNova(coral)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                        >
                          <Plus className="w-3.5 h-3.5" /> Nova musica
                        </button>
                      </div>
                      {musicas.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Nenhuma música cadastrada.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {musicas.map(m => {
                            const aberta = selecionada?.id === m.id;
                            return (
                              <div key={m.id} className="border border-gray-100 rounded-xl overflow-hidden">
                                <div className="p-3">
                                  <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: `${primary}18` }}>
                                      <Music className="w-4 h-4" style={{ color: primary }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-800 text-sm truncate">{m.titulo}</h4>
                                      <p className="text-xs text-gray-400">
                                        {m.compositor || 'Sem compositor'} {m.tom ? `· ${m.tom}` : ''}
                                      </p>
                                      {m.categoria && (
                                        <span className="inline-block mt-0.5 text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">
                                          {m.categoria}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <button
                                        onClick={() => abrirEdicao(m, coral)}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Editar"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => excluir(m.id, coral.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Excluir"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
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
                                    <div className="mt-3 space-y-3">
                                      {m.partitura_url && (
                                        <PartituraViewer
                                          url={m.partitura_url}
                                          canDownload={true}
                                          primary={primary}
                                        />
                                      )}
                                      {m.audio_completo_url && (
                                        <AudioPlayer
                                          url={m.audio_completo_url}
                                          label="Audio Completo"
                                          allowDownload={true}
                                          onPlay={(audioInfo) => playTrack(m, audioInfo, 'completo')}
                                          isSelected={currentTrack?.id === `${m.id}-completo`}
                                        />
                                      )}
                                      {NAIPES.filter(n => m[`audio_${n.value}_url`]).map(n => (
                                        <AudioPlayer
                                          key={n.value}
                                          naipe={n.value}
                                          url={m[`audio_${n.value}_url`]}
                                          allowDownload={true}
                                          onPlay={(audioInfo) => playTrack(m, audioInfo, n.value)}
                                          isSelected={currentTrack?.id === `${m.id}-${n.value}`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de edição */}
      {showForm && coralDoForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-gray-800">{editando ? 'Editar Música' : 'Adicionar Música'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Coral: {coralDoForm?.nome}</p>
              </div>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={salvar} className="p-5 space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FileInput label="📄 Partitura (PDF)" fieldKey="partitura" accept=".pdf" existingUrl={editando?.partitura_url} />
                <FileInput label="🎵 Áudio Completo" fieldKey="audio_completo" accept="audio/*" existingUrl={editando?.audio_completo_url} />
              </div>
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
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-60"
              >
                {uploading ? 'Salvando...' : editando ? 'Atualizar Música' : 'Salvar Música'}
              </button>
            </form>
          </div>
        </div>
      )}
      <FixedAudioPlayer track={currentTrack} onClose={() => setCurrentTrack(null)} />
    </div>
    </AdminPasswordGate>
  );
}
