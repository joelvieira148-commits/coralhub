import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { setupNativeAuthListener } from '@/lib/native-app';
import { getPostLoginPath } from '@/lib/post-login';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AuthFinalCallback from './pages/AuthFinalCallback';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Membros from './pages/Membros';
import Biblioteca from './pages/Biblioteca';
import Configuracoes from './pages/Configuracoes';
import Ajuda from './pages/Ajuda';
import Mural from './pages/Mural';
import Agenda from './pages/Agenda';
import AdminBiblioteca from './pages/AdminBiblioteca';
import AdminCorais from './pages/AdminCorais';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const isPublicRoute = ['/', '/login', '/ajuda'].includes(location.pathname);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (isPublicRoute && authError.type === 'auth_required') {
      return <AppRoutes />;
    }

    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <AppRoutes />
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/api/apps/auth/callback" element={<AuthFinalCallback />} />
      <Route path="/api/apps/auth/final-callback" element={<AuthFinalCallback />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/membros" element={<Membros />} />
      <Route path="/biblioteca" element={<Biblioteca />} />
      <Route path="/configuracoes" element={<Configuracoes />} />
      <Route path="/ajuda" element={<Ajuda />} />
      <Route path="/mural" element={<Mural />} />
      <Route path="/agenda" element={<Agenda />} />
      <Route path="/admin/biblioteca" element={<AdminBiblioteca />} />
      <Route path="/admin/corais" element={<AdminCorais />} />
      <Route path="/elenco" element={<Navigate to="/membros" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

const NativeAuthBridge = () => {
  useEffect(() => setupNativeAuthListener(), []);

  return null;
};

const PostLoginRedirect = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated) return;

    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const shouldResolve = ['/', '/login'].includes(location.pathname);
    if (!shouldResolve) return;

    let active = true;
    const loginFromUrl = new URLSearchParams(location.search).get('from_url');
    const preferredPath = location.pathname === '/login'
      ? loginFromUrl || '/mural'
      : currentPath;

    getPostLoginPath(preferredPath)
      .then((target) => {
        if (!active || !target || target === currentPath) return;
        navigate(target, { replace: true });
      })
      .catch((error) => {
        console.warn('Falha ao resolver destino apos login:', error);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, isLoadingAuth, location.pathname, location.search, location.hash, navigate]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NativeAuthBridge />
          <PostLoginRedirect />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
