-- SADIKH SERVICES / SEN POULAILLER
-- À exécuter uniquement dans le NOUVEAU projet Supabase SEN POULAILLER.
create extension if not exists pgcrypto;

create table if not exists public.farm_entries (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null check (module in ('lots','sales','expenses','deaths','vaccines','stock','customers')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.farm_entries enable row level security;

drop policy if exists "Users read own farm entries" on public.farm_entries;
create policy "Users read own farm entries"
on public.farm_entries for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users insert own farm entries" on public.farm_entries;
create policy "Users insert own farm entries"
on public.farm_entries for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own farm entries" on public.farm_entries;
create policy "Users update own farm entries"
on public.farm_entries for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own farm entries" on public.farm_entries;
create policy "Users delete own farm entries"
on public.farm_entries for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists farm_entries_user_module_idx
on public.farm_entries(user_id, module);
