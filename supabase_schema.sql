-- Supabase SQL Editor → вставить и нажать RUN.
-- Это включает общую базу заявок на видео.
-- Посетители смогут отправлять заявки, а на сайте будут видны только записи со status = 'approved'.

create extension if not exists pgcrypto;

create table if not exists public.edit_submissions (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  platform text not null check (platform in ('youtube', 'tiktok', 'video')),
  thumb text,
  title text not null,
  author text not null,
  plugins text,
  description text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.edit_submissions enable row level security;

grant select, insert on public.edit_submissions to anon;

-- Любой посетитель может отправить только заявку на модерацию.
drop policy if exists "Anyone can submit pending edits" on public.edit_submissions;
create policy "Anyone can submit pending edits"
on public.edit_submissions
for insert
to anon
with check (status = 'pending');

-- Любой посетитель может видеть только одобренные работы.
drop policy if exists "Anyone can read approved edits" on public.edit_submissions;
create policy "Anyone can read approved edits"
on public.edit_submissions
for select
to anon
using (status = 'approved');
