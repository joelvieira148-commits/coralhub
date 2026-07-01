-- Use no Supabase SQL Editor depois de desligar "Confirm email".
-- Isso libera contas criadas antes da mudanca e que ficaram aguardando confirmacao.

update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmation_token = '',
  updated_at = now()
where email_confirmed_at is null;

-- Se quiser liberar somente um e-mail, use este modelo no lugar do comando acima:
-- update auth.users
-- set
--   email_confirmed_at = coalesce(email_confirmed_at, now()),
--   confirmation_token = '',
--   updated_at = now()
-- where lower(email) = lower('seu-email@exemplo.com');
