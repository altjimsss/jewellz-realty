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

-- Some existing deployments created appointments before the agent assignment
-- column was added to the newer schema.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID
  REFERENCES public.agents(id) ON DELETE SET NULL;

-- Appointment slots last 30 minutes. Check existing customer/agent overlaps
-- before installing the conflict trigger so any old conflicts can be resolved.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.appointments b
      ON a.id < b.id
     AND a.status IN ('requested', 'confirmed')
     AND b.status IN ('requested', 'confirmed')
     AND a.scheduled_at < b.scheduled_at + INTERVAL '30 minutes'
     AND b.scheduled_at < a.scheduled_at + INTERVAL '30 minutes'
    LEFT JOIN public.properties a_property ON a_property.id = a.property_id
    LEFT JOIN public.properties b_property ON b_property.id = b.property_id
    LEFT JOIN public.inquiries a_inquiry ON a_inquiry.id = a.inquiry_id
    LEFT JOIN public.inquiries b_inquiry ON b_inquiry.id = b.inquiry_id
    WHERE lower(btrim(a.buyer_email)) = lower(btrim(b.buyer_email))
       OR (
         COALESCE(a.assigned_agent_id, a_inquiry.assigned_agent_id, a_property.assigned_agent_id) IS NOT NULL
         AND COALESCE(a.assigned_agent_id, a_inquiry.assigned_agent_id, a_property.assigned_agent_id)
             = COALESCE(b.assigned_agent_id, b_inquiry.assigned_agent_id, b_property.assigned_agent_id)
       )
  ) THEN
    RAISE EXCEPTION 'Resolve existing customer or agent appointment overlaps before applying the schedule conflict guard.';
  END IF;
END;
$$;

-- Serialize booking writes by customer and assigned agent. This closes the
-- race where two simultaneous requests both pass an application pre-check.
CREATE OR REPLACE FUNCTION public.prevent_appointment_schedule_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_lock BIGINT;
  agent_lock BIGINT;
  property_lock BIGINT;
  inquiry_agent_id UUID;
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    property_lock := hashtextextended('appointment-property:' || NEW.property_id::text, 0);
    PERFORM pg_advisory_xact_lock(property_lock);
  END IF;

  -- Public booking requests inherit the property's assigned agent. This makes
  -- overlapping appointments visible to the same-agent conflict check.
  IF NEW.assigned_agent_id IS NULL AND NEW.inquiry_id IS NOT NULL THEN
    SELECT i.assigned_agent_id
      INTO inquiry_agent_id
      FROM public.inquiries i
     WHERE i.id = NEW.inquiry_id;
    NEW.assigned_agent_id := inquiry_agent_id;
  END IF;

  IF NEW.assigned_agent_id IS NULL AND NEW.property_id IS NOT NULL THEN
    SELECT p.assigned_agent_id
      INTO NEW.assigned_agent_id
      FROM public.properties p
     WHERE p.id = NEW.property_id;
  END IF;

  IF NEW.status NOT IN ('requested', 'confirmed') THEN
    RETURN NEW;
  END IF;

  customer_lock := hashtextextended('appointment-customer:' || lower(btrim(NEW.buyer_email)), 0);
  IF NEW.assigned_agent_id IS NOT NULL THEN
    agent_lock := hashtextextended('appointment-agent:' || NEW.assigned_agent_id::text, 0);
  END IF;

  -- Acquire both resource locks in a stable order to avoid deadlocks.
  IF agent_lock IS NULL THEN
    PERFORM pg_advisory_xact_lock(customer_lock);
  ELSIF customer_lock < agent_lock THEN
    PERFORM pg_advisory_xact_lock(customer_lock);
    PERFORM pg_advisory_xact_lock(agent_lock);
  ELSIF agent_lock < customer_lock THEN
    PERFORM pg_advisory_xact_lock(agent_lock);
    PERFORM pg_advisory_xact_lock(customer_lock);
  ELSE
    PERFORM pg_advisory_xact_lock(customer_lock);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id IS DISTINCT FROM NEW.id
      AND a.status IN ('requested', 'confirmed')
      AND lower(btrim(a.buyer_email)) = lower(btrim(NEW.buyer_email))
      AND a.scheduled_at < NEW.scheduled_at + INTERVAL '30 minutes'
      AND NEW.scheduled_at < a.scheduled_at + INTERVAL '30 minutes'
  ) THEN
    RAISE EXCEPTION 'Customer already has an overlapping active appointment.'
      USING ERRCODE = '23P01';
  END IF;

  IF NEW.assigned_agent_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.appointments a
    LEFT JOIN public.inquiries i ON i.id = a.inquiry_id
    LEFT JOIN public.properties p ON p.id = a.property_id
    WHERE a.id IS DISTINCT FROM NEW.id
      AND a.status IN ('requested', 'confirmed')
      AND COALESCE(a.assigned_agent_id, i.assigned_agent_id, p.assigned_agent_id) = NEW.assigned_agent_id
      AND a.scheduled_at < NEW.scheduled_at + INTERVAL '30 minutes'
      AND NEW.scheduled_at < a.scheduled_at + INTERVAL '30 minutes'
  ) THEN
    RAISE EXCEPTION 'Assigned agent already has an overlapping active appointment.'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

