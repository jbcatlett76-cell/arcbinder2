-- ArcBinder production persistence foundation.
-- Run in the Supabase SQL editor after enabling Authentication.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  author text not null default '',
  genre text not null default '',
  status text not null default 'Planning',
  premise text not null default '',
  target_words integer not null default 80000,
  project_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users read own projects"
on public.projects for select
using (auth.uid() = user_id);

create policy "Users create own projects"
on public.projects for insert
with check (auth.uid() = user_id);

create policy "Users update own projects"
on public.projects for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users delete own projects"
on public.projects for delete
using (auth.uid() = user_id);

create index if not exists projects_user_updated_idx on public.projects(user_id, updated_at desc);
