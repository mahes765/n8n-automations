insert into public.subscription_plans (name, price, duration_days)
values
  ('7 Hari', 10000, 7),
  ('30 Hari', 25000, 30),
  ('3 Bulan', 50000, 90)
on conflict (name) do update set
  price = excluded.price,
  duration_days = excluded.duration_days;
