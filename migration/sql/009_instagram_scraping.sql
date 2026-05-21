-- Migration: Create Instagram profiles cache table
-- Description: Store Instagram profile data cache dengan TTL

CREATE TABLE IF NOT EXISTS public.instagram_profiles_cache (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  profile_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_instagram_username ON public.instagram_profiles_cache(username);
CREATE INDEX IF NOT EXISTS idx_instagram_expires ON public.instagram_profiles_cache(expires_at);

-- Auto-delete expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_instagram_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.instagram_profiles_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.instagram_profiles_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cache
CREATE POLICY "Allow all to read ig cache" ON public.instagram_profiles_cache
  FOR SELECT USING (true);

-- Only admin can write
CREATE POLICY "Allow admin to manage ig cache" ON public.instagram_profiles_cache
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

---

-- Migration: Create medsos scrape results table
-- Description: Store history of Instagram scrape requests

CREATE TABLE IF NOT EXISTS public.medsos_scrape_results (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  username TEXT NOT NULL,
  result_data JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scrape_user_id ON public.medsos_scrape_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scrape_request_id ON public.medsos_scrape_results(request_id);
CREATE INDEX IF NOT EXISTS idx_scrape_created_at ON public.medsos_scrape_results(created_at DESC);

-- Enable RLS
ALTER TABLE public.medsos_scrape_results ENABLE ROW LEVEL SECURITY;

-- Users can only see their own results
CREATE POLICY "Users can view own scrape results" ON public.medsos_scrape_results
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own results
CREATE POLICY "Users can insert own scrape results" ON public.medsos_scrape_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can view all
CREATE POLICY "Admin can view all scrape results" ON public.medsos_scrape_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

---

-- Migration: Add ig_username column to medsos_requests (if not exists)
-- Description: Store extracted Instagram username untuk quick reference

ALTER TABLE public.medsos_requests
ADD COLUMN IF NOT EXISTS ig_username TEXT,
ADD COLUMN IF NOT EXISTS apify_task_id TEXT,
ADD COLUMN IF NOT EXISTS scrape_cache_used BOOLEAN DEFAULT FALSE;

-- Index untuk query
CREATE INDEX IF NOT EXISTS idx_medsos_ig_username 
ON public.medsos_requests(ig_username);
