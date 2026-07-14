import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Download, Globe2, Share2, Smartphone, UserPlus } from 'lucide-react';

const APK_DOWNLOAD_URL = '/downloads/coralhub.apk';

export default function CadastroPublico() {
  const [infoAberta, setInfoAberta] = useState('cadastro');

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-6"
      style={{
        backgroundImage: 'linear-gradient(rgba(20, 16, 51, 0.72), rgba(74, 12, 77, 0.78)), url("/app-icon.png")',
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-6 text-center shadow-2xl backdrop-blur sm:p-8">
        <img
          src="/app-icon.png"
          alt="Maestro Coral"
          className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-lg"
        />
        <h1 className="text-2xl font-bold text-gray-900">Cadastro Maestro Coral</h1>
        <p className="mt-2 text-sm text-gray-500">
          Escolha abaixo se deseja fazer o cadastro online ou baixar o aplicativo para Android.
        </p>

        <div className="mt-7 space-y-3 text-left">
          <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50">
            <button
              type="button"
              onClick={() => setInfoAberta(infoAberta === 'cadastro' ? '' : 'cadastro')}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <UserPlus className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold text-gray-900">Cadastrar</span>
                  <span className="block text-xs text-indigo-800">Maestro/Maestrina ou Membro</span>
                </span>
              </span>
              <ChevronDown className={`h-5 w-5 text-indigo-700 transition-transform ${infoAberta === 'cadastro' ? 'rotate-180' : ''}`} />
            </button>

            {infoAberta === 'cadastro' && (
              <div className="border-t border-indigo-100 bg-white px-4 py-4">
                <p className="text-sm text-gray-600">
                  Use essa opção para criar sua conta ou entrar. Depois você escolhe se vai cadastrar um coral como Maestro/Maestrina ou entrar como Membro em um coral existente.
                </p>
                <Link
                  to="/login?from_url=/onboarding&mode=register"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  <Globe2 className="h-5 w-5" />
                  Abrir cadastro
                </Link>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-purple-100 bg-purple-50">
            <button
              type="button"
              onClick={() => setInfoAberta(infoAberta === 'apk' ? '' : 'apk')}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white">
                  <Download className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold text-gray-900">Baixar APK</span>
                  <span className="block text-xs text-purple-800">Somente para celular Android</span>
                </span>
              </span>
              <ChevronDown className={`h-5 w-5 text-purple-700 transition-transform ${infoAberta === 'apk' ? 'rotate-180' : ''}`} />
            </button>

            {infoAberta === 'apk' && (
              <div className="border-t border-purple-100 bg-white px-4 py-4">
                <p className="text-sm text-gray-600">
                  Baixe o APK se quiser instalar o Maestro Coral no Android. Depois de instalar, você entra ou cadastra sua conta normalmente pelo aplicativo.
                </p>
                <a
                  href={APK_DOWNLOAD_URL}
                  download
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700"
                >
                  <Download className="h-5 w-5" />
                  Baixar APK para Android
                </a>
              </div>
            )}
          </section>
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
