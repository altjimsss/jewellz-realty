-- ===========================================================================
-- FIX: developer_partners RLS policy violation
-- ===========================================================================
-- Error: new row violates row-level security policy for table "developer_partners"
--
-- Root cause:
--   The developer_partners table has Row Level Security (RLS) enabled, but
--   the legacy rbac-policies.sql only defined policies for "developer_companies".
--   As a result, authenticated admins attempting to insert or update developer
--   partners via the CMS were rejected by PostgreSQL.
--
-- Instructions:
--   Copy and paste this script into your Supabase project's SQL Editor and click RUN.
-- ===========================================================================

ALTER TABLE public.developer_partners ENABLE ROW LEVEL SECURITY;

-- 1. Read access: Active partners are visible publicly (for marquee, public catalog),
--    and authenticated staff/admins can view all developer partners.
DROP POLICY IF EXISTS "developer_partners_read" ON public.developer_partners;
DROP POLICY IF EXISTS "developer_partners_public_read" ON public.developer_partners;
DROP POLICY IF EXISTS "dev_partners_read" ON public.developer_partners;

CREATE POLICY "developer_partners_read" ON public.developer_partners
  FOR SELECT
  USING (
    is_active = TRUE
    OR auth.role() = 'authenticated'
  );

-- 2. Admin full access (INSERT, UPDATE, DELETE, SELECT)
--    Checks profiles table role or JWT metadata to ensure admin privileges.
DROP POLICY IF EXISTS "developer_partners_admin_all" ON public.developer_partners;
DROP POLICY IF EXISTS "dev_partners_admin_all" ON public.developer_partners;

CREATE POLICY "developer_partners_admin_all" ON public.developer_partners
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.is_active = TRUE
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.is_active = TRUE
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 3. Developer self-management: Assigned developer partner can update their own profile / logo.
DROP POLICY IF EXISTS "developer_partners_self_update" ON public.developer_partners;
DROP POLICY IF EXISTS "dev_partners_self_update" ON public.developer_partners;

CREATE POLICY "developer_partners_self_update" ON public.developer_partners
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
