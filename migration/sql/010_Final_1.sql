-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.instagram_profiles_cache (
  id bigint NOT NULL DEFAULT nextval('instagram_profiles_cache_id_seq'::regclass),
  username text NOT NULL UNIQUE,
  profile_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  usage_count integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT instagram_profiles_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.medsos_analysis_results (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  request_id bigint NOT NULL UNIQUE,
  summary text,
  sentiment_label text,
  sentiment_score numeric,
  sentiment_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  engagement_score numeric,
  engagement_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience_insight jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  charts_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload jsonb,
  model_version text,
  generated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT medsos_analysis_results_pkey PRIMARY KEY (id),
  CONSTRAINT medsos_analysis_results_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.medsos_requests(id)
);
CREATE TABLE public.medsos_artifacts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  request_id bigint NOT NULL,
  artifact_type USER-DEFINED NOT NULL,
  storage_provider text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  checksum text,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT medsos_artifacts_pkey PRIMARY KEY (id),
  CONSTRAINT medsos_artifacts_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.medsos_requests(id)
);
CREATE TABLE public.medsos_entitlements (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  transaction_id bigint NOT NULL UNIQUE,
  package_id bigint NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending_payment'::medsos_entitlement_status,
  quota_total integer NOT NULL CHECK (quota_total > 0),
  quota_used integer NOT NULL DEFAULT 0 CHECK (quota_used >= 0),
  activated_at timestamp with time zone,
  expires_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  product_type text,
  CONSTRAINT medsos_entitlements_pkey PRIMARY KEY (id),
  CONSTRAINT medsos_entitlements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT medsos_entitlements_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT medsos_entitlements_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.medsos_packages(id)
);
CREATE TABLE public.medsos_packages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  financial_plan_id bigint UNIQUE,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  quota_limit integer NOT NULL CHECK (quota_limit > 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  purchase_type text NOT NULL DEFAULT 'one_time'::text CHECK (purchase_type = 'one_time'::text),
  CONSTRAINT medsos_packages_pkey PRIMARY KEY (id),
  CONSTRAINT medsos_packages_financial_plan_id_fkey FOREIGN KEY (financial_plan_id) REFERENCES public.subscription_plans(id)
);
CREATE TABLE public.medsos_request_events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  request_id bigint NOT NULL,
  event_type text NOT NULL,
  step_name text,
  status USER-DEFINED,
  message text,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT medsos_request_events_pkey PRIMARY KEY (id),
  CONSTRAINT medsos_request_events_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.medsos_requests(id)
);
CREATE TABLE public.medsos_requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  entitlement_id bigint NOT NULL,
  platform USER-DEFINED NOT NULL,
  profile_url text NOT NULL,
  notes text,
  status USER-DEFINED NOT NULL DEFAULT 'queued'::medsos_request_status,
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  current_step text,
  n8n_execution_id text,
  callback_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'::text),
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  max_retries integer NOT NULL DEFAULT 3 CHECK (max_retries >= 0),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  failed_at timestamp with time zone,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ig_username text,
  apify_task_id text,
  scrape_cache_used boolean DEFAULT false,
  quota_charged boolean NOT NULL DEFAULT false,
  CONSTRAINT medsos_requests_pkey PRIMARY KEY (id),
  CONSTRAINT medsos_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT medsos_requests_entitlement_id_fkey FOREIGN KEY (entitlement_id) REFERENCES public.medsos_entitlements(id)
);
CREATE TABLE public.medsos_scrape_results (
  id bigint NOT NULL DEFAULT nextval('medsos_scrape_results_id_seq'::regclass),
  request_id text,
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'instagram'::text,
  username text NOT NULL,
  result_data jsonb NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text])),
  error_code text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT medsos_scrape_results_pkey PRIMARY KEY (id),
  CONSTRAINT medsos_scrape_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT medsos_scrape_results_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.subscription_plans (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  price integer NOT NULL CHECK (price >= 0),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  product_type text NOT NULL DEFAULT 'financial_subscription'::text,
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  plan_id bigint NOT NULL,
  transaction_id bigint,
  status USER-DEFINED NOT NULL DEFAULT 'inactive'::subscription_status,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id),
  CONSTRAINT subscriptions_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  plan_id bigint NOT NULL,
  midtrans_order_id text NOT NULL UNIQUE,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::transaction_status,
  gross_amount integer NOT NULL CHECK (gross_amount >= 0),
  payment_type text,
  settlement_time timestamp with time zone,
  raw_response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  product_type text NOT NULL DEFAULT 'financial_subscription'::text,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT transactions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id)
);
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  telegram_id text UNIQUE CHECK (telegram_id IS NULL OR telegram_id ~ '^[0-9]+$'::text),
  telegram_link_token text UNIQUE,
  telegram_link_token_expires_at timestamp with time zone,
  email_verified_at timestamp with time zone,
  password text NOT NULL,
  remember_token text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);