# CoralHub

Aplicativo React/Vite para gerenciamento de corais, com membros, agenda, mural,
biblioteca de partituras e audios por naipe.

## Nuvem

O projeto usa Vercel + Firebase:

- Vercel: hospedagem do app web;
- Firebase Authentication: login com e-mail e senha;
- Cloud Firestore: banco de dados dos corais, membros, avisos, agenda e musicas;
- Firebase Storage: fotos, videos, partituras e musicas em nuvem.

## Configuracao Firebase

1. No Firebase Console, abra o projeto `coralhub-8aed5`.
2. Em Authentication > Sign-in method, ative Email/Password.
3. Crie/ative o Cloud Firestore.
4. Crie/ative o Firebase Storage.
5. Publique as regras com o Firebase CLI ou copie os arquivos abaixo no console:

```text
firebaseconf/firestore
firebaseconf/storage.firebase
```

6. Crie o arquivo `.env.local` na raiz deste projeto:

```env
VITE_FIREBASE_API_KEY=AIzaSyAXYefCFjclmfC1-eX8XybKWuKwoFj1jmw
VITE_FIREBASE_AUTH_DOMAIN=coralhub-8aed5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=coralhub-8aed5
VITE_FIREBASE_STORAGE_BUCKET=coralhub-8aed5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1041382843109
VITE_FIREBASE_APP_ID=1:1041382843109:web:081fe941fa21759b916a0c
VITE_FIREBASE_MEASUREMENT_ID=G-H621TYSTJM
```

## Configuracao Vercel

Na Vercel, configure as mesmas variaveis:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

O arquivo `vercel.json` ja deixa o Vite funcionando como SPA, evitando erro 404 ao abrir rotas internas.

## Publicar pelo Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
npm install
npm run build
firebase deploy
```

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
- `src/api`: cliente Firebase
- `src/lib`: contexto de autenticacao e utilitarios
- `src/hooks`: hooks compartilhados
- `src/utils`: utilitarios do dominio do coral
