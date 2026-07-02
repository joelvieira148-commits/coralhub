import { Link } from 'react-router-dom';
import { Download, Globe2, Music, Smartphone } from 'lucide-react';

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
          Use pelo navegador sem instalar nada, ou baixe o APK se preferir usar como aplicativo.
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
            Baixar APK
          </a>
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
