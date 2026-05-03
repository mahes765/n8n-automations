-- Jalankan di Supabase SQL Editor setelah upload CSV ke tabel staging.
-- Cara praktis:
-- 1. Buat tabel staging di bawah.
-- 2. Buka Table Editor Supabase, import masing-masing CSV ke tabel staging yang sesuai.
-- 3. Jalankan blok insert final di bagian bawah.

drop table if exists staging_users;
drop table if exists staging_subscription_plans;
drop table if exists staging_transactions;
drop table if exists staging_subscriptions;

create table staging_users (
  id bigint,
  name text,
  email text,
  telegram_id text,
  telegram_link_token text,
  telegram_link_token_expires_at text,
  email_verified_at text,
  password text,
  remember_token text,
  created_at text,
  updated_at text
);

create table staging_subscription_plans (
  id bigint,
  name text,
  price integer,
  duration_days integer,
  created_at text,
  updated_at text
);

create table staging_transactions (
  id bigint,
  user_id bigint,
  plan_id bigint,
  midtrans_order_id text,
  status text,
  gross_amount integer,
  payment_type text,
  settlement_time text,
  raw_response text,
  created_at text,
  updated_at text
);

create table staging_subscriptions (
  id bigint,
  user_id bigint,
  plan_id bigint,
  transaction_id bigint,
  status text,
  start_date text,
  end_date text,
  created_at text,
  updated_at text
);

-- Setelah CSV masuk ke staging, jalankan dari sini.

insert into public.users (
  id, name, email, telegram_id, telegram_link_token, telegram_link_token_expires_at,
  email_verified_at, password, remember_token, created_at, updated_at
)
select
  id,
  name,
  lower(email),
  nullif(telegram_id, ''),
  nullif(telegram_link_token, ''),
  nullif(telegram_link_token_expires_at, '')::timestamptz,
  nullif(email_verified_at, '')::timestamptz,
  password,
  nullif(remember_token, ''),
  coalesce(nullif(created_at, '')::timestamptz, now()),
  coalesce(nullif(updated_at, '')::timestamptz, now())
from staging_users
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  telegram_id = excluded.telegram_id,
  telegram_link_token = excluded.telegram_link_token,
  telegram_link_token_expires_at = excluded.telegram_link_token_expires_at,
  email_verified_at = excluded.email_verified_at,
  password = excluded.password,
  remember_token = excluded.remember_token,
  updated_at = excluded.updated_at;

insert into public.subscription_plans (id, name, price, duration_days, created_at, updated_at)
select
  id,
  name,
  price,
  duration_days,
  coalesce(nullif(created_at, '')::timestamptz, now()),
  coalesce(nullif(updated_at, '')::timestamptz, now())
from staging_subscription_plans
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  duration_days = excluded.duration_days,
  updated_at = excluded.updated_at;

insert into public.transactions (
  id, user_id, plan_id, midtrans_order_id, status, gross_amount,
  payment_type, settlement_time, raw_response, created_at, updated_at
)
select
  id,
  user_id,
  plan_id,
  midtrans_order_id,
  status::transaction_status,
  gross_amount,
  nullif(payment_type, ''),
  nullif(settlement_time, '')::timestamptz,
  case when nullif(raw_response, '') is null then null else raw_response::jsonb end,
  coalesce(nullif(created_at, '')::timestamptz, now()),
  coalesce(nullif(updated_at, '')::timestamptz, now())
from staging_transactions
on conflict (id) do update set
  user_id = excluded.user_id,
  plan_id = excluded.plan_id,
  midtrans_order_id = excluded.midtrans_order_id,
  status = excluded.status,
  gross_amount = excluded.gross_amount,
  payment_type = excluded.payment_type,
  settlement_time = excluded.settlement_time,
  raw_response = excluded.raw_response,
  updated_at = excluded.updated_at;

insert into public.subscriptions (
  id, user_id, plan_id, transaction_id, status, start_date, end_date, created_at, updated_at
)
select
  id,
  user_id,
  plan_id,
  transaction_id,
  status::subscription_status,
  nullif(start_date, '')::timestamptz,
  nullif(end_date, '')::timestamptz,
  coalesce(nullif(created_at, '')::timestamptz, now()),
  coalesce(nullif(updated_at, '')::timestamptz, now())
from staging_subscriptions
on conflict (id) do update set
  user_id = excluded.user_id,
  plan_id = excluded.plan_id,
  transaction_id = excluded.transaction_id,
  status = excluded.status,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  updated_at = excluded.updated_at;

select setval(pg_get_serial_sequence('public.users', 'id'), coalesce((select max(id) from public.users), 1), true);
select setval(pg_get_serial_sequence('public.subscription_plans', 'id'), coalesce((select max(id) from public.subscription_plans), 1), true);
select setval(pg_get_serial_sequence('public.transactions', 'id'), coalesce((select max(id) from public.transactions), 1), true);
select setval(pg_get_serial_sequence('public.subscriptions', 'id'), coalesce((select max(id) from public.subscriptions), 1), true);
