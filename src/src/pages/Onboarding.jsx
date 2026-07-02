import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, User, ArrowLeft, Camera, MessageCircle, RefreshCw } from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import { NAIPES } from '@/utils/coralTheme';
import { carregarCoraisParaCadastro } from '@/lib/coral-directory';
import { CORAL_STATUS, isCoralApproved, isCoralPending } from '@/lib/coral-approval';
import { getMemberPhotoFields } from '@/lib/member-photo';
import { uploadProfilePhoto } from '@/lib/profile-photo-upload';
import { saveCoralContextCache } from '@/hooks/useCoralContext';

const ADMIN_WHATSAPP_LABEL = '(81) 98551-1614';
const ADMIN_WHATSAPP_URL = 'https://wa.me/5581985511614';

const criarLinkWhatsApp = (mensagem = '') => {
  if (!mensagem) return ADMIN_WHATSAPP_URL;
  return `${ADMIN_WHATSAPP_URL}?text=${encodeURIComponent(mensagem)}`;
};

export default function Onboarding() {
  const [step, setStep] = useState('role'); // role | maestro | membro
  const [loading, setLoading] = useState(false);
  const [corais, setCorais] = useState([]);
  const [coralPendente, setCoralPendente] = useState(null);
  const [coraisLoading, setCoraisLoading] = useState(false);
  const [coraisError, setCoraisError] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  // Maestro form
  const [nomeCoralForm, setNomeCoralForm] = useState('');
  const [cidadeForm, setCidadeForm] = useState('');
  const [cargoRegente, setCargoRegente] = useState('maestro');
  const [fotoMaestroUrl, setFotoMaestroUrl] = useState('');
  const [uploadingMaestro, setUploadingMaestro] = useState(false);

  // Membro form
  const [nomeForm, setNomeForm] = useState('');
  const [telefoneForm, setTelefoneForm] = useState('');
  const [naipeForm, setNaipeForm] = useState('');
  const [coralIdForm, setCoralIdForm] = useState('');
  const [fotoMembroUrl, setFotoMembroUrl] = useState('');
  const [uploadingMembro, setUploadingMembro] = useState(false);

  const carregarCorais = useCallback(async () => {
    setCoraisLoading(true);
    setCoraisError('');

    try {
      const lista = await carregarCoraisParaCadastro(firebaseClient);
      setCorais(lista);

      if (lista.length === 0) {
        setCoraisError('Nenhum coral cadastrado apareceu para esta conta.');
      }
    } catch (error) {
      console.error('Erro ao carregar corais:', error);
      setCorais([]);
      setCoraisError('Nao foi possivel carregar os corais. Toque em atualizar.');
    } finally {
      setCoraisLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const carregarPendente = async () => {
      try {
        const user = await firebaseClient.auth.me();
        const meusCorais = await firebaseClient.entities.Coral.filter({ maestro_email: user.email });
        const aprovado = meusCorais.find(isCoralApproved);

        if (active && aprovado) {
          const userUpdate = {
            active_coral_id: aprovado.id,
            active_coral_role: 'maestro',
            active_coral_nome: aprovado.nome || '',
            active_coral_cidade: aprovado.cidade || '',
            pending_coral_id: '',
            pending_coral_nome: '',
            active_member_id: '',
            member_nome: user.full_name || user.email || '',
            member_naipe: '',
          };

          await firebaseClient.auth.updateMe(userUpdate);
          saveCoralContextCache({
            user: { ...user, ...userUpdate },
            coral: aprovado,
            membro: null,
            isMaestro: true,
          });
          navigate('/mural', { replace: true });
          return;
        }

        const pendente = meusCorais.find(isCoralPending);

        if (active && pendente) {
          setCoralPendente(pendente);
          setStep('pending');
        }
      } catch (error) {
        console.warn('Falha ao verificar coral pendente:', error);
      }
    };

    carregarPendente();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (step === 'membro') {
      carregarCorais();
    }
  }, [step, carregarCorais]);

  const handleFotoUpload = async (file, setter, setUploading) => {
    setUploading(true);
    setFormError('');

    try {
      const { url } = await uploadProfilePhoto(firebaseClient, file);
      setter(url);
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      setFormError('Nao foi possivel enviar a foto. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const escolherMaestro = () => {
    setFormError('');
    setStep('maestro');
  };

  const escolherMembro = () => {
    setFormError('');
    setStep('membro');
  };

  const WhatsAppCadastro = ({ className = '', mensagem = '' }) => (
    <a
      href={criarLinkWhatsApp(mensagem)}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center justify-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-100 ${className}`}
    >
      <MessageCircle className="w-4 h-4" />
      Duvidas no cadastro? WhatsApp {ADMIN_WHATSAPP_LABEL}
    </a>
  );

  const criarCoral = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');

    try {
      const user = await firebaseClient.auth.me();
      const coral = await firebaseClient.entities.Coral.create({
        nome: nomeCoralForm,
        cidade: cidadeForm,
        maestro_email: user.email,
        cor_primaria: '#6366f1',
        cor_secundaria: '#a78bfa',
        tema: 'classico',
        status_aprovacao: CORAL_STATUS.pending,
        solicitado_em: new Date().toISOString(),
      });
      const fotoMaestroFields = getMemberPhotoFields(fotoMaestroUrl);
      const fotoMaestroParaUsuario = fotoMaestroUrl && !fotoMaestroUrl.startsWith('data:')
        ? fotoMaestroFields
        : {};
      await firebaseClient.entities.Membro.create({
        nome: user.full_name || user.email,
        email: user.email,
        coral_id: coral.id,
        user_email: user.email,
        cargo: cargoRegente,
        ...fotoMaestroFields,
        ativo: true,
      });
      await firebaseClient.auth.updateMe({
        active_coral_id: '',
        active_coral_role: '',
        pending_coral_id: coral.id,
        pending_coral_nome: coral.nome || '',
        ...fotoMaestroParaUsuario,
      });
      saveCoralContextCache({
        user: {
          ...user,
          active_coral_id: '',
          active_coral_role: '',
          pending_coral_id: coral.id,
          pending_coral_nome: coral.nome || '',
          ...fotoMaestroParaUsuario,
        },
        coral: null,
        membro: null,
        isMaestro: false,
      });
      setCoralPendente(coral);
      setStep('pending');
    } catch (error) {
      console.error('Erro ao criar coral:', error);
      setFormError('Nao foi possivel criar o coral. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
          <Music className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-800">Coral aguardando aprovacao</h1>
          <p className="text-gray-500 mt-3 text-sm">
            A aprovacao e somente para maestro ou maestrina criando um coral novo. Membros entram direto escolhendo um coral ja aprovado.
          </p>
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-semibold text-indigo-900">
              Seu coral foi enviado para o admin aprovar com um clique.
            </p>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Coral: {coralPendente?.nome || 'Seu coral'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Verificar aprovacao
          </button>
          <WhatsAppCadastro
            className="mt-3"
            mensagem={`Ola, preciso de aprovacao para o coral: ${coralPendente?.nome || 'meu coral'}.`}
          />
        </div>
      </div>
    );
  }

  const entrarComoMembro = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!corais.some((coral) => coral.id === coralIdForm)) {
      setFormError('Escolha um coral da lista antes de continuar.');
      return;
    }

    setLoading(true);

    try {
      const coralEscolhido = corais.find((coral) => coral.id === coralIdForm);
      const user = await firebaseClient.auth.me();
      const fotoMembroFields = getMemberPhotoFields(fotoMembroUrl);
      const fotoMembroParaUsuario = fotoMembroUrl && !fotoMembroUrl.startsWith('data:')
        ? { member_foto_url: fotoMembroUrl, ...fotoMembroFields }
        : {};
      const membroCriado = await firebaseClient.entities.Membro.create({
        nome: nomeForm,
        email: user.email,
        telefone: telefoneForm,
        naipe: naipeForm,
        coral_id: coralIdForm,
        user_email: user.email,
        ativo: true,
        ...fotoMembroFields,
      });
      const membroCriadoComFoto = { ...membroCriado, ...fotoMembroFields };
      const userUpdate = {
        active_coral_id: coralIdForm,
        active_coral_role: 'membro',
        active_coral_nome: coralEscolhido?.nome || '',
        active_coral_cidade: coralEscolhido?.cidade || '',
        active_member_id: membroCriado?.id || '',
        member_nome: nomeForm,
        member_naipe: naipeForm,
        ...fotoMembroParaUsuario,
      };
      const userAtualizado = { ...user, ...userUpdate };
      await firebaseClient.auth.updateMe(userUpdate);
      saveCoralContextCache({
        user: userAtualizado,
        coral: {
          id: coralIdForm,
          nome: coralEscolhido?.nome || 'Meu Coral',
          cidade: coralEscolhido?.cidade || '',
          maestro_email: coralEscolhido?.maestro_email || '',
          cor_primaria: coralEscolhido?.cor_primaria || '#6366f1',
          cor_secundaria: coralEscolhido?.cor_secundaria || '#a78bfa',
          tema: coralEscolhido?.tema || 'classico',
        },
        membro: membroCriadoComFoto,
        isMaestro: false,
      });
      navigate('/mural');
    } catch (error) {
      console.error('Erro ao cadastrar membro:', error);
      setFormError('Nao foi possivel entrar no coral. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <Music className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-800">Bem-vindo ao CoralHub!</h1>
            <p className="text-gray-500 mt-2">Como você vai usar a plataforma?</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={escolherMaestro}
              className="group border-2 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-2xl p-6 text-left transition-all"
            >
              <Music className="w-8 h-8 text-indigo-500 mb-2" />
              <h3 className="font-bold text-gray-800 text-lg">Sou Maestro / Maestrina</h3>
              <p className="text-gray-500 text-sm mt-1">Criar e gerenciar meu coral, cadastrar membros e fazer uploads.</p>
            </button>
            <button
              onClick={escolherMembro}
              className="group border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-50 rounded-2xl p-6 text-left transition-all"
            >
              <User className="w-8 h-8 text-purple-500 mb-2" />
              <h3 className="font-bold text-gray-800 text-lg">Sou Membro</h3>
              <p className="text-gray-500 text-sm mt-1">Entrar em um coral existente, ver partituras e ouvir áudios.</p>
            </button>
          </div>
          <WhatsAppCadastro className="mt-5" />
        </div>
      </div>
    );
  }

  if (step === 'maestro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <button onClick={() => setStep('role')} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Criar seu Coral</h2>
          <p className="text-gray-500 text-sm mb-6">Preencha as informações básicas do seu coral.</p>
          <WhatsAppCadastro className="mb-4" />
          {formError && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <form onSubmit={criarCoral} className="space-y-4">
            {/* Cargo */}
            <div className="grid grid-cols-2 gap-2">
              {['maestro', 'maestrina'].map(c => (
                <button key={c} type="button"
                  onClick={() => setCargoRegente(c)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize ${cargoRegente === c ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                  {c === 'maestro' ? '🎼 Maestro' : '🎵 Maestrina'}
                </button>
              ))}
            </div>
            {/* Foto do maestro */}
            <div className="flex flex-col items-center gap-2">
              <label className="cursor-pointer group">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-indigo-300 group-hover:border-indigo-500 flex items-center justify-center bg-indigo-50 overflow-hidden transition-colors">
                  {uploadingMaestro ? (
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : fotoMaestroUrl ? (
                    <img src={fotoMaestroUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-7 h-7 text-indigo-400" />
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files[0] && handleFotoUpload(e.target.files[0], setFotoMaestroUrl, setUploadingMaestro)} />
              </label>
              <span className="text-xs text-gray-400">Foto de perfil (opcional)</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Coral *</label>
              <input required value={nomeCoralForm} onChange={e => setNomeCoralForm(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Ex: Coral Santa Cecília" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input value={cidadeForm} onChange={e => setCidadeForm(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Ex: São Paulo" />
            </div>
            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar meu Coral'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'membro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <button onClick={() => setStep('role')} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Entrar em um Coral</h2>
          <p className="text-gray-500 text-sm mb-6">Preencha seus dados para se registrar.</p>
          <p className="mb-4 rounded-xl bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700">
            Membro nao precisa de aprovacao: escolha o coral e entre direto.
          </p>
          <WhatsAppCadastro className="mb-4" />
          {formError && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <form onSubmit={entrarComoMembro} className="space-y-4">
            {/* Foto do membro */}
            <div className="flex flex-col items-center gap-2">
              <label className="cursor-pointer group">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-purple-300 group-hover:border-purple-500 flex items-center justify-center bg-purple-50 overflow-hidden transition-colors">
                  {uploadingMembro ? (
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  ) : fotoMembroUrl ? (
                    <img src={fotoMembroUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-7 h-7 text-purple-400" />
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files[0] && handleFotoUpload(e.target.files[0], setFotoMembroUrl, setUploadingMembro)} />
              </label>
              <span className="text-xs text-gray-400">Foto de perfil (opcional)</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome completo *</label>
              <input required value={nomeForm} onChange={e => setNomeForm(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="João Silva" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input value={telefoneForm} onChange={e => setTelefoneForm(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naipe *</label>
              <select required value={naipeForm} onChange={e => setNaipeForm(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Selecione seu naipe</option>
                {NAIPES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-gray-700">Coral *</label>
                <button
                  type="button"
                  onClick={carregarCorais}
                  disabled={coraisLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${coraisLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
              <select
                required
                value={coralIdForm}
                onChange={e => setCoralIdForm(e.target.value)}
                disabled={coraisLoading || corais.length === 0}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50 disabled:text-gray-400">
                <option value="">
                  {coraisLoading
                    ? 'Carregando corais...'
                    : corais.length === 0
                      ? 'Nenhum coral cadastrado'
                      : 'Selecione o coral'}
                </option>
                {corais.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cidade ? ` - ${c.cidade}` : ''}</option>)}
              </select>
              {coraisError ? (
                <p className="mt-2 text-xs text-red-600">{coraisError}</p>
              ) : !coraisLoading && corais.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  Nenhum coral apareceu ainda. O maestro precisa criar o coral primeiro, depois toque em Atualizar.
                </p>
              ) : null}
            </div>
            <button disabled={loading || coraisLoading || !coralIdForm} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
              {loading ? 'Entrando...' : 'Entrar no Coral'}
            </button>
          </form>
        </div>
      </div>
    );
  }
}
