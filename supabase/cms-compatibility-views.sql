-- =============================================================================
-- JEWELLZ REALTY - CMS COMPATIBILITY PATCH
-- Run this after the base schema.
--
-- Adds the analytics views queried by components/cms/AdminCms.tsx and makes sure
-- common enum values used by the CMS form controls exist when those enum types
-- are present in your project.
-- =============================================================================

-- 1. Ensure CMS enum values exist.
-- These blocks only run when the enum type exists, so they are safe for schemas
-- where Supabase exported USER-DEFINED without showing CREATE TYPE statements.
DO $$
DECLARE
  enum_value TEXT;
BEGIN
  IF to_regtype('public.property_category') IS NOT NULL THEN
    FOREACH enum_value IN ARRAY ARRAY[
      'condo',
      'house',
      'house_and_lot',
      'townhouse',
      'lot',
      'farm',
      'memorial',
      'commercial'
    ] LOOP
      EXECUTE format('ALTER TYPE public.property_category ADD VALUE IF NOT EXISTS %L', enum_value);
    END LOOP;
  END IF;

  IF to_regtype('public.listing_status') IS NOT NULL THEN
    FOREACH enum_value IN ARRAY ARRAY[
      'draft',
      'published',
      'reserved',
      'sold',
      'unpublished'
    ] LOOP
      EXECUTE format('ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS %L', enum_value);
    END LOOP;
  END IF;

  IF to_regtype('public.listing_badge') IS NOT NULL THEN
    FOREACH enum_value IN ARRAY ARRAY[
      'none',
      'featured',
      'promo',
      'new',
      'hot'
    ] LOOP
      EXECUTE format('ALTER TYPE public.listing_badge ADD VALUE IF NOT EXISTS %L', enum_value);
    END LOOP;
  END IF;

  IF to_regtype('public.inquiry_status') IS NOT NULL THEN
    FOREACH enum_value IN ARRAY ARRAY[
      'new',
      'assigned',
      'contacted',
      'viewing_scheduled',
      'negotiating',
      'reserved',
      'closed_won',
      'closed_lost'
    ] LOOP
      EXECUTE format('ALTER TYPE public.inquiry_status ADD VALUE IF NOT EXISTS %L', enum_value);
    END LOOP;
  END IF;

  IF to_regtype('public.inquiry_priority') IS NOT NULL THEN
    FOREACH enum_value IN ARRAY ARRAY[
      'high',
      'medium',
      'low'
    ] LOOP
      EXECUTE format('ALTER TYPE public.inquiry_priority ADD VALUE IF NOT EXISTS %L', enum_value);
    END LOOP;
  END IF;

  IF to_regtype('public.gallery_section') IS NOT NULL THEN
    FOREACH enum_value IN ARRAY ARRAY[
      'achievements',
      'events',
      'trainings',
      'service',
      'general'
    ] LOOP
      EXECUTE format('ALTER TYPE public.gallery_section ADD VALUE IF NOT EXISTS %L', enum_value);
    END LOOP;
  END IF;

  IF to_regtype('public.traffic_source') IS NOT NULL THEN
    FOREACH enum_value IN ARRAY ARRAY[
      'direct',
      'organic_search',
      'social_media_facebook',
      'social_media_instagram',
      'social_media_other',
      'email_campaign',
      'referral',
      'walk_in',
      'phone',
      'other'
    ] LOOP
      EXECUTE format('ALTER TYPE public.traffic_source ADD VALUE IF NOT EXISTS %L', enum_value);
    END LOOP;
  END IF;
END;
$$;

-- 2. Drop stale regular/materialized objects with the same names before creating
-- regular views. The CMS only needs queryable relations; regular views avoid
-- manual refresh work during development.
DO $$
DECLARE
  view_name TEXT;
  view_kind CHAR;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'mv_listing_performance',
    'mv_daily_inquiry_volume',
    'mv_traffic_sources',
    'mv_agent_performance',
    'mv_developer_portfolio'
  ] LOOP
    SELECT c.relkind
      INTO view_kind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = view_name;

    IF view_kind = 'm' THEN
      EXECUTE format('DROP MATERIALIZED VIEW public.%I', view_name);
    ELSIF view_kind = 'v' THEN
      EXECUTE format('DROP VIEW public.%I', view_name);
    END IF;
  END LOOP;
END;
$$;

-- 3. Listing performance summary used by the CMS Analytics panel.
CREATE VIEW public.mv_listing_performance AS
WITH property_event_counts AS (
  SELECT
    p.id AS property_id,
    COUNT(ae.id) FILTER (
      WHERE ae.event_type::TEXT IN (
        'property_view',
        'listing_view',
        'property_impression',
        'page_view',
        'view'
      )
    ) AS total_views,
    COUNT(ae.id) FILTER (
      WHERE ae.event_type::TEXT IN (
        'property_detail_open',
        'detail_open',
        'property_open',
        'property_click'
      )
    ) AS detail_opens
  FROM properties p
  LEFT JOIN analytics_events ae ON ae.property_id = p.id
  GROUP BY p.id
),
property_inquiry_counts AS (
  SELECT
    property_id,
    COUNT(*) AS total_inquiries
  FROM inquiries
  GROUP BY property_id
)
SELECT
  p.id AS property_id,
  p.title,
  COALESCE(events.total_views, 0)::BIGINT AS total_views,
  COALESCE(events.detail_opens, 0)::BIGINT AS detail_opens,
  COALESCE(inquiries_count.total_inquiries, 0)::BIGINT AS total_inquiries,
  CASE
    WHEN COALESCE(events.total_views, 0) = 0 THEN 0::NUMERIC
    ELSE ROUND((COALESCE(inquiries_count.total_inquiries, 0)::NUMERIC / events.total_views::NUMERIC) * 100, 2)
  END AS inquiry_rate_pct
