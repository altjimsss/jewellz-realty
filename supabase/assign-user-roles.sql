-- =============================================================================
-- JEWELLZ REALTY -- ASSIGN ROLES TO EXISTING AUTH USERS
-- Pulls email from auth.users so no NOT NULL violations occur.
-- Safe to run multiple times.
-- =============================================================================

-- Upsert profiles for the 4 existing auth users, pulling email from auth.users
INSERT INTO public.profiles (id, full_name, email, role, is_active)
SELECT
  u.id,
  display_name,
  u.email,
  assigned_role::public.user_role,
  TRUE
FROM auth.users u
JOIN (VALUES
  ('15542974-946d-40d3-b499-c12b7ad911e4'::uuid, 'Allen James',       'admin'),
  ('d59071ca-3315-4ef1-8913-c1951607a55b'::uuid, 'Allen James',       'agent'),
  ('08f955ff-81d8-4286-b2fb-3ef22d4e3735'::uuid, 'Playwright Admin',  'developer_partner'),
  ('5973d1ef-4f1e-4fc2-8d04-b9ad4c5f4d00'::uuid, 'Playwright Admin',  'admin')
) AS assignments(uid, display_name, assigned_role)
  ON u.id = assignments.uid
ON CONFLICT (id) DO UPDATE
  SET
    role      = EXCLUDED.role,
    is_active = TRUE,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);

-- Verify: show all profiles with their roles and emails
SELECT
  p.id,
  p.full_name,
  p.role,
  p.is_active,
  u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.role, u.email;
