import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileMusic, HelpCircle, Mail, Music, UserPlus, Users } from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import { redirectToEmailLogin, redirectToLogin } from '@/lib/auth-redirect';
import { getPostLoginPath } from '@/lib/post-login';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    firebaseClient.auth.isAuthenticated().then((auth) => {
      if (auth) {
        getPostLoginPath('/mural')
          .then((path) => navigate(path, { replace: true }))
          .catch(() => navigate('/mural', { replace: true }));
      }
    });
  }, [navigate]);

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col"
      style={{
        backgroundImage: 'linear-gradient(rgba(18, 14, 47, 0.76), rgba(74, 12, 77, 0.82)), url("/app-icon.png")',
      }}
    >
      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-white">
          <div className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
            <Music className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold">CoralHub</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/ajuda" className="text-white/70 hover:text-white text-sm flex items-center gap-1 transition-colors">
            <HelpCircle className="w-4 h-4" /> Ajuda
          </Link>
          <Link
            to="/cadastro"
            className="hidden sm:flex items-center gap-1 bg-white/10 text-white font-semibold px-4 py-2 rounded-full hover:bg-white/20 transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" /> Cadastro
          </Link>
          <button
            onClick={() => redirectToLogin('/mural')}
            className="bg-white text-indigo-700 font-semibold px-5 py-2 rounded-full hover:bg-indigo-50 transition-colors text-sm"
          >
            Entrar / Cadastrar
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <img
          src="/app-icon.png"
          alt="Maestro Coral"
          className="mb-6 h-28 w-28 rounded-[2rem] border-4 border-white/30 object-cover shadow-2xl"
        />
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          Plataforma<br />Maestro Coral
        </h1>
        <p className="text-lg text-white/70 max-w-xl mb-10">
          Gerencie membros, compartilhe partituras e organize os naipes do seu coral em um so lugar.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/cadastro"
            className="flex items-center gap-3 bg-white/10 text-white font-semibold px-6 py-3.5 rounded-full hover:bg-white/20 transition-all border border-white/20"
          >
            <UserPlus className="w-5 h-5" />
            Cadastro com APK
          </Link>
          <button
            onClick={() => redirectToEmailLogin('/mural')}
            className="flex items-center gap-3 bg-white text-indigo-700 font-semibold px-6 py-3.5 rounded-full hover:bg-indigo-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 border border-white"
          >
            <Mail className="w-5 h-5" />
            Entrar com e-mail
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            { icon: Users, title: 'Gestao de membros', desc: 'Cadastre membros por naipe e gerencie seu coral com facilidade.' },
            { icon: FileMusic, title: 'Partituras digitais', desc: 'Suba PDFs de partituras e deixe todos os membros acessarem.' },
            { icon: Music, title: 'Audio por naipe', desc: 'Envie audios especificos para cada naipe: soprano, tenor, baixo e mais.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/10 backdrop-blur rounded-2xl p-6 text-left">
              <Icon className="w-8 h-8 text-white mb-3" />
              <h3 className="text-white font-semibold mb-1">{title}</h3>
              <p className="text-white/60 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
