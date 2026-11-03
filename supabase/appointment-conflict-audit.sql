-- Read-only report of overlapping active appointment pairs.
-- Run this first if production-safety-fixes.sql reports existing conflicts.
-- Appointments are treated as 30 minutes long.

SELECT
  CASE
    WHEN lower(btrim(a.buyer_email)) = lower(btrim(b.buyer_email))
     AND COALESCE(inquiry_a.assigned_agent_id, property_a.assigned_agent_id) IS NOT NULL
     AND COALESCE(inquiry_a.assigned_agent_id, property_a.assigned_agent_id)
         = COALESCE(inquiry_b.assigned_agent_id, property_b.assigned_agent_id)
      THEN 'customer_and_agent_overlap'
    WHEN lower(btrim(a.buyer_email)) = lower(btrim(b.buyer_email))
      THEN 'customer_overlap'
    ELSE 'agent_overlap'
  END AS conflict_type,
  a.id AS appointment_a_id,
  a.buyer_name AS customer_a,
  a.buyer_email AS email_a,
  COALESCE(property_a.title, a.location) AS property_a,
  COALESCE(inquiry_a.assigned_agent_id, property_a.assigned_agent_id) AS agent_a_id,
  a.scheduled_at AS starts_at_a,
  b.id AS appointment_b_id,
  b.buyer_name AS customer_b,
  b.buyer_email AS email_b,
  COALESCE(property_b.title, b.location) AS property_b,
  COALESCE(inquiry_b.assigned_agent_id, property_b.assigned_agent_id) AS agent_b_id,
  b.scheduled_at AS starts_at_b
FROM public.appointments a
JOIN public.appointments b
  ON a.id < b.id
 AND a.status IN ('requested', 'confirmed')
 AND b.status IN ('requested', 'confirmed')
 AND a.scheduled_at < b.scheduled_at + INTERVAL '30 minutes'
 AND b.scheduled_at < a.scheduled_at + INTERVAL '30 minutes'
LEFT JOIN public.properties property_a ON property_a.id = a.property_id
LEFT JOIN public.properties property_b ON property_b.id = b.property_id
LEFT JOIN public.inquiries inquiry_a ON inquiry_a.id = a.inquiry_id
LEFT JOIN public.inquiries inquiry_b ON inquiry_b.id = b.inquiry_id
WHERE lower(btrim(a.buyer_email)) = lower(btrim(b.buyer_email))
   OR (
     COALESCE(inquiry_a.assigned_agent_id, property_a.assigned_agent_id) IS NOT NULL
     AND COALESCE(inquiry_a.assigned_agent_id, property_a.assigned_agent_id)
         = COALESCE(inquiry_b.assigned_agent_id, property_b.assigned_agent_id)
   )
ORDER BY starts_at_a, starts_at_b;
