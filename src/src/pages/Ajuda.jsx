import { useState } from 'react';
import { ChevronDown, ChevronUp, Music, LogIn, Mic2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const faqs = [
  {
    categoria: 'Primeiros Passos',
    icon: LogIn,
    itens: [
      {
        pergunta: 'Como faÃ§o para criar minha conta?',
        resposta: 'Clique em "Entrar / Cadastrar" na pagina inicial e use seu e-mail e senha. Na primeira entrada, voce escolhe se vai cadastrar Maestro/Maestrina ou Membro.'
      },
      {
        pergunta: 'Sou Maestro ou Membro? Qual escolher?',
        resposta: 'Escolha Maestro se vocÃª vai criar e gerenciar um coral â€” vocÃª poderÃ¡ cadastrar membros, fazer uploads de mÃºsicas e personalizar o visual. Escolha Membro se vocÃª vai participar de um coral jÃ¡ existente, acessar partituras e ouvir os Ã¡udios do seu naipe.'
      },
      {
        pergunta: 'Posso mudar de Maestro para Membro depois?',
        resposta: 'Por enquanto, o perfil Ã© definido no primeiro acesso. Se precisar alterar, entre em contato com o suporte.'
      },
    ]
  },
  {
    categoria: 'Para Maestros',
    icon: Music,
    itens: [
      {
        pergunta: 'Como adiciono mÃºsicas ao coral?',
        resposta: 'Acesse a pÃ¡gina "Biblioteca" e clique em "Nova MÃºsica". VocÃª pode subir a partitura em PDF e Ã¡udios separados para cada naipe (Soprano, Contralto, Tenor, BarÃ­tono, Baixo).'
      },
      {
        pergunta: 'Como gerencio os membros do meu coral?',
        resposta: 'Acesse a pÃ¡gina "Membros" para ver todos os integrantes organizados por naipe. VocÃª pode editar o nome, telefone e naipe de cada membro, alÃ©m de removÃª-los se necessÃ¡rio.'
      },
      {
        pergunta: 'Como personalizo as cores e logo do coral?',
        resposta: 'VÃ¡ em "ConfiguraÃ§Ãµes" e escolha entre as paletas de cores prÃ©-definidas ou insira cÃ³digos de cor personalizados. VocÃª tambÃ©m pode fazer upload da logo e de uma imagem de capa.'
      },
    ]
  },
  {
    categoria: 'Para Membros',
    icon: Mic2,
    itens: [
      {
        pergunta: 'Como entro em um coral?',
        resposta: 'No primeiro acesso, escolha "Sou Membro", preencha seus dados e selecione o coral na lista. O maestro jÃ¡ deve ter criado o coral para que ele apareÃ§a na lista.'
      },
      {
        pergunta: 'Como ouÃ§o o Ã¡udio do meu naipe?',
        resposta: 'Acesse a Biblioteca, clique em "Abrir" em qualquer mÃºsica e vocÃª verÃ¡ players de Ã¡udio separados para cada naipe. Basta clicar no botÃ£o play do seu naipe.'
      },
      {
        pergunta: 'Posso baixar as partituras?',
        resposta: 'Sim! Ao abrir uma mÃºsica na Biblioteca, vocÃª verÃ¡ o botÃ£o "Baixar" ao lado da partitura. Os Ã¡udios tambÃ©m tÃªm botÃ£o de download.'
      },
    ]
  },
];

export default function Ajuda() {
  const [abertos, setAbertos] = useState({});

  const toggle = (key) => setAbertos(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
          <Music className="w-6 h-6" />
          <span className="text-lg font-bold">CoralHub</span>
        </Link>
        <Link
          to="/"
          className="text-white/70 hover:text-white text-sm transition-colors"
        >
          â† Voltar
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Central de Ajuda</h1>
          <p className="text-white/60 text-lg">Encontre respostas para as principais dÃºvidas sobre o CoralHub.</p>
        </div>

        {/* FAQ sections */}
        <div className="space-y-8">
          {faqs.map(({ categoria, icon: Icon, itens }) => (
            <div key={categoria}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-white/70" />
                <h2 className="text-white font-semibold text-lg">{categoria}</h2>
              </div>
              <div className="space-y-2">
                {itens.map((item, i) => {
                  const key = `${categoria}-${i}`;
                  const open = abertos[key];
                  return (
                    <div key={key} className="bg-white/10 backdrop-blur rounded-2xl overflow-hidden">
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-white/5 transition-colors"
                      >
                        <span className="text-white font-medium text-sm">{item.pergunta}</span>
                        {open
                          ? <ChevronUp className="w-4 h-4 text-white/50 flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-white/50 flex-shrink-0" />}
                      </button>
                      {open && (
                        <div className="px-5 pb-4">
                          <p className="text-white/70 text-sm leading-relaxed">{item.resposta}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-12 bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
          <h3 className="text-white font-semibold mb-2">NÃ£o encontrou o que precisava?</h3>
          <p className="text-white/60 text-sm mb-4">Entre em contato com o suporte pelo email abaixo.</p>
          <a
            href="mailto:suporte@coralhub.com"
            className="inline-block bg-white text-indigo-700 font-semibold px-6 py-2.5 rounded-full hover:bg-indigo-50 transition-colors text-sm"
          >
            suporte@coralhub.com
          </a>
        </div>
      </main>
    </div>
  );
}