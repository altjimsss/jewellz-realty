-- ============================================================
-- DEPRECATED - DO NOT RUN THIS FILE
-- ============================================================
--
-- This script used to create analytics materialized views with column names
-- (total_page_views, session_count, inquiry_date aliases, etc.) that no longer
-- match what the CMS reads from Supabase. Running it overwrites the working
-- views and makes the analytics panel show zeros.
--
-- The application reads these relations:
--   mv_listing_performance  -> total_views, detail_opens, total_interactions,
--                              avg_dwell_seconds, total_inquiries, inquiry_rate_pct
--   mv_daily_inquiry_volume -> inquiry_date, total_inquiries
--   mv_traffic_sources      -> source, session_count, total_page_views, share_pct
--   mv_agent_performance    -> agent_name, total_assigned, conversions,
--                              conversion_rate_pct, avg_response_time_hours
--
-- Run these instead, in order:
--   1. supabase/cms-compatibility-views.sql
--   2. supabase/performance-hardening.sql
--
-- The compatibility script safely replaces any stale VIEW or MATERIALIZED VIEW
-- with the same names, then recreates them with the columns above.

DO $$
BEGIN
  RAISE NOTICE 'Deprecated analytics view script skipped. Run cms-compatibility-views.sql instead.';
END
$$;
