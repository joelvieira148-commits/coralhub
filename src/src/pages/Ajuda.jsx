import { useState } from 'react';
import { ChevronDown, ChevronUp, LogIn, Mic2, Music } from 'lucide-react';
import { Link } from 'react-router-dom';

const faqs = [
  {
    categoria: 'Primeiros Passos',
    icon: LogIn,
    itens: [
      {
        pergunta: 'Como faço para criar minha conta?',
        resposta: 'Clique em "Entrar / Cadastrar" na página inicial e use seu e-mail e senha. No primeiro acesso, você escolhe se vai entrar como Maestro/Maestrina ou como Membro.',
      },
      {
        pergunta: 'Devo escolher Maestro ou Membro?',
        resposta: 'Escolha Maestro/Maestrina se você vai criar e administrar um coral. Escolha Membro se você vai participar de um coral já cadastrado para acessar músicas, partituras e áudios do seu naipe.',
      },
      {
        pergunta: 'Posso mudar meu tipo de cadastro depois?',
        resposta: 'Se precisar mudar de Maestro para Membro, ou de Membro para Maestro, fale com o administrador para ajustar seu cadastro.',
      },
    ],
  },
  {
    categoria: 'Para Maestros',
    icon: Music,
    itens: [
      {
        pergunta: 'Como adiciono músicas ao coral?',
        resposta: 'Acesse a página "Música" e toque em "Nova Música". Você pode enviar a partitura em PDF ou imagem, além dos áudios separados por naipe.',
      },
      {
        pergunta: 'Como gerencio os membros do meu coral?',
        resposta: 'Acesse a página "Membros" para ver os integrantes organizados por naipe. Você pode editar nome, telefone, endereço, e-mail, voz e função de cada membro.',
      },
      {
        pergunta: 'Como personalizo a imagem do coral?',
        resposta: 'Vá em "Configurações" para alterar nome, cores, logo e imagem do topo. A imagem do topo aparece no cabeçalho onde fica o nome do coral.',
      },
      {
        pergunta: 'Por que meu coral precisa de aprovação?',
        resposta: 'A aprovação é necessária apenas para Maestro ou Maestrina que está criando uma nova plataforma de coral. Depois de aprovado pelo admin, o coral fica liberado para os membros escolherem no cadastro.',
      },
    ],
  },
  {
    categoria: 'Para Membros',
    icon: Mic2,
    itens: [
      {
        pergunta: 'Como entro em um coral?',
        resposta: 'No primeiro acesso, escolha "Sou Membro", preencha seus dados e selecione o nome do coral na lista. O coral precisa estar aprovado para aparecer.',
      },
      {
        pergunta: 'Como ouço o áudio do meu naipe?',
        resposta: 'Acesse "Música", abra uma música e toque no botão de play do áudio do seu naipe. O player fica fixo para você pausar, avançar, voltar ou repetir.',
      },
      {
        pergunta: 'Posso ver e baixar partituras?',
        resposta: 'Sim. Ao abrir uma música, você pode visualizar a partitura dentro da página. Quando permitido pelo maestro, também aparece a opção de baixar.',
      },
    ],
  },
];

export default function Ajuda() {
  const [abertos, setAbertos] = useState({});

  const toggle = (key) => setAbertos((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
          <Music className="w-6 h-6" />
          <span className="text-lg font-bold">Maestro Coral</span>
        </Link>
        <Link
          to="/"
          className="text-white/70 hover:text-white text-sm transition-colors"
        >
          Voltar
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Central de Ajuda</h1>
          <p className="text-white/60 text-lg">Encontre respostas para as principais dúvidas sobre o Maestro Coral.</p>
        </div>

        <div className="space-y-8">
          {faqs.map(({ categoria, icon: Icon, itens }) => (
            <div key={categoria}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5 text-white/70" />
                <h2 className="text-white font-semibold text-lg">{categoria}</h2>
              </div>
              <div className="space-y-2">
                {itens.map((item, index) => {
                  const key = `${categoria}-${index}`;
                  const open = abertos[key];

                  return (
                    <div key={key} className="bg-white/10 backdrop-blur rounded-2xl overflow-hidden">
                      <button
                        type="button"
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

        <div className="mt-12 bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
          <h3 className="text-white font-semibold mb-2">Não encontrou o que precisava?</h3>
          <p className="text-white/60 text-sm mb-4">Entre em contato pelo WhatsApp para tirar dúvidas sobre cadastro e uso da plataforma.</p>
          <a
            href="https://wa.me/5581985511614"
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-white text-indigo-700 font-semibold px-6 py-2.5 rounded-full hover:bg-indigo-50 transition-colors text-sm"
          >
            Falar no WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
