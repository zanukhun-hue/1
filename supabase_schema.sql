-- Supabase SQL Editor → вставить и нажать RUN.
-- Общая база заявок на видео.
-- Посетители отправляют заявки со status = 'pending'. На сайте видны только status = 'approved'.

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

grant usage on schema public to anon, authenticated;
grant select, insert on public.edit_submissions to anon, authenticated;

-- Удаляем старые политики, если они уже были созданы.
drop policy if exists "Anyone can submit pending edits" on public.edit_submissions;
drop policy if exists "Anyone can read approved edits" on public.edit_submissions;
drop policy if exists "Public can submit pending edits" on public.edit_submissions;
drop policy if exists "Public can read approved edits" on public.edit_submissions;

-- Любой посетитель может отправить только заявку на модерацию.
create policy "Public can submit pending edits"
on public.edit_submissions
for insert
to anon, authenticated
with check (status = 'pending');

-- Любой посетитель может видеть только одобренные работы.
create policy "Public can read approved edits"
on public.edit_submissions
for select
to anon, authenticated
using (status = 'approved');
