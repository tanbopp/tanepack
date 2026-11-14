-- Phase 2 DRAFT. Do not run in Phase 1.

CREATE TYPE public.subscription_plan AS ENUM ('free', 'lite', 'pro', 'business');

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled carton',
  design_json JSONB NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase 2 RLS policies (commented out until Phase 2 auth wiring):
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "users_self_access" ON public.users
--   FOR ALL USING (auth.uid() = id);
-- CREATE POLICY "projects_owner_access" ON public.projects
--   FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "project_assets_owner_access" ON public.project_assets
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM public.projects p
--       WHERE p.id = project_assets.project_id AND p.user_id = auth.uid()
--     )
--   );
