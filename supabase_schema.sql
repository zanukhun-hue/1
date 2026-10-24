-- Supabase SQL Editor → вставить весь файл и нажать Run.
-- Повторный запуск сохраняет данные. Выполнять от имени владельца базы.
-- Каталог плагинов хранится в plugins.js, а не в этих таблицах.
begin;

create extension if not exists pgcrypto;

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  visitor_hash text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.plugin_reports (
  id uuid primary key default gen_random_uuid(),
  plugin_id text not null,
  plugin_name text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.plugin_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_url text,
  comment text,
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('plugin_view', 'download', 'edit_view')),
  plugin_id text,
  edit_id uuid,
  path text,
  visitor_hash text,
  created_at timestamptz not null default now()
);

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

alter table public.site_visits enable row level security;
alter table public.plugin_reports enable row level security;
alter table public.plugin_requests enable row level security;
alter table public.site_events enable row level security;
alter table public.edit_submissions enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on table public.site_visits, public.plugin_reports,
  public.plugin_requests, public.site_events, public.edit_submissions
  from anon, authenticated;
grant select, insert on public.site_visits, public.site_events,
  public.edit_submissions to anon, authenticated;
grant insert on public.plugin_reports, public.plugin_requests to anon, authenticated;
grant usage on schema public to service_role;
grant all on table public.site_visits, public.plugin_reports,
  public.plugin_requests, public.site_events, public.edit_submissions to service_role;

-- Статистика остаётся публичной, как в исходной схеме проекта.
drop policy if exists "Public can insert site visits" on public.site_visits;
drop policy if exists "Public can read site visits" on public.site_visits;
create policy "Public can insert site visits" on public.site_visits
for insert to anon, authenticated
with check (length(path) <= 300 and length(visitor_hash) <= 120);
create policy "Public can read site visits" on public.site_visits
for select to anon, authenticated using (true);

drop policy if exists "Public can submit plugin reports" on public.plugin_reports;
drop policy if exists "Public can request plugins" on public.plugin_requests;
drop policy if exists "Public can insert site events" on public.site_events;
drop policy if exists "Public can read site events" on public.site_events;
create policy "Public can submit plugin reports" on public.plugin_reports
for insert to anon, authenticated with check (status = 'pending');
create policy "Public can request plugins" on public.plugin_requests
for insert to anon, authenticated with check (status = 'pending');
create policy "Public can insert site events" on public.site_events
for insert to anon, authenticated
with check (event_type in ('plugin_view', 'download', 'edit_view'));
create policy "Public can read site events" on public.site_events
for select to anon, authenticated using (true);

-- Удаляем старые политики, если они уже были созданы.
drop policy if exists "Anyone can submit pending edits" on public.edit_submissions;
drop policy if exists "Anyone can read approved edits" on public.edit_submissions;
drop policy if exists "Public can submit pending edits" on public.edit_submissions;
drop policy if exists "Public can read approved edits" on public.edit_submissions;
drop policy if exists "Public can read own pending edits" on public.edit_submissions;
drop policy if exists "Public can cancel pending edits" on public.edit_submissions;

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

-- У заявок нет привязки к авторизованному владельцу: pending не публикуем,
-- а UPDATE для посетителей не выдаём. Модерация выполняется серверным ключом.
create index if not exists site_visits_created_idx
  on public.site_visits (created_at desc);
create index if not exists site_visits_path_created_idx
  on public.site_visits (path, created_at desc);
create index if not exists site_visits_visitor_idx
  on public.site_visits (visitor_hash, created_at desc);
create index if not exists plugin_reports_status_created_idx
  on public.plugin_reports (status, created_at desc);
create index if not exists plugin_requests_status_created_idx
  on public.plugin_requests (status, created_at desc);
create index if not exists site_events_plugin_idx
  on public.site_events (event_type, plugin_id, created_at desc);
create index if not exists site_events_edit_idx
  on public.site_events (event_type, edit_id, created_at desc);
create index if not exists edit_submissions_status_created_idx
  on public.edit_submissions (status, created_at desc);

-- Публичное чтение миниатюр; загрузка/изменение объектов этим не разрешается.
insert into storage.buckets (id, name, public)
values ('thumbs', 'thumbs', true)
on conflict (id) do update set public = true;

commit;
