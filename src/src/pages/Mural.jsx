import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Image,
  Megaphone,
  Pencil,
  Pin,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import CoralLayout from '@/components/coral/CoralLayout';
import useCoralContext from '@/hooks/useCoralContext';
import { isAdminUser } from '@/lib/admin-access';
import { getUploadErrorMessage, isFileKind, uploadCoralFile } from '@/lib/coral-file-upload';
import { formatarBytes, verificarEspaco } from '@/utils/storage';

const TIPOS = [
  { value: 'info', label: 'Informacao', icon: Megaphone, color: '#3b82f6', bg: '#eff6ff' },
  { value: 'urgente', label: 'Urgente', icon: AlertTriangle, color: '#ef4444', bg: '#fef2f2' },
  { value: 'lembrete', label: 'Lembrete', icon: Bell, color: '#f59e0b', bg: '#fffbeb' },
];

const emptyForm = {
  publicacao_tipo: 'aviso',
  titulo: '',
  conteudo: '',
  tipo: 'info',
  fixado: false,
  midia_url: '',
  midia_tipo: '',
  midia_nome: '',
  midia_mime: '',
};

const MEDIA_MARKER_REGEX = /\s*\[\[CORALHUB_MEDIA:([^\]]+)\]\]\s*$/;

function getTipo(value) {
  return TIPOS.find((tipo) => tipo.value === value) || TIPOS[0];
}

const podeGerenciar = (isMaestro, membro) =>
  isMaestro || membro?.cargo === 'secretaria' || membro?.cargo === 'vice_secretaria';

