import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import CoralLayout from '@/components/coral/CoralLayout';
import useCoralContext from '@/hooks/useCoralContext';
import { TEMAS } from '@/utils/coralTheme';
import { verificarEspaco, formatarBytes } from '@/utils/storage';
import StorageIndicator from '@/components/coral/StorageIndicator';
import { publicarCoraisNoCatalogo } from '@/lib/coral-directory';
import { getUploadErrorMessage, uploadCoralFile } from '@/lib/coral-file-upload';

const PRESET_CORES = [
  { primary: '#6366f1', secondary: '#a78bfa', label: 'Índigo' },
  { primary: '#ec4899', secondary: '#f472b6', label: 'Rosa' },
  { primary: '#10b981', secondary: '#34d399', label: 'Verde' },
  { primary: '#f59e0b', secondary: '#fbbf24', label: 'Âmbar' },
  { primary: '#3b82f6', secondary: '#60a5fa', label: 'Azul' },
  { primary: '#8b5cf6', secondary: '#c084fc', label: 'Roxo' },
  { primary: '#ef4444', secondary: '#f87171', label: 'Vermelho' },
  { primary: '#0ea5e9', secondary: '#38bdf8', label: 'Ciano' },
];

const POSICOES_CAPA = [
  { value: 'center center', label: 'Centro' },
  { value: 'center top', label: 'Topo' },
  { value: 'center bottom', label: 'Baixo' },
  { value: 'left center', label: 'Esquerda' },
  { value: 'right center', label: 'Direita' },
];

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user, coral, isMaestro, loading, setCoral } = useCoralContext();
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCapa, setUploadingCapa] = useState(false);
  const [uploadingBemVindo, setUploadingBemVindo] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [msgSenha, setMsgSenha] = useState('');
  const [novosBytes, setNovosBytes] = useState(0);

  useEffect(() => {
    if (!loading && !isMaestro) navigate('/dashboard');
    if (coral) setForm({
      nome: coral.nome || '',
      descricao: coral.descricao || '',
      cidade: coral.cidade || '',
      endereco: coral.endereco || '',
      telefone_contato: coral.telefone_contato || '',
      cor_primaria: coral.cor_primaria || '#6366f1',
      cor_secundaria: coral.cor_secundaria || '#a78bfa',
      tema: coral.tema || 'classico',
      logo_url: coral.logo_url || '',
      capa_url: coral.capa_url || '',
      capa_posicao: coral.capa_posicao || 'center center',
      bem_vindo_url: coral.bem_vindo_url || '',
      bem_vindo_posicao: coral.bem_vindo_posicao || 'center center',
    });
  }, [loading, isMaestro, coral]);

  const handleLogo = async (file) => {
    const espaco = verificarEspaco(coral, file.size);
    if (!espaco.ok) {
      alert(`Limite de armazenamento atingido (1 TB). Espaço restante: ${formatarBytes(espaco.restante)}.`);
      return;
    }
    setUploadingLogo(true);
    try {
      const upload = await uploadCoralFile(firebaseClient, file, { kind: 'image' });
      setForm(p => ({ ...p, logo_url: upload.file_url }));
      setNovosBytes(b => b + upload.file_size);
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      alert(getUploadErrorMessage(error, 'a logo'));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCapa = async (file) => {
    const espaco = verificarEspaco(coral, file.size);
    if (!espaco.ok) {
      alert(`Limite de armazenamento atingido (1 TB). Espaço restante: ${formatarBytes(espaco.restante)}.`);
      return;
    }
    setUploadingCapa(true);
    try {
      const upload = await uploadCoralFile(firebaseClient, file, { kind: 'image' });
      setForm(p => ({ ...p, capa_url: upload.file_url, capa_posicao: 'center center' }));
      setNovosBytes(b => b + upload.file_size);
    } catch (error) {
      console.error('Erro ao enviar capa:', error);
      alert(getUploadErrorMessage(error, 'a capa'));
    } finally {
      setUploadingCapa(false);
    }
  };

  const handleBemVindo = async (file) => {
    const espaco = verificarEspaco(coral, file.size);
    if (!espaco.ok) {
      alert(`Limite de armazenamento atingido (1 TB). Espaco restante: ${formatarBytes(espaco.restante)}.`);
      return;
    }
    setUploadingBemVindo(true);
    try {
      const upload = await uploadCoralFile(firebaseClient, file, { kind: 'image' });
      setForm(p => ({ ...p, bem_vindo_url: upload.file_url, bem_vindo_posicao: 'center center' }));
      setNovosBytes(b => b + upload.file_size);
    } catch (error) {
      console.error('Erro ao enviar imagem de boas-vindas:', error);
      alert(getUploadErrorMessage(error, 'a imagem de boas-vindas'));
    } finally {
      setUploadingBemVindo(false);
    }
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
    const payload = { ...form };
    if (novosBytes > 0) {
      payload.armazenamento_usado_bytes = (coral.armazenamento_usado_bytes || 0) + novosBytes;
    }
    const updated = await firebaseClient.entities.Coral.update(coral.id, payload);
    setCoral(updated);
    publicarCoraisNoCatalogo(firebaseClient, [updated]).catch((error) => {
      console.warn('Falha ao atualizar catalogo de corais:', error);
    });
    setNovosBytes(0);
    setSalvando(false);
    alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuracoes:', error);
      alert('Nao foi possivel salvar as configuracoes. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (!coral) return null;

  const primary = form.cor_primaria || '#6366f1';
  const previewCoral = { ...coral, ...form };

  return (
    <CoralLayout coral={previewCoral} user={user} isMaestro={isMaestro}>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Configurações do Coral</h2>

      <form onSubmit={salvar} className="space-y-6">
        {/* Armazenamento */}
        <StorageIndicator coral={coral} primary={primary} />

        {/* Identidade */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Identidade Visual</h3>

          <div className="flex flex-col gap-5 mb-4">
            {/* Logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                {form.logo_url ? <img src={form.logo_url} className="w-full h-full object-cover" alt="Logo" /> : <span className="text-2xl">🎵</span>}
              </div>
              <label className="cursor-pointer text-xs text-indigo-600 hover:underline">
                {uploadingLogo ? 'Enviando...' : 'Alterar logo'}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleLogo(e.target.files[0])} />
              </label>
            </div>

            {/* Capa */}
            <div className="flex-1">
              <p className="mb-2 text-xs font-medium text-gray-600">Imagem do topo do coral</p>
              <div
                className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-indigo-300 transition-colors relative"
              >
                {form.capa_url
                  ? (
                    <img
                      src={form.capa_url}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: form.capa_posicao || 'center center' }}
                      alt="Capa"
                    />
                  )
                  : <span className="text-gray-400 text-sm">Clique para colocar a imagem no topo</span>}
                <label className="absolute inset-0 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleCapa(e.target.files[0])} />
                </label>
              </div>
              {form.capa_url && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-gray-600">Ajuste da imagem no topo</p>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                    {POSICOES_CAPA.map((posicao) => (
                      <button
                        key={posicao.value}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, capa_posicao: posicao.value }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          (form.capa_posicao || 'center center') === posicao.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {posicao.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {uploadingCapa ? (
                <p className="text-xs text-gray-400 mt-1">Enviando imagem para o topo...</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Use Centro quando a imagem tiver palavras. Toque em salvar para gravar.</p>
              )}
            </div>

            {/* Boas-vindas */}
            <div className="flex-1">
              <p className="mb-2 text-xs font-medium text-gray-600">Imagem do Seja bem-vindo</p>
              <div
                className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-indigo-300 transition-colors relative"
              >
                {form.bem_vindo_url
                  ? (
                    <img
                      src={form.bem_vindo_url}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: form.bem_vindo_posicao || 'center center' }}
                      alt="Imagem do Seja bem-vindo"
                    />
                  )
                  : <span className="text-gray-400 text-sm">Clique para trocar so o fundo do Seja bem-vindo</span>}
                <label className="absolute inset-0 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleBemVindo(e.target.files[0])} />
                </label>
              </div>
              {form.bem_vindo_url && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-gray-600">Ajuste da imagem do Seja bem-vindo</p>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                    {POSICOES_CAPA.map((posicao) => (
                      <button
                        key={posicao.value}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, bem_vindo_posicao: posicao.value }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          (form.bem_vindo_posicao || 'center center') === posicao.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {posicao.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {uploadingBemVindo ? (
                <p className="text-xs text-gray-400 mt-1">Enviando imagem do Seja bem-vindo...</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Essa imagem nao mexe no topo do coral.</p>
              )}
            </div>
          </div>

          {/* Cores */}
          <p className="text-sm font-medium text-gray-700 mb-2">Paleta de Cores</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_CORES.map(preset => (
              <button
                key={preset.primary}
                type="button"
                onClick={() => setForm(p => ({ ...p, cor_primaria: preset.primary, cor_secundaria: preset.secondary }))}
                className="w-9 h-9 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                  borderColor: form.cor_primaria === preset.primary ? '#1f2937' : 'transparent'
                }}
                title={preset.label}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cor Primária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.cor_primaria || '#6366f1'} onChange={e => setForm(p => ({ ...p, cor_primaria: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0" />
                <input value={form.cor_primaria || ''} onChange={e => setForm(p => ({ ...p, cor_primaria: e.target.value }))}
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cor Secundária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.cor_secundaria || '#a78bfa'} onChange={e => setForm(p => ({ ...p, cor_secundaria: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0" />
                <input value={form.cor_secundaria || ''} onChange={e => setForm(p => ({ ...p, cor_secundaria: e.target.value }))}
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-3 h-10 rounded-xl" style={{ background: `linear-gradient(135deg, ${primary}, ${form.cor_secundaria || '#a78bfa'})` }} />
        </div>

        {/* Dados */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Dados do Coral</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Coral *</label>
              <input required value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input value={form.telefone_contato} onChange={e => setForm(p => ({ ...p, telefone_contato: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
              <select value={form.tema} onChange={e => setForm(p => ({ ...p, tema: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {TEMAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={salvando || uploadingLogo || uploadingCapa || uploadingBemVindo}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>
    </CoralLayout>
  );
}
