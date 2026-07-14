import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Music, FileMusic, TrendingUp } from 'lucide-react';
import { firebaseClient } from '@/api/firebaseClient';
import CoralLayout from '@/components/coral/CoralLayout';
import useCoralContext from '@/hooks/useCoralContext';
import { NAIPES, getNaipeInfo } from '@/utils/coralTheme';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, coral, membro, isMaestro, loading } = useCoralContext();
  const [membros, setMembros] = useState([]);
  const [musicas, setMusicas] = useState([]);

  useEffect(() => {
    if (!user && !loading) navigate('/');
    if (!loading && user && !coral && !membro) navigate('/onboarding');
    if (!loading && coral) navigate('/mural');
    if (!loading && user && membro && !coral) navigate('/onboarding');
  }, [user, coral, membro, loading]);

  useEffect(() => {
    if (!coral) return;
    firebaseClient.entities.Membro.filter({ coral_id: coral.id }).then(setMembros);
    firebaseClient.entities.Musica.filter({ coral_id: coral.id }).then(setMusicas);
  }, [coral]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!coral) return null;

  const primary = coral.cor_primaria || '#6366f1';
  const secondary = coral.cor_secundaria || '#a78bfa';
  const welcomeBackgroundImage = coral.capa_url
    ? `linear-gradient(rgba(15, 23, 42, 0.50), rgba(15, 23, 42, 0.78)), url("${coral.capa_url}")`
    : `linear-gradient(135deg, ${primary}, ${secondary})`;
  const naipeCounts = NAIPES.map(n => ({
    ...n,
    count: membros.filter(m => m.naipe === n.value).length
  }));

  return (
    <CoralLayout coral={coral} user={user} isMaestro={isMaestro}>
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 mb-6 min-h-[132px] text-white shadow-lg bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: welcomeBackgroundImage,
          backgroundPosition: coral.capa_url ? coral.capa_posicao || 'center center' : undefined,
        }}
      >
        <div className="relative">
          {isMaestro ? (
            <>
              <p className="text-white/80 text-sm mb-1">Olá, Maestro!</p>
              <h2 className="text-2xl font-bold">{coral.nome}</h2>
              <p className="text-white/70 mt-1 text-sm">{coral.cidade || ''} · {membros.length} membro{membros.length !== 1 ? 's' : ''}</p>
            </>
          ) : (
            <>
              <p className="text-white/80 text-sm mb-1">Olá, {membro?.nome?.split(' ')[0]}!</p>
              <h2 className="text-2xl font-bold">{coral.nome}</h2>
              <p className="text-white/70 mt-1 text-sm">Naipe: {getNaipeInfo(membro?.naipe)?.label}</p>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: 'Membros', value: membros.length, color: 'text-blue-600 bg-blue-50' },
          { icon: Music, label: 'Músicas', value: musicas.length, color: 'text-purple-600 bg-purple-50' },
          { icon: FileMusic, label: 'Partituras', value: musicas.filter(m => m.partitura_url).length, color: 'text-green-600 bg-green-50' },
          { icon: TrendingUp, label: 'Naipes', value: naipeCounts.filter(n => n.count > 0).length, color: 'text-orange-600 bg-orange-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Naipes breakdown */}
      {isMaestro && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Membros por Naipe</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {naipeCounts.map(n => (
              <div key={n.value} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: n.cor }} />
                <div>
                  <p className="text-sm font-medium text-gray-700">{n.label}</p>
                  <p className="text-xs text-gray-400">{n.count} membro{n.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent musicas */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Músicas Recentes</h3>
          <button
            onClick={() => navigate('/biblioteca')}
            className="text-sm font-medium"
            style={{ color: primary }}
          >
            Ver todas →
          </button>
        </div>
        {musicas.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhuma música cadastrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {musicas.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Music className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.titulo}</p>
                  <p className="text-xs text-gray-400 truncate">{m.compositor || 'Compositor não informado'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CoralLayout>
  );
}
