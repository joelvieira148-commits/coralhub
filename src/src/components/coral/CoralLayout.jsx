import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  HelpCircle,
  Home,
  Library,
  LogOut,
  MoreHorizontal,
  Music,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { isUsingLocalSupabase } from '@/api/supabaseClient';
import { isAdminUser } from '@/lib/admin-access';
import { logoutToApp } from '@/lib/logout';

export default function CoralLayout({ coral, user, isMaestro, membro, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const primary = coral?.cor_primaria || '#6366f1';
  const secondary = coral?.cor_secundaria || '#818cf8';

  const baseNavItems = isMaestro
    ? [
        { to: '/mural', icon: Home, label: 'Início' },
        { to: '/membros', icon: Users, label: 'Membros' },
        { to: '/biblioteca', icon: Library, label: 'Biblioteca' },
        { to: '/agenda', icon: Calendar, label: 'Agenda' },
        { to: '/configuracoes', icon: Settings, label: 'Config.' },
      ]
    : [
        { to: '/mural', icon: Home, label: 'Início' },
        { to: '/membros', icon: Users, label: 'Membros' },
        { to: '/biblioteca', icon: Library, label: 'Biblioteca' },
        { to: '/agenda', icon: Calendar, label: 'Agenda' },
      ];

  const allNavItems = isAdminUser(user)
    ? [...baseNavItems, { to: '/admin/corais', icon: Shield, label: 'Admin' }]
    : baseNavItems;

  const bottomMain = allNavItems.slice(0, 4);
  const bottomMore = allNavItems.slice(4);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header
        className="text-white shadow-lg sticky top-0 z-40"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {location.pathname !== '/mural' && (
              <button
                onClick={() => navigate(-1)}
                className="mr-1 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {coral?.logo_url ? (
              <img src={coral.logo_url} alt="Logo" className="h-8 w-8 rounded-full object-cover border-2 border-white/40 flex-shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight truncate max-w-[160px] sm:max-w-none">{coral?.nome || 'Meu Coral'}</h1>
              <p className="text-xs text-white/70">{isMaestro ? 'Maestro' : membro?.cargo ? 'Membro' : 'Membro'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/ajuda" className="flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Ajuda</span>
            </Link>
            <button
              onClick={() => {
                try {
                  if (window.google?.accounts?.id) {
                    window.google.accounts.id.disableAutoSelect();
                  }
                } catch (_) {
                  // Google scripts may not be loaded in every environment.
                }
                logoutToApp('/');
              }}
              className="flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Sair</span>
            </button>
          </div>
        </div>

        <nav className="hidden md:flex max-w-7xl mx-auto px-4 gap-1 pb-1 overflow-x-auto">
          {allNavItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-sm font-medium transition-all whitespace-nowrap ${
                location.pathname === to
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 pb-24 md:pb-6">
        {isUsingLocalSupabase && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Modo local ativo: uploads e cadastros ficam somente neste aparelho.</span>
          </div>
        )}
        {children}
      </main>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomMain.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              location.pathname === to ? 'text-white' : 'text-gray-500'
            }`}
            style={location.pathname === to ? { color: primary } : {}}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}

        {bottomMore.length > 0 && (
          <div className="relative flex-1">
            <button
              onClick={() => setShowMore((value) => !value)}
              className={`w-full h-full flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                bottomMore.some((item) => item.to === location.pathname) ? '' : 'text-gray-500'
              }`}
              style={bottomMore.some((item) => item.to === location.pathname) ? { color: primary } : {}}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px]">Mais</span>
            </button>

            {showMore && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[160px]">
                  {bottomMore.map(({ to, icon: Icon, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setShowMore(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 ${
                        location.pathname === to ? 'text-indigo-600' : 'text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
