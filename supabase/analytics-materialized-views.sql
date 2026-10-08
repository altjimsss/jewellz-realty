-- ============================================================
-- Jewellz Realty – Analytics Materialized Views
-- Run this once in the Supabase SQL editor.
-- Handles the case where these already exist as regular VIEWs.
-- ============================================================

-- ── 1. mv_listing_performance ────────────────────────────────
DROP VIEW IF EXISTS mv_listing_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_listing_performance CASCADE;
CREATE MATERIALIZED VIEW mv_listing_performance AS
SELECT
  p.id                                                                    AS property_id,
  p.title,
  -- location is derived from city + province + address in the app layer
  COALESCE(
    NULLIF(CONCAT_WS(', ', NULLIF(p.city,''), NULLIF(p.province,'')), ''),
    p.address
  )                                                                       AS location,
  p.price,
  p.category                                                              AS type,
  p.status,
  COUNT(pa.id) FILTER (
    WHERE pa.event_type IN ('property_view','page_view','view','listing_view')
  )                                                                       AS total_views,
  COUNT(DISTINCT pa.session_id) FILTER (
    WHERE pa.event_type IN ('property_view','page_view','view','listing_view')
  )                                                                       AS unique_views,
  COUNT(DISTINCT i.id)                                                    AS total_inquiries,
  COUNT(pa.id) FILTER (
    WHERE pa.event_type LIKE 'property_gallery%'
  )                                                                       AS gallery_interactions,
  COUNT(pa.id) FILTER (
    WHERE pa.event_type IN ('property_map_open','property_nearby_click')
  )                                                                       AS map_interactions,
  COUNT(pa.id) FILTER (
    WHERE pa.event_type IN ('detail_open','property_detail_open','property_open','property_click')
  )                                                                       AS detail_opens,
  ROUND(AVG(
    CASE WHEN pa.event_type = 'property_dwell_time'
    THEN (pa.metadata->>'durationSeconds')::NUMERIC END
  ))                                                                      AS avg_dwell_seconds,
  MIN(pa.created_at)                                                      AS first_seen_at,
  MAX(pa.created_at)                                                      AS last_seen_at
FROM properties p
LEFT JOIN property_analytics pa ON pa.property_id = p.id
LEFT JOIN inquiries           i  ON i.property_id  = p.id
GROUP BY p.id, p.title, p.city, p.province, p.address, p.price, p.category, p.status;

CREATE UNIQUE INDEX idx_mv_listing_performance_property_id
  ON mv_listing_performance (property_id);
CREATE INDEX idx_mv_listing_performance_views
  ON mv_listing_performance (total_views DESC NULLS LAST);


-- ── 2. mv_traffic_sources ────────────────────────────────────
DROP VIEW IF EXISTS mv_traffic_sources CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_traffic_sources CASCADE;
CREATE MATERIALIZED VIEW mv_traffic_sources AS
SELECT
  COALESCE(NULLIF(source, ''), 'direct')  AS source,
  COUNT(*)                                AS sessions,
  COUNT(DISTINCT anonymous_visitor_id)    AS unique_visitors,
  MAX(last_seen_at)                       AS last_seen_at
FROM sessions
GROUP BY COALESCE(NULLIF(source, ''), 'direct');

CREATE UNIQUE INDEX idx_mv_traffic_sources_source
  ON mv_traffic_sources (source);


-- ── 3. mv_daily_inquiry_volume ───────────────────────────────
DROP VIEW IF EXISTS mv_daily_inquiry_volume CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_daily_inquiry_volume CASCADE;
CREATE MATERIALIZED VIEW mv_daily_inquiry_volume AS
SELECT
  DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Manila') AS day,
  TO_CHAR(
    DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Manila'),
    'Mon DD'
  )                                                         AS date,
  COUNT(*)                                                  AS inquiry_count,
  COUNT(DISTINCT buyer_email)                               AS unique_buyers
FROM inquiries
GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Manila')
ORDER BY day;

CREATE UNIQUE INDEX idx_mv_daily_inquiry_volume_day
  ON mv_daily_inquiry_volume (day);


-- ── 4. mv_agent_performance ──────────────────────────────────
DROP VIEW IF EXISTS mv_agent_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_agent_performance CASCADE;
CREATE MATERIALIZED VIEW mv_agent_performance AS
SELECT
  a.id                                                        AS agent_id,
  a.name,
  a.email,
  a.phone,
  a.specialization,
  a.status,
  COUNT(DISTINCT i.id)                                        AS total_inquiries,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'new')        AS new_inquiries,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'contacted')  AS contacted_inquiries,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'closed')     AS closed_inquiries,
  MAX(i.created_at)                                           AS last_inquiry_at
FROM agents a
LEFT JOIN inquiries i ON i.assigned_agent_id = a.id
GROUP BY a.id, a.name, a.email, a.phone, a.specialization, a.status;

CREATE UNIQUE INDEX idx_mv_agent_performance_agent_id
  ON mv_agent_performance (agent_id);


-- ── 5. mv_developer_portfolio ────────────────────────────────
DROP VIEW IF EXISTS mv_developer_portfolio CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_developer_portfolio CASCADE;
CREATE MATERIALIZED VIEW mv_developer_portfolio AS
SELECT
  dp.id                                                         AS developer_id,
  dp.name,
  dp.slug,
  dp.logo_url,
  COUNT(DISTINCT p.id)                                          AS total_properties,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'published')    AS available_properties,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'sold')         AS sold_properties,
  COUNT(DISTINCT i.id)                                          AS total_inquiries,
  COALESCE(AVG(p.price), 0)                                     AS avg_price,
  MAX(p.created_at)                                             AS last_listing_at
FROM developer_partners dp
LEFT JOIN properties p ON p.developer_id = dp.id
LEFT JOIN inquiries   i ON i.property_id  = p.id
GROUP BY dp.id, dp.name, dp.slug, dp.logo_url;

CREATE UNIQUE INDEX idx_mv_developer_portfolio_developer_id
  ON mv_developer_portfolio (developer_id);


-- ── Populate all views immediately ───────────────────────────
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_listing_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_traffic_sources;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_inquiry_volume;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agent_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_developer_portfolio;
