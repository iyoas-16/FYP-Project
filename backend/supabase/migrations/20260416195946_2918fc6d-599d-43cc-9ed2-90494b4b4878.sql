
-- Roles enum + table (separate, to avoid recursive RLS)
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Predictions
CREATE TYPE public.detection_result AS ENUM ('phishing', 'legitimate', 'suspicious');

CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  result public.detection_result NOT NULL,
  confidence_score REAL NOT NULL,
  detection_method TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_predictions_user_created ON public.predictions(user_id, created_at DESC);

-- URL cache
CREATE TABLE public.url_cache (
  url_hash TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  result public.detection_result NOT NULL,
  confidence_score REAL NOT NULL,
  detection_method TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.url_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_url_cache_created ON public.url_cache(created_at DESC);

-- RLS policies

-- profiles
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- predictions
CREATE POLICY "users read own predictions" ON public.predictions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own predictions" ON public.predictions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read all predictions" ON public.predictions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- url_cache (any authenticated user can read & write)
CREATE POLICY "auth read cache" ON public.url_cache
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert cache" ON public.url_cache
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update cache" ON public.url_cache
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Auto-create profile + assign role on signup (first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
