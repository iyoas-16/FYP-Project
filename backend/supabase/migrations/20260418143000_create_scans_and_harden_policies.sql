CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  hostname TEXT NOT NULL,
  inferred_target TEXT NOT NULL DEFAULT 'Other',
  result public.detection_result NOT NULL,
  confidence_score REAL NOT NULL,
  detection_method TEXT NOT NULL DEFAULT 'ml',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_scans_user_created
  ON public.scans(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_scans_result_created
  ON public.scans(result, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scans_created
  ON public.scans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scans_url_trgm
  ON public.scans
  USING gin (url gin_trgm_ops);

DROP POLICY IF EXISTS "users read own scans" ON public.scans;
CREATE POLICY "users read own scans" ON public.scans
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own scans" ON public.scans;
CREATE POLICY "users insert own scans" ON public.scans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "auth read cache" ON public.url_cache;
DROP POLICY IF EXISTS "auth insert cache" ON public.url_cache;
DROP POLICY IF EXISTS "auth update cache" ON public.url_cache;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
