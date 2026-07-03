import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Check,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Search,
  Shield,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import CoralLayout from '@/components/coral/CoralLayout';
import useCoralContext, { clearCoralContextCache } from '@/hooks/useCoralContext';
import { clearCurrentUserCoralMembership, getMemberEmail, normalizeEmail } from '@/lib/coral-membership';
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
  cargo: 'membro',
  foto_url: '',
};

const cargoLabel = {
  membro: 'Membro',
  secretaria: 'Secretaria',
  vice_secretaria: 'Vice-Secretaria',
  maestro: 'Maestro',
  maestrina: 'Maestrina',
};

export default function Membros() {
  const navigate = useNavigate();
  const { user, coral, membro, isMaestro, loading, setCoral } = useCoralContext();
  const [membros, setMembros] = useState([]);
  const [search, setSearch] = useState('');
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [novosBytes, setNovosBytes] = useState(0);

  const canManage = isMaestro;

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
    const voz = getNaipeInfo(item.naipe)?.label || '';

    return [
      item.nome,
      item.telefone,
      item.endereco,
      item.user_email || item.email,
      item.cargo,
      voz,
    ].some((value) => String(value || '').toLowerCase().includes(termo));
  });

  const iniciarEdicao = (item) => {
    setEditando(item.id);
    setNovosBytes(0);
    setEditForm({
      nome: item.nome || '',
      telefone: item.telefone || '',
      endereco: item.endereco || '',
      user_email: item.user_email || item.email || '',
      senha: item.senha || '',
      naipe: item.naipe || '',
      cargo: item.cargo || 'membro',
      foto_url: getMemberPhotoUrl(item),
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

  const salvar = async () => {
    setSalvando(true);

    try {
      const payload = {
        ...editForm,
        ...getMemberPhotoFields(editForm.foto_url),
        email: editForm.user_email,
        user_email: editForm.user_email,
      };

      const updated = await firebaseClient.entities.Membro.update(editando, payload);
      const updatedWithPhoto = { ...updated, ...getMemberPhotoFields(editForm.foto_url) };
      setMembros((prev) => prev.map((item) => (item.id === editando ? updatedWithPhoto : item)));

      if (novosBytes > 0) {
        const updatedCoral = await firebaseClient.entities.Coral.update(coral.id, {
          armazenamento_usado_bytes: (coral.armazenamento_usado_bytes || 0) + novosBytes,
        });
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

    if (!confirm(`Excluir ${nome} do coral? Ele tera que fazer todo o cadastro novamente para entrar.`)) return;

    try {
      await Promise.all(idsParaExcluir.map((id) => firebaseClient.entities.Membro.delete(id)));
      setMembros((prev) => prev.filter((item) => !idsParaExcluir.includes(item.id)));

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
    <CoralLayout coral={coral} user={user} isMaestro={isMaestro} membro={membro}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Membros do Coral</h2>
          <p className="text-sm text-gray-500">
            {membros.length} membro{membros.length !== 1 ? 's' : ''} registrado{membros.length !== 1 ? 's' : ''}
          </p>
        </div>
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
            const voz = getNaipeInfo(item.naipe);
            const isEditing = editando === item.id;
            const fotoUrl = getMemberPhotoUrl(item);

            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer flex-shrink-0">
                          {uploadingFoto ? (
                            <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                          ) : editForm.foto_url ? (
                            <img src={editForm.foto_url} alt={editForm.nome} className="w-full h-full object-cover" />
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
                          <label className="block text-xs font-medium text-gray-600 mb-1">Voz</label>
                          <select
                            value={editForm.naipe}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, naipe: event.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            <option value="">Sem voz</option>
                            {NAIPES.map((naipe) => (
                              <option key={naipe.value} value={naipe.value}>
                                {naipe.label}
                              </option>
                            ))}
                          </select>
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
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {fotoUrl ? (
                            <img src={fotoUrl} alt={item.nome} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 truncate">{item.nome}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {item.naipe && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: `${voz.cor}20`, color: voz.cor }}
                              >
                                {voz.label}
                              </span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {cargoLabel[item.cargo || 'membro'] || item.cargo}
                            </span>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => iniciarEdicao(item)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => excluir(item)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 text-sm text-gray-500">
                        {(item.user_email || item.email) && (
                          <p className="flex items-center gap-2 min-w-0">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{item.user_email || item.email}</span>
                          </p>
                        )}
                        {item.telefone && (
                          <p className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{item.telefone}</span>
                          </p>
                        )}
                        {item.endereco && (
                          <p className="flex items-center gap-2 min-w-0">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{item.endereco}</span>
                          </p>
                        )}
                        {item.senha && canManage && (
                          <p className="flex items-center gap-2 min-w-0">
                            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{item.senha}</span>
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
    </CoralLayout>
  );
}
