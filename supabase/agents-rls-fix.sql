-- FIX: Agents show 0 in the CMS because the agents table has RLS enabled
-- but no SELECT policy, so the signed-in admin gets an empty result.
-- Paste this into the Supabase SQL Editor and press Run.

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin CMS, agents) may read the agent roster.
DROP POLICY IF EXISTS "agents_authenticated_read" ON public.agents;
CREATE POLICY "agents_authenticated_read" ON public.agents
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admins may create / edit / delete agents.
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

-- A signed-in agent may update their own row.
DROP POLICY IF EXISTS "agents_self_update" ON public.agents;
CREATE POLICY "agents_self_update" ON public.agents
  FOR UPDATE USING (profile_id = auth.uid());