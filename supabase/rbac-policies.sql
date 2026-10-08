-- =============================================================================
-- JEWELLZ REALTY -- ROLE-BASED ACCESS CONTROL (RBAC)
-- Run this in the Supabase SQL Editor.
-- All tables except profiles/agents/properties/inquiries are wrapped in
-- DO blocks so missing tables are safely skipped instead of erroring.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- HELPER FUNCTIONS (SECURITY DEFINER avoids RLS recursion on profiles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'agent' AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_developer_partner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'developer_partner' AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'agent', 'developer_partner')
      AND is_active = TRUE
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles  [CORE - always exists]
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_self_read"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"      ON public.profiles;
CREATE POLICY "profiles_self_read"      ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_admin_read_all" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "profiles_self_update"    ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"      ON public.profiles FOR ALL    USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- agents  [CORE - always exists]
-- ---------------------------------------------------------------------------
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agents_staff_read"  ON public.agents;
DROP POLICY IF EXISTS "agents_self_update" ON public.agents;
DROP POLICY IF EXISTS "agents_admin_all"   ON public.agents;
CREATE POLICY "agents_staff_read"  ON public.agents FOR SELECT USING (public.is_staff());
CREATE POLICY "agents_self_update" ON public.agents FOR UPDATE USING (profile_id = auth.uid() AND public.is_agent());
CREATE POLICY "agents_admin_all"   ON public.agents FOR ALL    USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- properties  [CORE - always exists]
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "properties_public_read"   ON public.properties;
DROP POLICY IF EXISTS "properties_agent_read"    ON public.properties;
DROP POLICY IF EXISTS "properties_developer_own" ON public.properties;
DROP POLICY IF EXISTS "properties_admin_all"     ON public.properties;
CREATE POLICY "properties_public_read" ON public.properties FOR SELECT USING (status = 'published');
CREATE POLICY "properties_agent_read"  ON public.properties FOR SELECT USING (public.is_agent() OR public.is_admin());
CREATE POLICY "properties_admin_all"   ON public.properties FOR ALL    USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- inquiries  [CORE - always exists]
-- ---------------------------------------------------------------------------
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inquiries_public_insert" ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_agent_own"     ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_agent_update"  ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_developer_own" ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_admin_all"     ON public.inquiries;
CREATE POLICY "inquiries_public_insert" ON public.inquiries FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "inquiries_agent_own"    ON public.inquiries FOR SELECT USING (
  public.is_agent()
  AND assigned_agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid())
);
CREATE POLICY "inquiries_agent_update" ON public.inquiries FOR UPDATE USING (
  public.is_agent()
  AND assigned_agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid())
);
CREATE POLICY "inquiries_admin_all" ON public.inquiries FOR ALL USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- developer_companies  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='developer_companies') THEN
    ALTER TABLE public.developer_companies ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "dev_companies_public_read"  ON public.developer_companies';
    EXECUTE 'DROP POLICY IF EXISTS "dev_companies_staff_read"   ON public.developer_companies';
    EXECUTE 'DROP POLICY IF EXISTS "dev_companies_self_manage"  ON public.developer_companies';
    EXECUTE 'DROP POLICY IF EXISTS "dev_companies_admin_all"    ON public.developer_companies';
    EXECUTE 'CREATE POLICY "dev_companies_public_read"  ON public.developer_companies FOR SELECT USING (is_active = TRUE)';
    EXECUTE 'CREATE POLICY "dev_companies_staff_read"   ON public.developer_companies FOR SELECT USING (public.is_staff())';
    EXECUTE 'CREATE POLICY "dev_companies_self_manage"  ON public.developer_companies FOR ALL    USING (profile_id = auth.uid() AND public.is_developer_partner())';
    EXECUTE 'CREATE POLICY "dev_companies_admin_all"    ON public.developer_companies FOR ALL    USING (public.is_admin())';
    -- properties: developer can manage their own
    EXECUTE 'DROP POLICY IF EXISTS "properties_developer_own" ON public.properties';
    EXECUTE 'CREATE POLICY "properties_developer_own" ON public.properties FOR ALL USING (public.is_developer_partner() AND developer_id IN (SELECT id FROM public.developer_companies WHERE profile_id = auth.uid()))';
    -- inquiries: developer sees inquiries on their properties
    EXECUTE 'DROP POLICY IF EXISTS "inquiries_developer_own" ON public.inquiries';
    EXECUTE 'CREATE POLICY "inquiries_developer_own" ON public.inquiries FOR SELECT USING (public.is_developer_partner() AND property_id IN (SELECT p.id FROM public.properties p JOIN public.developer_companies dc ON dc.id = p.developer_id WHERE dc.profile_id = auth.uid()))';
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- developer_projects  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='developer_projects') THEN
    ALTER TABLE public.developer_projects ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "dev_projects_public_read"  ON public.developer_projects';
    EXECUTE 'DROP POLICY IF EXISTS "dev_projects_staff_read"   ON public.developer_projects';
    EXECUTE 'DROP POLICY IF EXISTS "dev_projects_self_manage"  ON public.developer_projects';
    EXECUTE 'DROP POLICY IF EXISTS "dev_projects_admin_all"    ON public.developer_projects';
    EXECUTE 'CREATE POLICY "dev_projects_public_read" ON public.developer_projects FOR SELECT USING (is_active = TRUE)';
    EXECUTE 'CREATE POLICY "dev_projects_staff_read"  ON public.developer_projects FOR SELECT USING (public.is_staff())';
    EXECUTE 'CREATE POLICY "dev_projects_admin_all"   ON public.developer_projects FOR ALL    USING (public.is_admin())';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='developer_companies') THEN
      EXECUTE 'CREATE POLICY "dev_projects_self_manage" ON public.developer_projects FOR ALL USING (public.is_developer_partner() AND developer_id IN (SELECT id FROM public.developer_companies WHERE profile_id = auth.uid()))';
    END IF;
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- gallery  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gallery') THEN
    ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "gallery_public_read" ON public.gallery';
    EXECUTE 'DROP POLICY IF EXISTS "gallery_admin_all"   ON public.gallery';
    EXECUTE 'CREATE POLICY "gallery_public_read" ON public.gallery FOR SELECT USING (TRUE)';
    EXECUTE 'CREATE POLICY "gallery_admin_all"   ON public.gallery FOR ALL    USING (public.is_admin())';
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- appointments  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='appointments') THEN
    ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "appointments_public_insert" ON public.appointments';
    EXECUTE 'DROP POLICY IF EXISTS "appointments_agent_own"     ON public.appointments';
    EXECUTE 'DROP POLICY IF EXISTS "appointments_admin_all"     ON public.appointments';
    EXECUTE 'CREATE POLICY "appointments_public_insert" ON public.appointments FOR INSERT WITH CHECK (TRUE)';
    EXECUTE 'CREATE POLICY "appointments_agent_own"     ON public.appointments FOR SELECT USING (public.is_agent() AND agent_id IN (SELECT id FROM public.agents WHERE profile_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "appointments_admin_all"     ON public.appointments FOR ALL    USING (public.is_admin())';
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- analytics_events  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analytics_events') THEN
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "analytics_events_public_insert" ON public.analytics_events';
    EXECUTE 'DROP POLICY IF EXISTS "analytics_events_staff_read"    ON public.analytics_events';
    EXECUTE 'DROP POLICY IF EXISTS "analytics_events_admin_all"     ON public.analytics_events';
    EXECUTE 'CREATE POLICY "analytics_events_public_insert" ON public.analytics_events FOR INSERT WITH CHECK (TRUE)';
    EXECUTE 'CREATE POLICY "analytics_events_staff_read"    ON public.analytics_events FOR SELECT USING (public.is_staff())';
    EXECUTE 'CREATE POLICY "analytics_events_admin_all"     ON public.analytics_events FOR ALL    USING (public.is_admin())';
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- sessions  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sessions') THEN
    ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "sessions_public_insert" ON public.sessions';
    EXECUTE 'DROP POLICY IF EXISTS "sessions_public_update" ON public.sessions';
    EXECUTE 'DROP POLICY IF EXISTS "sessions_staff_read"    ON public.sessions';
    EXECUTE 'DROP POLICY IF EXISTS "sessions_admin_all"     ON public.sessions';
    EXECUTE 'CREATE POLICY "sessions_public_insert" ON public.sessions FOR INSERT WITH CHECK (TRUE)';
    EXECUTE 'CREATE POLICY "sessions_public_update" ON public.sessions FOR UPDATE USING (TRUE)';
    EXECUTE 'CREATE POLICY "sessions_staff_read"    ON public.sessions FOR SELECT USING (public.is_staff())';
    EXECUTE 'CREATE POLICY "sessions_admin_all"     ON public.sessions FOR ALL    USING (public.is_admin())';
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- property_analytics  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='property_analytics') THEN
    ALTER TABLE public.property_analytics ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "prop_analytics_public_insert" ON public.property_analytics';
    EXECUTE 'DROP POLICY IF EXISTS "prop_analytics_staff_read"    ON public.property_analytics';
    EXECUTE 'CREATE POLICY "prop_analytics_public_insert" ON public.property_analytics FOR INSERT WITH CHECK (TRUE)';
    EXECUTE 'CREATE POLICY "prop_analytics_staff_read"    ON public.property_analytics FOR SELECT USING (public.is_staff())';
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- recommendations  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='recommendations') THEN
    ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "recommendations_public_read"   ON public.recommendations';
    EXECUTE 'DROP POLICY IF EXISTS "recommendations_public_insert" ON public.recommendations';
    EXECUTE 'DROP POLICY IF EXISTS "recommendations_public_update" ON public.recommendations';
    EXECUTE 'DROP POLICY IF EXISTS "recommendations_admin_all"     ON public.recommendations';
    EXECUTE 'CREATE POLICY "recommendations_public_read"   ON public.recommendations FOR SELECT USING (TRUE)';
    EXECUTE 'CREATE POLICY "recommendations_public_insert" ON public.recommendations FOR INSERT WITH CHECK (TRUE)';
    EXECUTE 'CREATE POLICY "recommendations_public_update" ON public.recommendations FOR UPDATE USING (TRUE)';
    EXECUTE 'CREATE POLICY "recommendations_admin_all"     ON public.recommendations FOR ALL    USING (public.is_admin())';
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- ai_analytics_reports  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_analytics_reports') THEN
    ALTER TABLE public.ai_analytics_reports ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "ai_reports_staff_read" ON public.ai_analytics_reports';
    EXECUTE 'DROP POLICY IF EXISTS "ai_reports_admin_all"  ON public.ai_analytics_reports';
    EXECUTE 'CREATE POLICY "ai_reports_staff_read" ON public.ai_analytics_reports FOR SELECT USING (public.is_staff())';
    EXECUTE 'CREATE POLICY "ai_reports_admin_all"  ON public.ai_analytics_reports FOR ALL    USING (public.is_admin())';
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- property_documents  [OPTIONAL]
-- ---------------------------------------------------------------------------
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='property_documents') THEN
    ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "prop_docs_public_read" ON public.property_documents';
    EXECUTE 'DROP POLICY IF EXISTS "prop_docs_staff_read"  ON public.property_documents';
    EXECUTE 'DROP POLICY IF EXISTS "prop_docs_admin_all"   ON public.property_documents';
    EXECUTE 'CREATE POLICY "prop_docs_public_read" ON public.property_documents FOR SELECT USING (is_public = TRUE)';
    EXECUTE 'CREATE POLICY "prop_docs_staff_read"  ON public.property_documents FOR SELECT USING (public.is_staff())';
    EXECUTE 'CREATE POLICY "prop_docs_admin_all"   ON public.property_documents FOR ALL    USING (public.is_admin())';
  END IF;
END $do$;

-- ---------------------------------------------------------------------------
-- VERIFY: list all RLS policies now active
-- ---------------------------------------------------------------------------
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
