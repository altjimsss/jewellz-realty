-- Property and listing-photo audit history for the admin portal.
-- Run once in Supabase SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.cms_content_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_content_revisions_property_recent
  ON public.cms_content_revisions(table_name, created_at DESC);

ALTER TABLE public.cms_content_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_content_revisions_admin_read" ON public.cms_content_revisions;
CREATE POLICY "cms_content_revisions_admin_read"
  ON public.cms_content_revisions
  FOR SELECT
  USING (current_user_role() = 'admin');

CREATE OR REPLACE FUNCTION public.capture_property_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_snapshot JSONB;
  new_snapshot JSONB;
  affected_property_id TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_snapshot := to_jsonb(NEW);
    affected_property_id := COALESCE(new_snapshot ->> 'property_id', new_snapshot ->> 'id');
  ELSIF TG_OP = 'UPDATE' THEN
    old_snapshot := to_jsonb(OLD);
    new_snapshot := to_jsonb(NEW);
    affected_property_id := COALESCE(new_snapshot ->> 'property_id', old_snapshot ->> 'property_id', new_snapshot ->> 'id');
  ELSE
    old_snapshot := to_jsonb(OLD);
    affected_property_id := COALESCE(old_snapshot ->> 'property_id', old_snapshot ->> 'id');
  END IF;

  -- Embedding generation uses the service role to update AI-only columns.
  -- Keep these maintenance writes out of the human-facing property audit trail.
  IF TG_OP = 'UPDATE'
    AND TG_TABLE_NAME = 'properties'
    AND (to_jsonb(NEW) - ARRAY['updated_at', 'updated_by', 'embedding', 'embedding_text', 'embedding_updated_at'])
      IS NOT DISTINCT FROM
        (to_jsonb(OLD) - ARRAY['updated_at', 'updated_by', 'embedding', 'embedding_text', 'embedding_updated_at'])
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.cms_content_revisions (
    table_name,
    row_id,
    changed_by,
    action,
    old_data,
    new_data
  ) VALUES (
    TG_TABLE_NAME,
    affected_property_id,
    auth.uid(),
    lower(TG_OP),
    old_snapshot,
    new_snapshot
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_audit_revision ON public.properties;
CREATE TRIGGER trg_properties_audit_revision
  AFTER INSERT OR UPDATE OR DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.capture_property_revision();

DROP TRIGGER IF EXISTS trg_property_images_audit_revision ON public.property_images;
CREATE TRIGGER trg_property_images_audit_revision
  AFTER INSERT OR UPDATE OR DELETE ON public.property_images
  FOR EACH ROW EXECUTE FUNCTION public.capture_property_revision();
