create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  photo_url text,
  role text not null default 'user',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  owner_id uuid references auth.users(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists records_entity_idx on public.records(entity);
create index if not exists records_data_gin_idx on public.records using gin(data);
create index if not exists records_owner_idx on public.records(owner_id);

alter table public.profiles enable row level security;
alter table public.records enable row level security;

drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

create policy "profiles select own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles insert own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "records read authenticated" on public.records;
drop policy if exists "records insert authenticated" on public.records;
drop policy if exists "records update authenticated" on public.records;
drop policy if exists "records delete authenticated" on public.records;

create policy "records read authenticated"
  on public.records for select
  to authenticated
  using (true);

create policy "records insert authenticated"
  on public.records for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "records update authenticated"
  on public.records for update
  to authenticated
  using (true)
  with check (true);

create policy "records delete authenticated"
  on public.records for delete
  to authenticated
  using (true);

insert into storage.buckets (id, name, public)
values ('coralhub', 'coralhub', true)
on conflict (id) do update set public = true;

drop policy if exists "coralhub storage read" on storage.objects;
drop policy if exists "coralhub storage insert own folder" on storage.objects;
drop policy if exists "coralhub storage update own folder" on storage.objects;
drop policy if exists "coralhub storage delete own folder" on storage.objects;

create policy "coralhub storage read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'coralhub');

create policy "coralhub storage insert own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'coralhub'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "coralhub storage update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'coralhub'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'coralhub'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "coralhub storage delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'coralhub'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
