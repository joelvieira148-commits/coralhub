import { Link } from 'react-router-dom';
import { Download, Globe2, Music, Share2, Smartphone } from 'lucide-react';

const APK_DOWNLOAD_URL = '/downloads/coralhub.apk';

export default function CadastroPublico() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
          <Music className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Cadastro CoralHub</h1>
        <p className="mt-2 text-sm text-gray-500">
          Use pelo navegador sem instalar nada. Android pode baixar APK; iPhone usa pelo Safari.
        </p>

        <div className="mt-7 space-y-3">
          <Link
            to="/login?from_url=/onboarding&mode=register"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            <Globe2 className="h-5 w-5" />
            Entrar pelo navegador
          </Link>
          <a
            href={APK_DOWNLOAD_URL}
            download
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Download className="h-5 w-5" />
            Baixar APK para Android
          </a>
        </div>

        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-left">
          <div className="flex items-start gap-3">
            <Share2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-700" />
            <div>
              <p className="text-sm font-semibold text-sky-900">iPhone / iPad</p>
              <p className="mt-1 text-sm text-sky-800">
                Abra este link no Safari, toque em Compartilhar e depois em Adicionar a Tela de Inicio.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-purple-50 p-4 text-left">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600" />
            <p className="text-sm text-purple-800">
              Link de cadastro: <span className="font-semibold">coralhub.vercel.app/cadastro</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
