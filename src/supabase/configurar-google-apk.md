# Configurar Google no APK com Supabase

O APK usa este retorno depois do login Google:

```text
coralhub://auth/callback
```

Se esse retorno nao estiver liberado no Supabase, o Google autentica e o app volta para a tela de login em vez de abrir o cadastro de Maestro/Membro.

## 1. Supabase

Entre no projeto Supabase:

```text
https://supabase.com/dashboard/project/xaerweeqwmuvvlaybyaw
```

Abra:

```text
Authentication > URL Configuration
```

Em **Redirect URLs** ou **Additional Redirect URLs**, adicione:

```text
coralhub://auth/callback
```

Se tambem for usar no navegador/Vercel, adicione tambem a URL do site:

```text
https://SEU-SITE-VERCEL.vercel.app/api/apps/auth/final-callback
```

## 2. Google Provider no Supabase

Abra:

```text
Authentication > Providers > Google
```

Confira:

```text
Google enabled: ligado
Client ID: preenchido
Client Secret: preenchido
```

## 3. Google Cloud

No Google Cloud, o URI autorizado do OAuth deve ser o callback do Supabase:

```text
https://xaerweeqwmuvvlaybyaw.supabase.co/auth/v1/callback
```

Nao coloque `coralhub://auth/callback` no Google Cloud. Esse link fica no Supabase, em Redirect URLs.

## 4. Depois de salvar

Feche o app, abra de novo e toque em:

```text
Entrar com Google
```

Se a conta nao tiver coral ou membro, ela deve abrir o cadastro de Maestro/Maestrina ou Membro.
