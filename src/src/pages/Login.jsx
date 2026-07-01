import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, LogIn, Mail, Music, UserPlus } from 'lucide-react';
import { firebaseClient, isFirebaseConfigured } from '@/api/firebaseClient';
import { getPostLoginPath } from '@/lib/post-login';

const getErrorMessage = (error) => {
  const code = error?.code || '';

  if (code === 'invalid_credentials' || /invalid login credentials|senha incorretos/i.test(error?.message || '')) {
    return 'E-mail ou senha incorretos.';
  }

  if (code === 'user_already_exists' || /already registered/i.test(error?.message || '')) {
    return 'Este e-mail ja esta cadastrado.';
  }

  if (/popup|cancel/i.test(error?.message || '')) {
    return 'Login cancelado.';
  }

  return error?.message || 'Nao foi possivel concluir a operacao. Tente novamente.';
};

export default function Login() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('from_url') || '/mural';

  const [authMode, setAuthMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const finishLogin = useCallback(async (targetPath = fromUrl) => {
    window.location.href = await getPostLoginPath(targetPath);
  }, [fromUrl]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await firebaseClient.auth.loginViaEmailPassword(email, password);
      await finishLogin();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await firebaseClient.auth.register({
        email,
        password,
        full_name: fullName,
      });
      if (result?.needsEmailConfirmation) {
        setMessage('Conta criada. Entre com seu e-mail e senha para continuar.');
        setAuthMode('login');
        return;
      }
      await finishLogin();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await firebaseClient.auth.loginWithGoogle();
      if (!result?.redirected) {
        await finishLogin();
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-white/40 p-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-3">
            <Music className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Entrar no CoralHub</h1>
          <p className="text-sm text-gray-500 mt-1">
            Entre primeiro. Depois voce escolhe Maestro/Maestrina ou Membro se ainda nao tiver cadastro.
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm px-4 py-3">
            Firebase ainda nao esta configurado. Preencha VITE_FIREBASE_API_KEY e VITE_FIREBASE_PROJECT_ID no arquivo .env.local.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm px-4 py-3">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || !isFirebaseConfigured}
          className="w-full mb-5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-3"
        >
          <span className="text-lg font-bold text-blue-600">G</span>
          Entrar com Google
        </button>

        <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-xl p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError('');
              setMessage('');
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors ${
              authMode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setError('');
              setMessage('');
            }}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors ${
              authMode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Criar
          </button>
        </div>

        <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {authMode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Seu nome"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="voce@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Minimo 6 caracteres"
              />
            </div>
          </div>

          <button
            disabled={loading || !isFirebaseConfigured}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading
              ? 'Aguarde...'
              : authMode === 'login'
                ? 'Entrar com e-mail'
                : 'Criar conta com e-mail'}
          </button>
        </form>
      </div>
    </div>
  );
}
