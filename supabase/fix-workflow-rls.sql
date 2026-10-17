-- Fix RLS for the inquiry workflow + developer portfolio access.
--
-- Root causes addressed:
--   1. inquiry_timeline had RLS enabled with NO policies  -> all timeline reads/writes
--      were denied, so agents/admins could not log or view stage transitions.
--   2. agent_assignments had RLS enabled with NO policies -> admin assignment inserts failed.
--   3. projects had RLS enabled with NO policies         -> admins and developers could not read projects.
--   4. properties_developer_own joined developer_companies (a legacy, empty table) instead of
--      developer_partners (the table the app + FKs actually use), so developers never saw their units.
--
-- Safe to re-run: every policy is dropped before being created.

-- ---------------------------------------------------------------------------
-- 1. inquiry_timeline
-- ---------------------------------------------------------------------------
ALTER TABLE public.inquiry_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiry_timeline_admin_all"      ON public.inquiry_timeline;
DROP POLICY IF EXISTS "inquiry_timeline_agent_read"     ON public.inquiry_timeline;
DROP POLICY IF EXISTS "inquiry_timeline_agent_insert"   ON public.inquiry_timeline;
DROP POLICY IF EXISTS "inquiry_timeline_developer_read" ON public.inquiry_timeline;
DROP POLICY IF EXISTS "inquiry_timeline_buyer_read"     ON public.inquiry_timeline;

CREATE POLICY "inquiry_timeline_admin_all" ON public.inquiry_timeline
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "inquiry_timeline_agent_read" ON public.inquiry_timeline
  FOR SELECT
  USING (
    public.is_agent()
    AND inquiry_id IN (
      SELECT i.id FROM public.inquiries i
      WHERE i.assigned_agent_id = public.current_agent_id()
    )
  );

CREATE POLICY "inquiry_timeline_agent_insert" ON public.inquiry_timeline
  FOR INSERT
  WITH CHECK (
    public.is_agent()
    AND inquiry_id IN (
      SELECT i.id FROM public.inquiries i
      WHERE i.assigned_agent_id = public.current_agent_id()
    )
  );

CREATE POLICY "inquiry_timeline_developer_read" ON public.inquiry_timeline
  FOR SELECT
  USING (
    public.is_developer_partner()
    AND inquiry_id IN (
      SELECT i.id FROM public.inquiries i
      WHERE i.developer_id = public.current_developer_id()
    )
  );

CREATE POLICY "inquiry_timeline_buyer_read" ON public.inquiry_timeline
  FOR SELECT
  USING (
    inquiry_id IN (
      SELECT i.id FROM public.inquiries i
      WHERE i.buyer_profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. agent_assignments
-- ---------------------------------------------------------------------------
ALTER TABLE public.agent_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_assignments_admin_all"  ON public.agent_assignments;
DROP POLICY IF EXISTS "agent_assignments_agent_read" ON public.agent_assignments;

CREATE POLICY "agent_assignments_admin_all" ON public.agent_assignments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "agent_assignments_agent_read" ON public.agent_assignments
  FOR SELECT
  USING (public.is_agent() AND agent_id = public.current_agent_id());

-- ---------------------------------------------------------------------------
-- 3. projects
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_admin_all"      ON public.projects;
DROP POLICY IF EXISTS "projects_developer_own"  ON public.projects;
DROP POLICY IF EXISTS "projects_public_read"    ON public.projects;

CREATE POLICY "projects_admin_all" ON public.projects
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_developer_own" ON public.projects
  FOR ALL
  USING (
    public.is_developer_partner()
    AND developer_id IN (
      SELECT dp.id FROM public.developer_partners dp WHERE dp.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_developer_partner()
    AND developer_id IN (
      SELECT dp.id FROM public.developer_partners dp WHERE dp.profile_id = auth.uid()
    )
  );

CREATE POLICY "projects_public_read" ON public.projects
  FOR SELECT
  USING (is_active = true);

-- ---------------------------------------------------------------------------
-- 4. properties_developer_own (point at developer_partners, not developer_companies)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "properties_developer_own" ON public.properties;

CREATE POLICY "properties_developer_own" ON public.properties
  FOR ALL
  USING (
    public.is_developer_partner()
    AND developer_id IN (
      SELECT dp.id FROM public.developer_partners dp WHERE dp.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_developer_partner()
    AND developer_id IN (
      SELECT dp.id FROM public.developer_partners dp WHERE dp.profile_id = auth.uid()
    )
  );
