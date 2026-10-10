-- Empty all agent login accounts and agent records.
-- Run in Supabase SQL Editor only if you want to remove every agent account.
-- This deletes from auth.users, which cascades into public.profiles and public.agents.
-- Admin/developer accounts are not touched.

DELETE FROM auth.users u
USING public.profiles p
WHERE p.id = u.id
  AND p.role = 'agent';

-- Cleanup fallback for any orphaned agent rows whose profile/auth user was already removed.
DELETE FROM public.agents a
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = a.profile_id
);

-- Verify no agent auth/profile/agent records remain.
SELECT
  u.email,
  p.role,
  a.id AS agent_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.agents a ON a.profile_id = u.id
WHERE p.role = 'agent'
   OR a.id IS NOT NULL
ORDER BY u.email;
