-- Clear dummy catalog and customer activity before real data is entered.
-- This removes inquiries, appointments, analytics history, and listing activity,
-- but does not delete auth users or profiles (including admin/agent accounts).
-- Run on staging first and confirm the impact before production.

BEGIN;

-- Preview counts before running:
-- SELECT 'properties' AS table_name, COUNT(*) FROM public.properties
-- UNION ALL SELECT 'inquiries', COUNT(*) FROM public.inquiries
-- UNION ALL SELECT 'appointments', COUNT(*) FROM public.appointments
-- UNION ALL SELECT 'analytics_events', COUNT(*) FROM public.analytics_events
-- UNION ALL SELECT 'property_analytics', COUNT(*) FROM public.property_analytics
-- UNION ALL SELECT 'sessions', COUNT(*) FROM public.sessions;

-- Remove customer activity first, retaining account/profile rows.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'inquiry_tasks', 'appointments', 'inquiries', 'saved_properties',
    'property_comparisons', 'recommendations', 'analytics_events',
    'property_analytics', 'sessions', 'ai_analytics_reports'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I', table_name);
    END IF;
  END LOOP;
END;
$$;

DELETE FROM public.properties;

-- Current application tables.
DO $$
BEGIN
  IF to_regclass('public.projects') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.projects';
  END IF;
  IF to_regclass('public.developer_partners') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.developer_partners';
  END IF;

  -- Legacy schema tables, if they still exist in this database.
  IF to_regclass('public.developer_projects') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.developer_projects';
  END IF;
  IF to_regclass('public.developer_companies') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.developer_companies';
  END IF;
END;
$$;

-- Check the result before committing. Change COMMIT to ROLLBACK if any
-- unexpected dependent data was affected during your staging review.
COMMIT;
