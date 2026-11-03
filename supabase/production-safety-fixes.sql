-- Apply to a staging database first, then promote after the portal/RLS QA pass.
-- This script is intentionally not run automatically by the application.

BEGIN;

-- Prevent authenticated users from changing their own account role or active flag
-- through the self-update policy. Admins and service-role maintenance remain able
-- to make deliberate account changes.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.is_admin()
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
     ) THEN
    RAISE EXCEPTION 'Users cannot change their own role or active status.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_self_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_self_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Reject duplicate active requests from the same email for the same property
-- and exact time. Different customers and different properties may share a slot.
-- Null property IDs are grouped together using a UUID sentinel.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.appointments
    WHERE status IN ('requested', 'confirmed')
    GROUP BY
      lower(btrim(buyer_email)),
      COALESCE(property_id, '00000000-0000-0000-0000-000000000000'::uuid),
      scheduled_at
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Resolve duplicate active appointments with the same email, property, and time before applying the unique index.';
  END IF;
END;
$$;

-- Remove the earlier broad index if it was applied; it incorrectly blocked
-- different customers or properties from booking the same time.
DROP INDEX IF EXISTS public.appointments_one_active_request_per_slot;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_no_duplicate_customer_property_slot
  ON public.appointments (
    lower(btrim(buyer_email)),
    COALESCE(property_id, '00000000-0000-0000-0000-000000000000'::uuid),
    scheduled_at
  )
  WHERE status IN ('requested', 'confirmed');

COMMIT;
