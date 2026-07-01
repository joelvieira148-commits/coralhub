# CoralHub

Aplicativo React/Vite para gerenciamento de corais, com membros, agenda, mural,
biblioteca de partituras e audios por naipe.

## Nuvem

O projeto usa Vercel + Supabase:

- Vercel: hospedagem do app web;
- Supabase Auth: login com Google e e-mail/senha;
- Supabase Postgres: banco de dados;
- Supabase Storage: fotos, videos, partituras e musicas em nuvem.

## Configuracao Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor do Supabase, rode o arquivo `supabase/schema.sql`.
3. Em Authentication, ative Email/Password e Google.
4. Em Authentication > URL Configuration, adicione estes redirects:

```text
http://localhost:5173/**
https://seu-app.vercel.app/**
coralhub://auth/callback
```

5. Crie o arquivo `.env.local` na raiz deste projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
VITE_SUPABASE_STORAGE_BUCKET=coralhub
```

## Configuracao Vercel

Na Vercel, configure as mesmas variaveis:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_STORAGE_BUCKET`

O arquivo `vercel.json` ja deixa o Vite funcionando como SPA.

No Google Cloud Console, o OAuth do Google tambem precisa aceitar o callback do Supabase:

```text
https://xaerweeqwmuvvlaybyaw.supabase.co/auth/v1/callback
```

Links rapidos deste projeto:

- SQL Editor: `https://supabase.com/dashboard/project/xaerweeqwmuvvlaybyaw/sql/new`
- Auth URL Configuration: `https://supabase.com/dashboard/project/xaerweeqwmuvvlaybyaw/auth/url-configuration`
- Auth Providers: `https://supabase.com/dashboard/project/xaerweeqwmuvvlaybyaw/auth/providers`

Se o Google mostrar `Unsupported provider: provider is not enabled`, abra Auth Providers,
ative Google e preencha Client ID e Client Secret criados no Google Cloud Console.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev`: inicia o servidor local do Vite
- `npm run build`: gera a versao de producao em `dist`
- `npm run lint`: valida o codigo com ESLint
- `npm run typecheck`: valida a configuracao JS/TS do projeto

## Estrutura

- `src/pages`: telas principais
- `src/components`: componentes de interface e componentes do coral
- `src/api`: cliente Supabase
- `src/lib`: contexto de autenticacao e utilitarios
- `src/hooks`: hooks compartilhados
- `src/utils`: utilitarios do dominio do coral
