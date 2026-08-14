-- Adds display/profile columns to agents (public queries and the CMS read these)
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS is_top_agent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Seeded roster entries have no login account yet, so profile_id may be NULL.
-- Agents created through the CMS Register Agent form always carry a profile_id.
ALTER TABLE public.agents
  ALTER COLUMN profile_id DROP NOT NULL;

-- RLS: authenticated users (admin CMS, agents) may read the roster.
DROP POLICY IF EXISTS "agents_authenticated_read" ON public.agents;
CREATE POLICY "agents_authenticated_read" ON public.agents
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS: admins and the service role may manage agents (register/edit/delete).
DROP POLICY IF EXISTS "agents_admin_all" ON public.agents;
CREATE POLICY "agents_admin_all" ON public.agents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.is_active = TRUE
    )
  );

-- RLS: signed-in agents may update their own row.
DROP POLICY IF EXISTS "agents_self_update" ON public.agents;
CREATE POLICY "agents_self_update" ON public.agents
  FOR UPDATE USING (profile_id = auth.uid());
