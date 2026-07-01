import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Shield } from 'lucide-react';
import { isAdminUnlocked, isAdminUser, unlockAdmin } from '@/lib/admin-access';

export default function AdminPasswordGate({ user, children, backPath = '/mural' }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked(user));

  useEffect(() => {
    setUnlocked(isAdminUnlocked(user));
  }, [user]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    if (unlockAdmin(user, password)) {
      setUnlocked(true);
      setPassword('');
      return;
    }

    setError('Senha do admin incorreta.');
  };

  if (!isAdminUser(user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <Shield className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Acesso negado</h1>
          <p className="text-sm text-gray-500 mt-1">Esta área é exclusiva do administrador.</p>
          <button
            onClick={() => navigate(backPath, { replace: true })}
            className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white py-2.5 text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  if (unlocked) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Senha do Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Digite a senha para abrir a área administrativa.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Digite a senha"
          />
        </div>

        <button className="mt-4 w-full rounded-xl bg-gray-900 hover:bg-gray-800 text-white py-3 text-sm font-semibold transition-colors">
          Entrar no Admin
        </button>

        <button
          type="button"
          onClick={() => navigate(backPath, { replace: true })}
          className="mt-3 w-full text-sm text-gray-500 hover:text-gray-800 font-medium"
        >
          Voltar
        </button>
      </form>
    </div>
  );
}
