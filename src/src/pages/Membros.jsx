import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Check,
  Copy,
  MessageCircle,
  Phone,
  Search,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import CoralLayout from '@/components/coral/CoralLayout';
import useCoralContext, { clearCoralContextCache, saveCoralContextCache } from '@/hooks/useCoralContext';
import { clearCurrentUserCoralMembership, getMemberEmail, normalizeEmail } from '@/lib/coral-membership';
import { canManageCoral, getCoralManagerEmails, isRegenteRole } from '@/lib/coral-permissions';
import { registerCadastroBlocks } from '@/lib/cadastro-autorizacao';
import { getMemberPhotoFields, getMemberPhotoUrl } from '@/lib/member-photo';
import { uploadProfilePhoto } from '@/lib/profile-photo-upload';
import { NAIPES, getNaipeInfo } from '@/utils/coralTheme';
import { formatarBytes, verificarEspaco } from '@/utils/storage';

const emptyForm = {
  nome: '',
  telefone: '',
  endereco: '',
  user_email: '',
  senha: '',
  naipe: '',
  naipes: [],
  cargo: 'membro',
  foto_url: '',
  foto_zoom: 1,
};

const getMemberPhotoZoom = (item) => {
  const value = Number(item?.foto_zoom || item?.photo_zoom || item?.member_foto_zoom || 1);
  if (!Number.isFinite(value)) return 1;
  return Math.min(2.5, Math.max(0.8, value));
};

const getPhotoStyle = (zoom) => ({
  transform: `scale(${getMemberPhotoZoom({ foto_zoom: zoom })})`,
});

const getMemberNaipes = (member) => {
  const values = Array.isArray(member?.naipes) && member.naipes.length > 0
    ? member.naipes
    : [member?.naipe];

  return [...new Set(values.filter(Boolean))];
};

const getCargoRole = (cargo) => (isRegenteRole(cargo) ? 'maestro' : 'membro');

const onlyDigits = (value = '') => String(value || '').replace(/\D/g, '');

const normalizeWhatsappPhone = (telefone = '') => {
  const digits = onlyDigits(telefone);
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

const getMensagemPadrao = (coral) =>
  `Ola! Mensagem do ${coral?.nome || 'coral'}:`;

const getWhatsappUrl = (telefone, mensagem) => {
  const phone = normalizeWhatsappPhone(telefone);
  if (!phone) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensagem || '')}`;
};

const getWhatsappShareUrl = (mensagem) =>
  `https://wa.me/?text=${encodeURIComponent(mensagem || '')}`;

const getNextManagerEmails = (coral, previousMember, updatedMember) => {
  const previousEmail = getMemberEmail(previousMember);
  const updatedEmail = getMemberEmail(updatedMember);
  const emails = new Set(getCoralManagerEmails(coral));

  if (previousEmail && (isRegenteRole(previousMember?.cargo) || previousEmail !== updatedEmail)) {
    emails.delete(previousEmail);
  }

  if (updatedEmail && isRegenteRole(updatedMember?.cargo)) {
    emails.add(updatedEmail);
  }

  return [...emails];
};

