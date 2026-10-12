import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  HelpCircle,
  Home,
  LogOut,
  MoreHorizontal,
  Music,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { firebaseClient, isUsingLocalFirebase } from '@/api/firebaseClient';
import { isAdminUser } from '@/lib/admin-access';
import { logoutToApp } from '@/lib/logout';
import { getNomeCoralFonteStyle } from '@/lib/coral-fonts';
import { getReadableTextStyle } from '@/lib/readable-text';
import TrebleClefIcon from '@/components/coral/TrebleClefIcon';

const PAGE_LABELS = {
  '/mural': 'Mural',
  '/dashboard': 'Dashboard',
  '/membros': 'Membros',
  '/biblioteca': 'Musica',
  '/agenda': 'Agenda',
  '/configuracoes': 'Configuracoes',
  '/ajuda': 'Ajuda',
};

export default function CoralLayout({ coral, user, isMaestro, membro, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const lastAccessLogKeyRef = useRef('');
  const touchStartYRef = useRef(0);
  const pullStartedRef = useRef(false);

  const primary = coral?.cor_primaria || '#6366f1';
  const secondary = coral?.cor_secundaria || '#818cf8';
  const capaPosicao = coral?.capa_posicao || 'center center';
  const nomeCoralFonteStyle = getNomeCoralFonteStyle(coral?.nome_fonte);
  const topoTextoStyle = getReadableTextStyle(coral?.topo_texto_cor || '#ffffff');
  const pageBackgroundStyle = coral?.pagina_fundo_url
    ? {
        '--app-background-image': `url("${coral.pagina_fundo_url}")`,
        '--app-background-position': coral.pagina_fundo_posicao || 'center center',
        '--app-background-size': '100% auto',
        '--app-background-color': '#ffffff',
        '--app-background-overlay-start': 'rgba(255, 255, 255, 0.18)',
        '--app-background-overlay-end': 'rgba(255, 255, 255, 0.26)',
      }
    : undefined;
  const headerBackground = coral?.capa_url
    ? `url("${coral.capa_url}")`
    : `linear-gradient(135deg, ${primary}, ${secondary})`;
  const headerStyle = coral?.capa_url
    ? {
        backgroundImage: headerBackground,
        backgroundSize: 'cover',
        backgroundPosition: capaPosicao,
        backgroundRepeat: 'no-repeat',
        textShadow: topoTextoStyle.textShadow,
      }
    : { background: headerBackground };

  const baseNavItems = isMaestro
    ? [
        { to: '/mural', icon: Home, label: 'Início' },
        { to: '/membros', icon: Users, label: 'Membros' },
        { to: '/biblioteca', icon: TrebleClefIcon, label: 'Música' },
        { to: '/agenda', icon: Calendar, label: 'Agenda' },
        { to: '/configuracoes', icon: Settings, label: 'Config.' },
      ]
    : [
        { to: '/mural', icon: Home, label: 'Início' },
        { to: '/membros', icon: Users, label: 'Membros' },
        { to: '/biblioteca', icon: TrebleClefIcon, label: 'Música' },
        { to: '/agenda', icon: Calendar, label: 'Agenda' },
      ];

  const allNavItems = isAdminUser(user)
    ? [...baseNavItems, { to: '/admin/corais', icon: Shield, label: 'Admin' }]
    : baseNavItems;

  const bottomMain = allNavItems.slice(0, 4);
  const bottomMore = allNavItems.slice(4);

  useEffect(() => {
    if (!user?.email || !coral?.id || isAdminUser(user)) return;

    const path = location.pathname || '/mural';
    const logKey = `${coral.id}:${user.email}:${path}`;
    if (lastAccessLogKeyRef.current === logKey) return;
    lastAccessLogKeyRef.current = logKey;

    firebaseClient.entities.AcessoPlataforma.create({
      coral_id: coral.id,
      coral_nome: coral.nome || '',
      user_email: user.email,
      user_nome: membro?.nome || user.full_name || user.email,
      membro_id: membro?.id || '',
      papel: isMaestro ? 'maestro' : membro?.cargo || 'membro',
      pagina: path,
      pagina_nome: PAGE_LABELS[path] || path.replace('/', '') || 'Plataforma',
      acessado_em: new Date().toISOString(),
    }).catch((error) => {
      console.warn('Falha ao registrar acesso da plataforma:', error);
    });
  }, [coral?.id, coral?.nome, isMaestro, location.pathname, membro?.cargo, membro?.id, membro?.nome, user?.email, user?.full_name]);

  const handleTouchStart = (event) => {
    if (refreshing || window.scrollY > 2) return;
    touchStartYRef.current = event.touches[0]?.clientY || 0;
    pullStartedRef.current = true;
  };

  const handleTouchMove = (event) => {
    if (!pullStartedRef.current || refreshing) return;

    const currentY = event.touches[0]?.clientY || 0;
    const diff = currentY - touchStartYRef.current;

    if (window.scrollY > 2 || diff <= 0) {
      setPullDistance(0);
      pullStartedRef.current = false;
      return;
    }

    setPullDistance(Math.min(120, Math.round(diff * 0.45)));
  };

  const handleTouchEnd = () => {
    if (!pullStartedRef.current) return;

    pullStartedRef.current = false;
    if (pullDistance >= 70) {
      setRefreshing(true);
      setPullDistance(90);
      window.setTimeout(() => window.location.reload(), 120);
      return;
    }

    setPullDistance(0);
  };

  return (
    <div
      className="min-h-screen app-background flex flex-col"
      style={pageBackgroundStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="fixed left-1/2 top-3 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-lg ring-1 ring-gray-100"
          style={{ transform: `translate(-50%, ${Math.max(0, pullDistance - 45)}px)` }}
        >
          <span
            className={`h-4 w-4 rounded-full border-2 border-gray-200 ${refreshing ? 'animate-spin border-t-transparent' : ''}`}
            style={{ borderTopColor: refreshing ? 'transparent' : primary, borderRightColor: primary }}
          />
          {refreshing ? 'Atualizando...' : pullDistance >= 70 ? 'Solte para atualizar' : 'Puxe para atualizar'}
        </div>
      )}
      <header
        className="text-white shadow-lg sticky top-0 z-40 overflow-hidden"
        style={headerStyle}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 flex h-full items-center justify-center px-4"
        >
          <span
            className="max-w-[92%] truncate text-3xl leading-none opacity-35 sm:text-5xl"
            style={{ ...nomeCoralFonteStyle, ...topoTextoStyle }}
          >
            {coral?.nome || 'Meu Coral'}
          </span>
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {location.pathname !== '/mural' && (
              <button
                onClick={() => navigate(-1)}
                className="mr-0 flex-shrink-0 rounded-full bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20 sm:mr-1"
                style={topoTextoStyle}
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {coral?.logo_url ? (
              <img src={coral.logo_url} alt="Logo" className="h-12 w-12 flex-shrink-0 rounded-full border-2 border-white/40 object-cover sm:h-16 sm:w-16" />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20 sm:h-16 sm:w-16">
                <Music className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: topoTextoStyle.color }} />
              </div>
            )}
            <div className="min-w-0">
              <h1
                className="max-w-[44vw] truncate text-base leading-tight sm:max-w-none sm:text-xl"
                style={{ ...nomeCoralFonteStyle, ...topoTextoStyle }}
              >
                {coral?.nome || 'Meu Coral'}
              </h1>
              <p className="truncate text-[11px] font-semibold sm:text-xs" style={topoTextoStyle}>{isMaestro ? 'Maestro' : membro?.cargo ? 'Membro' : 'Membro'}</p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              to="/ajuda"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm transition-colors hover:bg-white/20 sm:h-auto sm:w-auto sm:justify-start sm:rounded-none sm:bg-transparent"
              style={topoTextoStyle}
              title="Ajuda"
            >
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm transition-colors hover:bg-white/20 sm:h-auto sm:w-auto sm:justify-start sm:rounded-none sm:bg-transparent"
              style={topoTextoStyle}
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Sair</span>
            </button>
          </div>
        </div>

        <nav className="relative z-10 hidden md:flex max-w-7xl mx-auto px-4 gap-1 pb-1 overflow-x-auto">
          {allNavItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-sm font-medium transition-all whitespace-nowrap ${
                location.pathname === to
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              style={topoTextoStyle}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 pb-24 md:pb-6">
        {isUsingLocalFirebase && (
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