const getMediaType = (item) => {
  const media = getMediaData(item);
  const explicit = String(media.tipo || '').toLowerCase();
  const mime = String(media.mime || '').toLowerCase();
  const source = `${media.nome || ''} ${media.url || ''}`.toLowerCase();

  if (
    explicit === 'video' ||
    mime.startsWith('video/') ||
    /\.(mp4|webm|mov|m4v|3gp)(?:[?#]|$)/i.test(source)
  ) {
    return 'video';
  }

  return 'imagem';
};

const getPublicationType = (item) => {
  const media = getMediaData(item);
  if (!media.url) return 'aviso';
  return getMediaType(item) === 'video' ? 'video' : 'foto';
};

const parseMediaMarker = (value = '') => {
  const match = String(value || '').match(MEDIA_MARKER_REGEX);
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
};

const stripMediaMarker = (value = '') => String(value || '').replace(MEDIA_MARKER_REGEX, '').trim();

const getMediaData = (item) => {
  const marker = parseMediaMarker(item?.conteudo);
  const url = item?.midia_url || item?.media_url || item?.video_url || item?.foto_url || marker?.url || '';
  const tipo = item?.midia_tipo || item?.media_tipo || marker?.tipo || '';
  const nome = item?.midia_nome || item?.media_nome || marker?.nome || '';
  const mime = item?.midia_mime || item?.media_mime || marker?.mime || '';

  return { url, tipo, nome, mime };
};

const withMediaMarker = (conteudo, media) => {
  const cleanContent = stripMediaMarker(conteudo);
  if (!media?.midia_url) return cleanContent;

  const marker = encodeURIComponent(
    JSON.stringify({
      url: media.midia_url,
      tipo: getMediaType(media),
      nome: media.midia_nome || '',
      mime: media.midia_mime || '',
    })
  );

  return `${cleanContent}${cleanContent ? '\n\n' : ''}[[CORALHUB_MEDIA:${marker}]]`;
};

const normalizeAviso = (aviso) => {
  const media = getMediaData(aviso);

  return {
    ...aviso,
    conteudo: stripMediaMarker(aviso?.conteudo),
    midia_url: media.url,
    midia_tipo: media.tipo,
    midia_nome: media.nome,
    midia_mime: media.mime,
  };
};

const MediaBlock = ({ aviso, compact = false }) => {
  const media = getMediaData(aviso);
  if (!media.url) return null;

  const mediaType = getMediaType(aviso);
  const title = aviso.titulo || media.nome || (mediaType === 'video' ? 'Video do coral' : 'Foto do coral');

  if (mediaType === 'video') {
    return (
      <div className={compact ? '' : 'mt-3'}>
        <video
          src={media.url}
          controls
          playsInline
          preload="metadata"
          className={`${compact ? 'h-56' : 'max-h-[460px]'} w-full rounded-xl bg-black object-contain`}
        >
          Seu aparelho nao conseguiu tocar este video.
        </video>
        <a
          href={media.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <Video className="w-3.5 h-3.5" /> Abrir video
        </a>
      </div>
    );
  }

  return (
    <img
      src={media.url}
      alt={title}
      loading="lazy"
      className={`${compact ? 'h-56' : 'mt-3 max-h-[460px]'} w-full rounded-xl object-cover bg-gray-100`}
    />
  );
};

const MediaCard = ({ aviso, canManage, onEdit, onDelete }) => {
  const mediaType = getMediaType(aviso);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="relative bg-gray-100">
        <MediaBlock aviso={aviso} compact />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-xs font-medium text-white">
        {mediaType === 'video' ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
          {mediaType === 'video' ? 'Video' : 'Foto'}
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm truncate">
              {aviso.titulo || (mediaType === 'video' ? 'Video do coral' : 'Foto do coral')}
            </h3>
            {aviso.conteudo && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{aviso.conteudo}</p>
            )}
          </div>
          {canManage && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(aviso)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(aviso.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        {aviso.autor_nome && (
          <p className="text-xs text-gray-400 mt-2">
            Por {aviso.autor_nome} - {new Date(aviso.created_date).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  );
};

export default function Mural() {
  const navigate = useNavigate();
  const { user, coral, membro, isMaestro, loading, setCoral } = useCoralContext();
  const [avisos, setAvisos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [uploadingMidia, setUploadingMidia] = useState(false);
  const [novosBytes, setNovosBytes] = useState(0);
  const [form, setForm] = useState(emptyForm);

  const canManage = isAdminUser(user) || podeGerenciar(isMaestro, membro);

  const ordenarAvisos = (items) =>
    [...items].sort((left, right) => {
      if (Boolean(left.fixado) !== Boolean(right.fixado)) {
        return left.fixado ? -1 : 1;
      }

      return new Date(right.created_date || 0).getTime() - new Date(left.created_date || 0).getTime();
    });

  useEffect(() => {
    if (!loading && user && !coral && !membro) {
      navigate('/onboarding');
    }
  }, [loading, user, coral, membro, navigate]);

  useEffect(() => {
    if (!coral) return;

    firebaseClient.entities.Aviso.filter({ coral_id: coral.id }).then((data) => {
      setAvisos(ordenarAvisos(data.map(normalizeAviso)));
    });
  }, [coral]);

  const abrirNovo = (tipo = 'aviso') => {
    setEditando(null);
    setNovosBytes(0);
    setForm({
      ...emptyForm,
      publicacao_tipo: tipo,
      midia_tipo: tipo === 'video' ? 'video' : tipo === 'foto' ? 'imagem' : '',
    });
    setShowForm(true);
  };

  const abrirEdicao = (aviso) => {
    const normalized = normalizeAviso(aviso);
    setEditando(normalized);
    setNovosBytes(0);
    const publicacaoTipo = getPublicationType(normalized);
    setForm({
      publicacao_tipo: publicacaoTipo,
      titulo: normalized.titulo || '',
      conteudo: normalized.conteudo || '',
      tipo: normalized.tipo || 'info',
      fixado: normalized.fixado || false,
      midia_url: normalized.midia_url || '',
      midia_tipo: normalized.midia_tipo || '',
      midia_nome: normalized.midia_nome || '',
      midia_mime: normalized.midia_mime || '',
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setNovosBytes(0);
    setForm(emptyForm);
  };

  const handleMidia = async (file) => {
    const kind = form.publicacao_tipo === 'video' ? 'video' : 'image';

    if (form.publicacao_tipo === 'video' && !isFileKind(file, 'video')) {
      alert('Selecione um arquivo de video.');
      return;
    }

    if (form.publicacao_tipo === 'foto' && !isFileKind(file, 'image')) {
      alert('Selecione uma imagem.');
      return;
    }

    const espaco = verificarEspaco(coral, file.size);
    if (!espaco.ok) {
      alert(`Limite de armazenamento atingido. Espaco restante: ${formatarBytes(espaco.restante)}.`);
      return;
    }

    setUploadingMidia(true);

    try {
      const upload = await uploadCoralFile(firebaseClient, file, { kind });
      setForm((prev) => ({
        ...prev,
        midia_url: upload.file_url,
        midia_tipo: kind === 'video' ? 'video' : 'imagem',
        midia_nome: upload.file_name,
        midia_mime: upload.file_type,
      }));
      setNovosBytes((bytes) => bytes + upload.file_size);
    } catch (error) {
      console.error('Erro ao enviar midia:', error);
      alert(getUploadErrorMessage(error, kind === 'video' ? 'o video' : 'a foto'));
    } finally {
      setUploadingMidia(false);
    }
  };

  const removerMidia = () => {
    setForm((prev) => ({
      ...prev,
      midia_url: '',
      midia_tipo: '',
      midia_nome: '',
      midia_mime: '',
    }));
  };

  const salvar = async (event) => {
    event.preventDefault();

    const hasContent = form.titulo.trim() || form.conteudo.trim() || form.midia_url;
    if (!hasContent) {
      alert('Adicione um aviso, foto ou video antes de publicar.');
      return;
    }

    if ((form.publicacao_tipo === 'foto' || form.publicacao_tipo === 'video') && !form.midia_url) {
      alert(form.publicacao_tipo === 'video' ? 'Adicione um video.' : 'Adicione uma foto.');
      return;
    }

    setSalvando(true);
    try {

    const mediaType = form.publicacao_tipo === 'video'
      ? 'video'
      : form.publicacao_tipo === 'foto'
        ? 'imagem'
        : getMediaType(form);
    const fallbackTitle = form.publicacao_tipo !== 'aviso'
      ? form.publicacao_tipo === 'video'
        ? 'Video do coral'
        : 'Foto do coral'
      : 'Aviso do coral';

    const payload = {
      ...form,
      publicacao_tipo: form.publicacao_tipo,
      titulo: form.titulo.trim() || fallbackTitle,
      conteudo: form.publicacao_tipo === 'aviso'
        ? stripMediaMarker(form.conteudo.trim())
        : withMediaMarker(form.conteudo.trim(), { ...form, midia_tipo: mediaType }),
      media_url: form.midia_url,
      media_tipo: mediaType,
      media_nome: form.midia_nome,
      media_mime: form.midia_mime,
      video_url: mediaType === 'video' ? form.midia_url : '',
      foto_url: mediaType === 'imagem' ? form.midia_url : '',
      coral_id: coral.id,
      autor_nome: membro?.nome || user.email,
      autor_email: user.email,
    };

    if (editando) {
      const updated = await firebaseClient.entities.Aviso.update(editando.id, payload);
      setAvisos((prev) => ordenarAvisos(prev.map((aviso) => (aviso.id === editando.id ? normalizeAviso(updated) : aviso))));
    } else {
      const novo = await firebaseClient.entities.Aviso.create(payload);
      setAvisos((prev) => ordenarAvisos([normalizeAviso(novo), ...prev]));
    }

    if (novosBytes > 0) {
      const updatedCoral = await firebaseClient.entities.Coral.update(coral.id, {
        armazenamento_usado_bytes: (coral.armazenamento_usado_bytes || 0) + novosBytes,
      });
      setCoral(updatedCoral);
    }

    fecharForm();
    } catch (error) {
      console.error('Erro ao salvar publicacao:', error);
      alert('Nao foi possivel publicar. Confirme se voce tem permissao no coral e tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir esta publicacao?')) return;
    await firebaseClient.entities.Aviso.delete(id);
    setAvisos((prev) => prev.filter((aviso) => aviso.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!coral) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-800">Coral nao encontrado</h1>
          <p className="text-sm text-gray-500 mt-2">
            O cadastro do membro foi criado, mas o app nao conseguiu carregar o coral escolhido.
          </p>
          <button
            onClick={() => navigate('/onboarding')}
            className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Escolher coral novamente
          </button>
        </div>
      </div>
    );
  }

  const primary = coral.cor_primaria || '#6366f1';
  const secondary = coral.cor_secundaria || '#a78bfa';
  const welcomeBackgroundImage = coral.capa_url
    ? `linear-gradient(135deg, rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.58)), url("${coral.capa_url}")`
    : `linear-gradient(135deg, ${primary}, ${secondary})`;
  const videos = avisos.filter((aviso) => getPublicationType(aviso) === 'video');
  const fotos = avisos.filter((aviso) => getPublicationType(aviso) === 'foto');
  const avisosTexto = avisos.filter((aviso) => getPublicationType(aviso) === 'aviso');

  return (
    <CoralLayout coral={coral} user={user} isMaestro={canManage} membro={membro}>
      <div
        className="rounded-2xl p-5 pr-28 sm:pr-44 mb-6 min-h-[124px] text-white shadow-lg overflow-hidden bg-no-repeat"
        style={{
          backgroundImage: welcomeBackgroundImage,
          backgroundSize: coral.capa_url ? 'cover, clamp(96px, 30vw, 180px)' : undefined,
          backgroundPosition: coral.capa_url ? 'center, calc(100% - 16px) center' : undefined,
        }}
      >
        <p className="text-white/80 text-sm mb-0.5">
          {canManage ? 'Bem-vindo!' : `Bem-vindo, ${membro?.nome?.split(' ')[0] || 'Membro'}!`}
        </p>
        <h2 className="text-xl font-bold">{coral.nome}</h2>
        <p className="text-white/70 text-sm mt-1">
          {canManage ? 'Publique avisos, fotos e videos para o coral.' : 'Confira avisos, fotos e videos do coral.'}
        </p>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Mural do Coral</h2>
          <p className="text-sm text-gray-500">
            {videos.length} video{videos.length !== 1 ? 's' : ''} · {fotos.length} foto{fotos.length !== 1 ? 's' : ''} · {avisosTexto.length} aviso{avisosTexto.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => abrirNovo('video')}
              className="flex items-center gap-1.5 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-md hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              <Video className="w-4 h-4" /> Vídeo
            </button>
            <button
              onClick={() => abrirNovo('foto')}
              className="flex items-center gap-1.5 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-md hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              <Image className="w-4 h-4" /> Foto
            </button>
            <button
              onClick={() => abrirNovo('aviso')}
              className="flex items-center gap-1.5 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-md hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              <Plus className="w-4 h-4" /> Aviso
            </button>
          </div>
        )}
      </div>

      {videos.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Vídeos</h3>
            <span className="text-xs text-gray-400">{videos.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {videos.map((aviso) => (
              <MediaCard
                key={aviso.id}
                aviso={aviso}
                canManage={canManage}
                onEdit={abrirEdicao}
                onDelete={excluir}
              />
            ))}
          </div>
        </section>
      )}

      {fotos.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Fotos</h3>
            <span className="text-xs text-gray-400">{fotos.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {fotos.map((aviso) => (
              <MediaCard
                key={aviso.id}
                aviso={aviso}
                canManage={canManage}
                onEdit={abrirEdicao}
                onDelete={excluir}
              />
            ))}
          </div>
        </section>
      )}

      {showForm && canManage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800">
                {editando
                  ? 'Editar publicação'
                  : form.publicacao_tipo === 'video'
                    ? 'Novo vídeo'
                    : form.publicacao_tipo === 'foto'
                      ? 'Nova foto'
                      : 'Novo aviso'}
              </h3>
              <button onClick={fecharForm} type="button">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={salvar} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label>
                <input
                  value={form.titulo}
                  onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Ex: Ensaio de domingo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                <textarea
                  value={form.conteudo}
                  onChange={(event) => setForm((prev) => ({ ...prev, conteudo: event.target.value }))}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder={form.publicacao_tipo === 'aviso' ? 'Escreva o aviso.' : 'Legenda opcional.'}
                />
              </div>

              {form.publicacao_tipo === 'aviso' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {TIPOS.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.fixado}
                      onChange={(event) => setForm((prev) => ({ ...prev, fixado: event.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      <Pin className="w-3.5 h-3.5" /> Fixar
                    </span>
                  </label>
                </div>
              </div>
              )}

              {form.publicacao_tipo !== 'aviso' && (
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.publicacao_tipo === 'video' ? 'Vídeo' : 'Foto'}
                </label>
                {form.midia_url ? (
                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                    <MediaBlock aviso={form} />
                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-2 min-w-0 text-sm text-gray-500">
                        {getMediaType(form) === 'video' ? (
                          <Video className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <Image className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="truncate">{form.midia_nome || 'Arquivo anexado'}</span>
                      </div>
                      <button type="button" onClick={removerMidia} className="text-xs font-semibold text-red-600 hover:text-red-700">
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500">
                      {uploadingMidia
                        ? 'Enviando...'
                        : form.publicacao_tipo === 'video'
                          ? 'Selecionar vídeo'
                          : 'Selecionar foto'}
                    </span>
                    <input
                      type="file"
                      accept={form.publicacao_tipo === 'video' ? 'video/*' : 'image/*'}
                      className="hidden"
                      onChange={(event) => event.target.files[0] && handleMidia(event.target.files[0])}
                    />
                  </label>
                )}
              </div>
              )}

              <button
                type="submit"
                disabled={salvando || uploadingMidia}
                className="w-full text-white font-semibold py-3 rounded-xl disabled:opacity-60"
                style={{ backgroundColor: primary }}
              >
                {salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Publicar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {avisos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma publicacao ainda.</p>
        </div>
      ) : avisosTexto.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Avisos</h3>
            <span className="text-xs text-gray-400">{avisosTexto.length}</span>
          </div>
        <div className="space-y-3">
          {avisosTexto.map((aviso) => {
            const tipo = getTipo(aviso.tipo);
            const Icon = tipo.icon;

            return (
              <div
                key={aviso.id}
                className="bg-white rounded-2xl shadow-sm border overflow-hidden"
                style={{ borderColor: aviso.fixado ? tipo.color : '#f1f5f9' }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: tipo.bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: tipo.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {aviso.fixado && <Pin className="w-3.5 h-3.5 text-gray-400" />}
                        <h3 className="font-semibold text-gray-800">{aviso.titulo}</h3>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: tipo.bg, color: tipo.color }}
                        >
                          {tipo.label}
                        </span>
                      </div>
                      {aviso.conteudo && (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{aviso.conteudo}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Por {aviso.autor_nome} - {new Date(aviso.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => abrirEdicao(aviso)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => excluir(aviso.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </section>
      ) : null}
    </CoralLayout>
  );
}