export default function Membros() {
  const navigate = useNavigate();
  const { user, coral, membro, loading, setCoral } = useCoralContext();
  const [membros, setMembros] = useState([]);
  const [search, setSearch] = useState('');
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [novosBytes, setNovosBytes] = useState(0);
  const [showMensagem, setShowMensagem] = useState(false);
  const [mensagemComponentes, setMensagemComponentes] = useState('');

  const canManage = canManageCoral(user, coral);

  useEffect(() => {
    if (!loading && user && !coral && !membro) {
      navigate('/onboarding', { replace: true });
    }
  }, [loading, user, coral, membro, navigate]);

  useEffect(() => {
    if (!coral) return;
    firebaseClient.entities.Membro.filter({ coral_id: coral.id }).then(setMembros);
  }, [coral]);

  const filtered = membros.filter((item) => {
    const termo = search.toLowerCase();
    const voz = getMemberNaipes(item).map((naipe) => getNaipeInfo(naipe)?.label || naipe).join(' ');

    return [
      item.nome,
      item.telefone,
      item.endereco,
      item.user_email || item.email,
      item.cargo,
      voz,
    ].some((value) => String(value || '').toLowerCase().includes(termo));
  });

  const membrosComTelefone = membros
    .filter((item) => normalizeWhatsappPhone(item.telefone))
    .sort((left, right) => String(left.nome || '').localeCompare(String(right.nome || ''), 'pt-BR'));

  const abrirMensagemComponentes = () => {
    setMensagemComponentes((value) => value || getMensagemPadrao(coral));
    setShowMensagem(true);
  };

  const copiarTexto = async (texto, aviso) => {
    try {
      await navigator.clipboard.writeText(texto);
      alert(aviso);
    } catch {
      alert('Nao foi possivel copiar agora.');
    }
  };

  const copiarContatos = () => {
    const contatos = membrosComTelefone
      .map((item) => `${item.nome || 'Membro'} - ${item.telefone}`)
      .join('\n');

    copiarTexto(contatos, 'Contatos copiados.');
  };

  const enviarParaTodos = () => {
    if (membrosComTelefone.length === 0) {
      alert('Nenhum telefone cadastrado para enviar.');
      return;
    }

    window.open(getWhatsappShareUrl(mensagemComponentes), '_blank', 'noopener,noreferrer');
  };

  const iniciarEdicao = (item) => {
    setEditando(item.id);
    setNovosBytes(0);
    setEditForm({
      nome: item.nome || '',
      telefone: item.telefone || '',
      endereco: item.endereco || '',
      user_email: item.user_email || item.email || '',
      senha: item.senha || '',
      naipe: item.naipe || getMemberNaipes(item)[0] || '',
      naipes: getMemberNaipes(item),
      cargo: item.cargo || 'membro',
      foto_url: getMemberPhotoUrl(item),
      foto_zoom: getMemberPhotoZoom(item),
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setEditForm(emptyForm);
    setNovosBytes(0);
  };

  const handleFoto = async (file) => {
    setUploadingFoto(true);

    try {
      const { url, size } = await uploadProfilePhoto(firebaseClient, file);
      const espaco = verificarEspaco(coral, size);

      if (!espaco.ok) {
        alert(`Limite de armazenamento atingido. Espaco restante: ${formatarBytes(espaco.restante)}.`);
        return;
      }

      setEditForm((prev) => ({ ...prev, foto_url: url }));
      setNovosBytes((bytes) => bytes + size);
    } catch (error) {
      console.error('Erro ao enviar foto do membro:', error);
      alert('Nao foi possivel enviar a foto. Tente novamente.');
    } finally {
      setUploadingFoto(false);
    }
  };

  const alternarVoz = (voz) => {
    setEditForm((prev) => {
      const selecionadas = getMemberNaipes(prev);

      if (selecionadas.includes(voz)) {
        const next = selecionadas.filter((item) => item !== voz);
        return { ...prev, naipe: next[0] || '', naipes: next };
      }

      if (selecionadas.length >= 2) {
        alert('Escolha no maximo 2 vozes para este membro.');
        return prev;
      }

      const next = [...selecionadas, voz];
      return { ...prev, naipe: next[0] || '', naipes: next };
    });
  };

  const salvar = async () => {
    setSalvando(true);

    try {
      const membroAnterior = membros.find((item) => item.id === editando) || null;
      const naipesSelecionados = getMemberNaipes(editForm).slice(0, 2);
      const payload = {
        ...editForm,
        naipe: naipesSelecionados[0] || '',
        naipes: naipesSelecionados,
        foto_zoom: getMemberPhotoZoom(editForm),
        photo_zoom: getMemberPhotoZoom(editForm),
        ...getMemberPhotoFields(editForm.foto_url),
        email: editForm.user_email,
        user_email: editForm.user_email,
      };

      const updated = await firebaseClient.entities.Membro.update(editando, payload);
      const updatedWithPhoto = { ...updated, foto_zoom: payload.foto_zoom, photo_zoom: payload.photo_zoom, ...getMemberPhotoFields(editForm.foto_url) };
      setMembros((prev) => prev.map((item) => (item.id === editando ? updatedWithPhoto : item)));

      const coralUpdates = {};
      const nextManagerEmails = getNextManagerEmails(coral, membroAnterior, updatedWithPhoto);
      const currentManagerEmails = getCoralManagerEmails(coral);
      const managersChanged =
        nextManagerEmails.length !== currentManagerEmails.length ||
        nextManagerEmails.some((email) => !currentManagerEmails.includes(email));

      if (managersChanged) {
        coralUpdates.maestro_emails = nextManagerEmails;
        coralUpdates.regente_emails = nextManagerEmails;
      }

      const emailAtualizado = getMemberEmail(updatedWithPhoto);
      if (emailAtualizado && normalizeEmail(user?.email) === emailAtualizado) {
        const activeRole = getCargoRole(updatedWithPhoto.cargo);
        const userUpdate = {
          active_coral_role: activeRole,
          member_nome: updatedWithPhoto.nome || user?.full_name || user?.email || '',
          member_naipe: updatedWithPhoto.naipe || '',
          member_naipes: getMemberNaipes(updatedWithPhoto),
          member_foto_url: getMemberPhotoUrl(updatedWithPhoto) || '',
          member_foto_zoom: getMemberPhotoZoom(updatedWithPhoto),
        };
        await firebaseClient.auth.updateMe(userUpdate);
        saveCoralContextCache({
          user: { ...user, ...userUpdate },
          membro: updatedWithPhoto,
        });
      }

      if (novosBytes > 0) {
        coralUpdates.armazenamento_usado_bytes = (coral.armazenamento_usado_bytes || 0) + novosBytes;
      }

      if (Object.keys(coralUpdates).length > 0) {
        const updatedCoral = await firebaseClient.entities.Coral.update(coral.id, coralUpdates);
        setCoral(updatedCoral);
      }

      cancelarEdicao();
    } catch (error) {
      console.error('Erro ao salvar membro:', error);
      alert('Nao foi possivel salvar o membro. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (member) => {
    const memberEmail = getMemberEmail(member);
    const registrosDoMembro = memberEmail
      ? membros.filter((item) => item.coral_id === coral.id && getMemberEmail(item) === memberEmail)
      : [member];
    const idsParaExcluir = [...new Set(registrosDoMembro.map((item) => item.id).filter(Boolean))];
    const nome = member.nome || memberEmail || 'este membro';
    const removeRegenteDoCoral = registrosDoMembro.some((item) =>
      ['maestro', 'maestrina'].includes(item.cargo) ||
      (memberEmail && normalizeEmail(coral?.maestro_email) === memberEmail)
    );

    if (!confirm(`Excluir ${nome} do coral? Ele tera que fazer todo o cadastro novamente para entrar.`)) return;

    try {
      await registerCadastroBlocks(
        firebaseClient,
        registrosDoMembro.map((item) => ({
          email: getMemberEmail(item),
          nome: item.nome,
          motivo: 'Membro removido pelo admin',
          coralId: coral.id,
          coralNome: coral.nome,
          papel: item.cargo || 'membro',
          adminEmail: user?.email || '',
        }))
      );
      await Promise.all(idsParaExcluir.map((id) => firebaseClient.entities.Membro.delete(id)));
      setMembros((prev) => prev.filter((item) => !idsParaExcluir.includes(item.id)));

      if (removeRegenteDoCoral) {
        const updatedCoral = await firebaseClient.entities.Coral.update(coral.id, {
          maestro_email: '',
          maestro_nome: '',
        });
        setCoral(updatedCoral);
      }

      const membroApagadoEraDoUsuario =
        (memberEmail && normalizeEmail(user?.email) === memberEmail) ||
        idsParaExcluir.includes(user?.active_member_id);

      if (membroApagadoEraDoUsuario) {
        await clearCurrentUserCoralMembership(firebaseClient, user);
        clearCoralContextCache();
        window.location.replace('/onboarding');
      }
    } catch (error) {
      console.error('Erro ao excluir membro:', error);
      alert('Nao foi possivel excluir o membro. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!coral) return null;

  return (
    <CoralLayout coral={coral} user={user} isMaestro={canManage} membro={membro}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Membros do Coral</h2>
          <p className="text-sm text-gray-500">
            {membros.length} membro{membros.length !== 1 ? 's' : ''} registrado{membros.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={abrirMensagemComponentes}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            Mensagem
          </button>
        )}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, voz, telefone, endereco ou e-mail..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Nenhum membro encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isEditing = editando === item.id;
            const fotoUrl = getMemberPhotoUrl(item);
            const fotoZoom = getMemberPhotoZoom(item);

            return (
              <div key={item.id}>
                {isEditing ? (
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer flex-shrink-0">
                          {uploadingFoto ? (
                            <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                          ) : editForm.foto_url ? (
                            <img
                              src={editForm.foto_url}
                              alt={editForm.nome}
                              className="w-full h-full object-cover transition-transform"
                              style={getPhotoStyle(editForm.foto_zoom)}
                            />
                          ) : (
                            <Camera className="w-6 h-6 text-gray-400" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => event.target.files[0] && handleFoto(event.target.files[0])}
                          />
                        </label>
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                          <input
                            value={editForm.nome}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, nome: event.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                      </div>

                      {editForm.foto_url && (
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <label className="block text-xs font-medium text-gray-600">Ajustar foto</label>
                            <span className="text-xs font-semibold text-gray-500">{Math.round(getMemberPhotoZoom(editForm) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.8"
                            max="2.5"
                            step="0.05"
                            value={getMemberPhotoZoom(editForm)}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, foto_zoom: Number(event.target.value) }))}
                            className="w-full accent-indigo-600"
                          />
                          <p className="mt-1 text-xs text-gray-400">Deslize para diminuir ou aproximar a foto no círculo.</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                          <input
                            value={editForm.telefone}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, telefone: event.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                          <input
                            type="email"
                            value={editForm.user_email}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, user_email: event.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Endereco</label>
                        <input
                          value={editForm.endereco}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, endereco: event.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
                          <input
                            value={editForm.senha}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, senha: event.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Vozes (ate 2)</label>
                          <div className="grid grid-cols-1 gap-1.5">
                            {NAIPES.map((naipe) => {
                              const checked = getMemberNaipes(editForm).includes(naipe.value);

                              return (
                                <label
                                  key={naipe.value}
                                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                                    checked
                                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => alternarVoz(naipe.value)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                                  />
                                  <span>{naipe.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Funcao</label>
                        <select
                          value={editForm.cargo || 'membro'}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, cargo: event.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          <option value="membro">Membro</option>
                          <option value="secretaria">Secretaria</option>
                          <option value="vice_secretaria">Vice-Secretaria</option>
                          <option value="maestro">Maestro</option>
                          <option value="maestrina">Maestrina</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={salvar}
                          disabled={salvando || uploadingFoto}
                          className="flex items-center justify-center gap-1.5 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium disabled:opacity-60"
                        >
                          <Check className="w-4 h-4" /> Salvar
                        </button>
                        <button
                          onClick={cancelarEdicao}
                          className="flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        >
                          <X className="w-4 h-4" /> Cancelar
                        </button>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => excluir(item)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" /> Excluir membro
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(item)}
                    className="flex w-full items-center gap-3 rounded-full px-1 py-1.5 text-left transition-colors hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <span className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-2 ring-white shadow-sm">
                      {fotoUrl ? (
                        <img
                          src={fotoUrl}
                          alt={item.nome}
                          className="h-full w-full object-cover"
                          style={getPhotoStyle(fotoZoom)}
                        />
                      ) : (
                        <User className="h-8 w-8 text-gray-400" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-lg font-semibold text-gray-800">
                      {item.nome || 'Membro'}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showMensagem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h3 className="font-bold text-gray-900">Mensagem para componentes</h3>
                <p className="text-xs text-gray-500">
                  {membrosComTelefone.length} telefone{membrosComTelefone.length !== 1 ? 's' : ''} cadastrado{membrosComTelefone.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMensagem(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mensagem</label>
                <textarea
                  value={mensagemComponentes}
                  onChange={(event) => setMensagemComponentes(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  placeholder="Digite a mensagem para enviar aos componentes..."
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={enviarParaTodos}
                  disabled={membrosComTelefone.length === 0}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Enviar para todos
                </button>
                <button
                  type="button"
                  onClick={() => copiarTexto(mensagemComponentes, 'Mensagem copiada.')}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4" />
                  Copiar mensagem
                </button>
                <button
                  type="button"
                  onClick={copiarContatos}
                  disabled={membrosComTelefone.length === 0}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Phone className="h-4 w-4" />
                  Copiar contatos
                </button>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {membrosComTelefone.length === 0 ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                    Nenhum telefone cadastrado.
                  </div>
                ) : (
                  membrosComTelefone.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{item.nome || 'Membro'}</p>
                        <p className="text-xs text-gray-500">{item.telefone}</p>
                      </div>
                      <a
                        href={getWhatsappUrl(item.telefone, mensagemComponentes)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </CoralLayout>
  );
}