FROM properties p
LEFT JOIN property_event_counts events ON events.property_id = p.id
LEFT JOIN property_inquiry_counts inquiries_count ON inquiries_count.property_id = p.id;

-- 4. Daily inquiry volume. Loaded by the CMS workspace and useful for future charting.
CREATE VIEW public.mv_daily_inquiry_volume AS
SELECT
  created_at::DATE AS inquiry_date,
  COUNT(*)::BIGINT AS total_inquiries,
  COUNT(*) FILTER (WHERE status::TEXT = 'new')::BIGINT AS new_inquiries,
  COUNT(*) FILTER (WHERE status::TEXT = 'assigned')::BIGINT AS assigned_inquiries,
  COUNT(*) FILTER (WHERE status::TEXT = 'contacted')::BIGINT AS contacted_inquiries,
  COUNT(*) FILTER (WHERE status::TEXT = 'reserved')::BIGINT AS reserved_inquiries,
  COUNT(*) FILTER (WHERE status::TEXT = 'closed_won')::BIGINT AS closed_won_inquiries,
  COUNT(*) FILTER (WHERE status::TEXT = 'closed_lost')::BIGINT AS closed_lost_inquiries
FROM inquiries
GROUP BY created_at::DATE
ORDER BY inquiry_date DESC;

-- 5. Traffic source summary used by the CMS Analytics panel.
CREATE VIEW public.mv_traffic_sources AS
WITH source_counts AS (
  SELECT
    COALESCE(source::TEXT, 'direct') AS source,
    COUNT(*)::BIGINT AS session_count,
    COALESCE(SUM(page_view_count), 0)::BIGINT AS total_page_views
  FROM sessions
  GROUP BY COALESCE(source::TEXT, 'direct')
)
SELECT
  source,
  session_count,
  total_page_views,
  CASE
    WHEN SUM(session_count) OVER () = 0 THEN 0::NUMERIC
    ELSE ROUND((session_count::NUMERIC / SUM(session_count) OVER ()::NUMERIC) * 100, 2)
  END AS share_pct
FROM source_counts
ORDER BY session_count DESC;

-- 6. Agent performance summary used by the CMS Analytics panel.
CREATE VIEW public.mv_agent_performance AS
SELECT
  a.id AS agent_id,
  COALESCE(p.full_name, p.email, a.profile_id::TEXT, a.id::TEXT) AS agent_name,
  COUNT(DISTINCT aa.inquiry_id)::BIGINT AS total_assigned,
  COUNT(DISTINCT i.id) FILTER (
    WHERE i.status::TEXT IN ('reserved', 'closed_won')
  )::BIGINT AS conversions,
  CASE
    WHEN COUNT(DISTINCT aa.inquiry_id) = 0 THEN 0::NUMERIC
    ELSE ROUND(
      (
        COUNT(DISTINCT i.id) FILTER (WHERE i.status::TEXT IN ('reserved', 'closed_won'))::NUMERIC
        / COUNT(DISTINCT aa.inquiry_id)::NUMERIC
      ) * 100,
      2
    )
  END AS conversion_rate_pct,
  ROUND(
    AVG(
      CASE
        WHEN i.first_contacted_at IS NULL OR i.created_at IS NULL THEN NULL
        ELSE EXTRACT(EPOCH FROM (i.first_contacted_at - i.created_at)) / 3600
      END
    )::NUMERIC,
    2
  ) AS avg_response_time_hours
FROM agents a
LEFT JOIN profiles p ON p.id = a.profile_id
LEFT JOIN agent_assignments aa ON aa.agent_id = a.id
LEFT JOIN inquiries i ON i.id = aa.inquiry_id
GROUP BY a.id, p.full_name, p.email, a.profile_id;

-- 7. Developer portfolio summary used by the CMS Analytics panel.
CREATE VIEW public.mv_developer_portfolio AS
SELECT
  d.id AS developer_id,
  d.company_name,
  COUNT(DISTINCT p.id)::BIGINT AS total_listings,
  COUNT(ae.id) FILTER (
    WHERE ae.event_type::TEXT IN (
      'property_view',
      'listing_view',
      'property_impression',
      'page_view',
      'view'
    )
  )::BIGINT AS total_views,
  COUNT(DISTINCT i.id) FILTER (
    WHERE i.status::TEXT IN ('reserved', 'closed_won')
  )::BIGINT AS total_conversions
FROM developer_partners d
LEFT JOIN properties p ON p.developer_id = d.id
LEFT JOIN analytics_events ae ON ae.property_id = p.id
LEFT JOIN inquiries i ON i.property_id = p.id
GROUP BY d.id, d.company_name;

-- 8. Allow authenticated CMS users to read the view results through Supabase.
GRANT SELECT ON public.mv_listing_performance TO authenticated;
GRANT SELECT ON public.mv_daily_inquiry_volume TO authenticated;
GRANT SELECT ON public.mv_traffic_sources TO authenticated;
GRANT SELECT ON public.mv_agent_performance TO authenticated;
GRANT SELECT ON public.mv_developer_portfolio TO authenticated;

-- =============================================================================
-- END CMS COMPATIBILITY PATCH
-- =============================================================================
