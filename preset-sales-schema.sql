-- Дополнение к supabase_schema.sql. Supabase SQL Editor → Run от владельца.
-- Постоянные счета и покупки. Публичного чтения/записи нет.
begin;
create table if not exists public.preset_sales_invoices (
  payload text primary key,
  telegram_user_id bigint not null,
  chat_id bigint not null,
  pack_id text not null check (pack_id in ('shakes','color','distortion','glow','text','frames','speed','glitch','effects')),
  amount_stars integer not null check (amount_stars > 0),
  terms_version text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.preset_sales_orders (
  telegram_payment_charge_id text primary key,
  invoice_payload text not null unique references public.preset_sales_invoices(payload),
  telegram_user_id bigint not null,
  chat_id bigint not null,
  pack_id text not null check (pack_id in ('shakes','color','distortion','glow','text','frames','speed','glitch','effects')),
  amount_stars integer not null check (amount_stars > 0),
  status text not null default 'paid' check (status in ('paid','delivering','delivered','delivery_failed','refunded')),
  telegram_file_id text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.preset_sales_invoices enable row level security;
alter table public.preset_sales_orders enable row level security;
revoke all on public.preset_sales_invoices, public.preset_sales_orders from anon, authenticated;
grant all on public.preset_sales_invoices, public.preset_sales_orders to service_role;
create index if not exists preset_sales_orders_user_idx on public.preset_sales_orders (telegram_user_id,created_at desc);
create index if not exists preset_sales_invoices_expiry_idx on public.preset_sales_invoices (expires_at);
-- Архивы читаются только сервером с service_role. Публичные ссылки не нужны.
insert into storage.buckets (id,name,public) values ('paid-presets','paid-presets',false)
on conflict (id) do update set public=false;
commit;
