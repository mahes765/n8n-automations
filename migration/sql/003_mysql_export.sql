-- Jalankan di MySQL lama. Ganti path sesuai server MySQL.
-- Jika secure_file_priv aktif, pakai folder yang diizinkan MySQL.

select
  id,
  name,
  email,
  telegram_id,
  telegram_link_token,
  date_format(telegram_link_token_expires_at, '%Y-%m-%d %H:%i:%s') as telegram_link_token_expires_at,
  date_format(email_verified_at, '%Y-%m-%d %H:%i:%s') as email_verified_at,
  password,
  remember_token,
  date_format(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
  date_format(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
from users
into outfile '/tmp/users.csv'
fields terminated by ',' optionally enclosed by '"'
escaped by '"'
lines terminated by '\n';

select
  id,
  name,
  price,
  duration_days,
  date_format(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
  date_format(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
from subscription_plans
into outfile '/tmp/subscription_plans.csv'
fields terminated by ',' optionally enclosed by '"'
escaped by '"'
lines terminated by '\n';

select
  id,
  user_id,
  plan_id,
  midtrans_order_id,
  status,
  gross_amount,
  payment_type,
  date_format(settlement_time, '%Y-%m-%d %H:%i:%s') as settlement_time,
  json_unquote(json_extract(raw_response, '$')) as raw_response,
  date_format(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
  date_format(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
from transactions
into outfile '/tmp/transactions.csv'
fields terminated by ',' optionally enclosed by '"'
escaped by '"'
lines terminated by '\n';

select
  id,
  user_id,
  plan_id,
  transaction_id,
  status,
  date_format(start_date, '%Y-%m-%d %H:%i:%s') as start_date,
  date_format(end_date, '%Y-%m-%d %H:%i:%s') as end_date,
  date_format(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
  date_format(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
from subscriptions
into outfile '/tmp/subscriptions.csv'
fields terminated by ',' optionally enclosed by '"'
escaped by '"'
lines terminated by '\n';