-- Assigning an agent to a property must also validate existing active viewings
-- for that property against the agent's other property schedules.
CREATE OR REPLACE FUNCTION public.prevent_property_agent_schedule_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_agent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.assigned_agent_id IS NOT DISTINCT FROM OLD.assigned_agent_id THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('appointment-property:' || NEW.id::text, 0)
  );
  PERFORM pg_advisory_xact_lock(
    hashtextextended('appointment-agent:' || NEW.assigned_agent_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.appointments candidate
    JOIN public.appointments other
      ON candidate.id <> other.id
     AND candidate.status IN ('requested', 'confirmed')
     AND other.status IN ('requested', 'confirmed')
     AND candidate.scheduled_at < other.scheduled_at + INTERVAL '30 minutes'
     AND other.scheduled_at < candidate.scheduled_at + INTERVAL '30 minutes'
    LEFT JOIN public.inquiries candidate_inquiry ON candidate_inquiry.id = candidate.inquiry_id
    LEFT JOIN public.inquiries other_inquiry ON other_inquiry.id = other.inquiry_id
    LEFT JOIN public.properties other_property ON other_property.id = other.property_id
    WHERE candidate.property_id = NEW.id
      AND COALESCE(candidate.assigned_agent_id, candidate_inquiry.assigned_agent_id, NEW.assigned_agent_id) = NEW.assigned_agent_id
      AND COALESCE(other.assigned_agent_id, other_inquiry.assigned_agent_id, other_property.assigned_agent_id) = NEW.assigned_agent_id
  ) THEN
    RAISE EXCEPTION 'Agent already has an overlapping active appointment on another property.'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

-- Admin assignment happens on the inquiry panel. Mirror it onto its active
-- appointment so the same schedule guard runs for panel assignments.
CREATE OR REPLACE FUNCTION public.sync_appointment_agent_from_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_agent_id IS NOT DISTINCT FROM OLD.assigned_agent_id THEN
    RETURN NEW;
  END IF;

  UPDATE public.appointments
     SET assigned_agent_id = NEW.assigned_agent_id,
         updated_at = NOW()
   WHERE inquiry_id = NEW.id
     AND status IN ('requested', 'confirmed')
     AND assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_prevent_schedule_conflicts ON public.appointments;
CREATE TRIGGER appointments_prevent_schedule_conflicts
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_appointment_schedule_conflicts();

DROP TRIGGER IF EXISTS properties_prevent_agent_schedule_conflicts ON public.properties;
CREATE TRIGGER properties_prevent_agent_schedule_conflicts
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_property_agent_schedule_conflicts();

DROP TRIGGER IF EXISTS inquiries_sync_appointment_agent ON public.inquiries;
CREATE TRIGGER inquiries_sync_appointment_agent
  AFTER UPDATE OF assigned_agent_id ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_appointment_agent_from_inquiry();

-- Backfill agent ownership for active bookings already assigned through the
-- inquiry panel or property record. The guard trigger validates every row.
UPDATE public.appointments a
   SET assigned_agent_id = COALESCE(
     (SELECT i.assigned_agent_id FROM public.inquiries i WHERE i.id = a.inquiry_id),
     (SELECT p.assigned_agent_id FROM public.properties p WHERE p.id = a.property_id)
   )
 WHERE a.status IN ('requested', 'confirmed')
   AND a.assigned_agent_id IS NULL
   AND (
     EXISTS (SELECT 1 FROM public.inquiries i WHERE i.id = a.inquiry_id AND i.assigned_agent_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.properties p WHERE p.id = a.property_id AND p.assigned_agent_id IS NOT NULL)
   );

CREATE INDEX IF NOT EXISTS appointments_active_customer_schedule_idx
  ON public.appointments (lower(btrim(buyer_email)), scheduled_at)
  WHERE status IN ('requested', 'confirmed');

CREATE INDEX IF NOT EXISTS appointments_active_agent_schedule_idx
  ON public.appointments (assigned_agent_id, scheduled_at)
  WHERE assigned_agent_id IS NOT NULL AND status IN ('requested', 'confirmed');

-- Keep appointment and dashboard inquiry rescheduling in one transaction.
-- Only the server's service-role client may call this function.
CREATE OR REPLACE FUNCTION public.reschedule_unassigned_appointment(
  p_appointment_id UUID,
  p_expected_scheduled_at TIMESTAMPTZ,
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT,
  p_scheduled_at TIMESTAMPTZ,
  p_location TEXT,
  p_notes TEXT,
  p_appointment_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_appointment_id UUID;
  linked_inquiry_id UUID;
BEGIN
  UPDATE public.appointments a
     SET scheduled_at = p_scheduled_at,
         buyer_name = p_buyer_name,
         buyer_email = lower(btrim(p_buyer_email)),
         buyer_phone = NULLIF(btrim(p_buyer_phone), ''),
         location = p_location,
         notes = p_notes,
         status = 'requested',
         updated_at = NOW()
   WHERE a.id = p_appointment_id
     AND a.scheduled_at = p_expected_scheduled_at
     AND a.status IN ('requested', 'confirmed')
     AND a.assigned_agent_id IS NULL
     AND lower(btrim(a.buyer_email)) = lower(btrim(p_buyer_email))
     AND lower(btrim(a.buyer_name)) = lower(btrim(p_buyer_name))
     AND NOT EXISTS (
       SELECT 1 FROM public.inquiries i
        WHERE i.id = a.inquiry_id
          AND i.assigned_agent_id IS NOT NULL
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.properties p
        WHERE p.id = a.property_id
          AND p.assigned_agent_id IS NOT NULL
     )
  RETURNING a.id, a.inquiry_id
       INTO updated_appointment_id, linked_inquiry_id;

  IF updated_appointment_id IS NULL THEN
    RAISE EXCEPTION 'Appointment cannot be rescheduled because it changed or has an assigned agent.'
      USING ERRCODE = '42501';
  END IF;

  IF linked_inquiry_id IS NOT NULL THEN
    BEGIN
      UPDATE public.inquiries
         SET buyer_message = p_appointment_message,
             buyer_name = p_buyer_name,
             buyer_email = lower(btrim(p_buyer_email)),
             buyer_phone = NULLIF(btrim(p_buyer_phone), '')
       WHERE id = linked_inquiry_id;
    EXCEPTION WHEN undefined_column THEN
      UPDATE public.inquiries
         SET message = p_appointment_message,
             buyer_name = p_buyer_name,
             buyer_email = lower(btrim(p_buyer_email)),
             buyer_phone = NULLIF(btrim(p_buyer_phone), '')
       WHERE id = linked_inquiry_id;
    END;
  END IF;

  RETURN jsonb_build_object(
    'appointment_id', updated_appointment_id,
    'inquiry_id', linked_inquiry_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_unassigned_appointment(
  UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_unassigned_appointment(
  UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT
) TO service_role;

-- Reject an exact duplicate request for the same email/property/time. Null
-- property IDs are grouped together; other customers may share a time slot.
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
