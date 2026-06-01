-- =============================================================================
-- JEWELLZ REALTY - CMS SCHEMA AUDIT ADDITIONS
-- Paste into Supabase SQL Editor after the base schema.
-- These additions preserve existing table and column names.
-- =============================================================================

-- 1. Property publishing and moderation metadata
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS virtual_tour_url TEXT,
  ADD COLUMN IF NOT EXISTS availability_notes TEXT,
  ADD COLUMN IF NOT EXISTS reservation_fee NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS turnover_date DATE,
  ADD COLUMN IF NOT EXISTS last_price_change_at TIMESTAMPTZ;

ALTER TABLE property_images
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS width_px INT,
  ADD COLUMN IF NOT EXISTS height_px INT;

CREATE TABLE IF NOT EXISTS property_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_documents_property
  ON property_documents(property_id);

CREATE TABLE IF NOT EXISTS property_floor_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  floor_area_sqm NUMERIC(8,2),
  bedrooms SMALLINT CHECK (bedrooms >= 0),
  bathrooms SMALLINT CHECK (bathrooms >= 0),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_floor_plans_property
  ON property_floor_plans(property_id);

CREATE TABLE IF NOT EXISTS property_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  old_price NUMERIC(15,2),
  new_price NUMERIC(15,2) NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_price_history_property
  ON property_price_history(property_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS property_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  old_status listing_status,
  new_status listing_status NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_status_history_property
  ON property_status_history(property_id, changed_at DESC);

CREATE OR REPLACE FUNCTION log_property_price_status_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO property_price_history(property_id, old_price, new_price, changed_by)
    VALUES (NEW.id, OLD.price, NEW.price, auth.uid());
    NEW.last_price_change_at := NOW();
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO property_status_history(property_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_property_price_status_history ON properties;
CREATE TRIGGER trg_property_price_status_history
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION log_property_price_status_changes();

-- 2. Inquiry communication history beyond status timeline notes
CREATE TABLE IF NOT EXISTS inquiry_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'internal_note',
  direction TEXT NOT NULL DEFAULT 'internal',
  subject TEXT,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inquiry_messages_channel_check
    CHECK (channel IN ('internal_note','email','sms','phone','messenger','walk_in','other')),
  CONSTRAINT inquiry_messages_direction_check
    CHECK (direction IN ('inbound','outbound','internal'))
);

CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry
  ON inquiry_messages(inquiry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS inquiry_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_tasks_agent_due
  ON inquiry_tasks(assigned_agent_id, due_at)
  WHERE completed_at IS NULL;

-- 3. Appointments for site visits and office consultations
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  buyer_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  appointment_type TEXT NOT NULL DEFAULT 'site_viewing',
  status TEXT NOT NULL DEFAULT 'requested',
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT appointments_type_check
    CHECK (appointment_type IN ('site_viewing','office_consultation','call','online_meeting','other')),
  CONSTRAINT appointments_status_check
    CHECK (status IN ('requested','confirmed','completed','cancelled','no_show'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_agent_schedule
  ON appointments(assigned_agent_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_property_schedule
  ON appointments(property_id, scheduled_at);

-- 4. Buyer saved listings and comparison lists
CREATE TABLE IF NOT EXISTS saved_properties (
  buyer_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (buyer_profile_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_properties_property
  ON saved_properties(property_id);

CREATE TABLE IF NOT EXISTS property_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT,
  property_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT property_comparisons_owner_check
    CHECK (buyer_profile_id IS NOT NULL OR session_id IS NOT NULL)
);

-- 5. Developer contact persons separate from company profile
CREATE TABLE IF NOT EXISTS developer_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID NOT NULL REFERENCES developer_partners(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position_title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_developer_contacts_developer
  ON developer_contacts(developer_id);

-- 6. CMS content audit and scheduling helpers
ALTER TABLE hero_banners
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS alt_text TEXT;

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS event_date DATE;

ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE partner_logos
  ADD COLUMN IF NOT EXISTS alt_text TEXT;

CREATE TABLE IF NOT EXISTS cms_content_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cms_content_revisions_action_check
    CHECK (action IN ('insert','update','delete'))
);

CREATE INDEX IF NOT EXISTS idx_cms_content_revisions_row
  ON cms_content_revisions(table_name, row_id, created_at DESC);

-- 7. Materialized view refresh tracking
CREATE TABLE IF NOT EXISTS materialized_view_refresh_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  view_name TEXT NOT NULL,
  refreshed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'started',
  error_message TEXT,
  CONSTRAINT materialized_view_refresh_log_status_check
    CHECK (status IN ('started','completed','failed'))
);

CREATE INDEX IF NOT EXISTS idx_materialized_view_refresh_log_view
  ON materialized_view_refresh_log(view_name, started_at DESC);

-- 8. Apply updated_at trigger to newly added tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'inquiry_tasks',
    'appointments',
    'property_comparisons',
    'developer_contacts'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = FORMAT('trg_%s_updated_at', tbl)
    ) THEN
      EXECUTE FORMAT(
        'CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- 9. RLS for newly added tables
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE materialized_view_refresh_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_documents_public_read" ON property_documents;
CREATE POLICY "property_documents_public_read" ON property_documents
  FOR SELECT USING (
    is_public = TRUE AND EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_documents.property_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS "property_documents_admin_all" ON property_documents;
CREATE POLICY "property_documents_admin_all" ON property_documents
  FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "property_floor_plans_public_read" ON property_floor_plans;
CREATE POLICY "property_floor_plans_public_read" ON property_floor_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_floor_plans.property_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS "property_floor_plans_admin_all" ON property_floor_plans;
CREATE POLICY "property_floor_plans_admin_all" ON property_floor_plans
  FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "property_history_admin_read" ON property_price_history;
CREATE POLICY "property_history_admin_read" ON property_price_history
  FOR SELECT USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "property_status_history_admin_read" ON property_status_history;
CREATE POLICY "property_status_history_admin_read" ON property_status_history
  FOR SELECT USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "inquiry_messages_role_read" ON inquiry_messages;
CREATE POLICY "inquiry_messages_role_read" ON inquiry_messages
  FOR SELECT USING (
    current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM inquiries i
      WHERE i.id = inquiry_messages.inquiry_id
        AND i.assigned_agent_id = current_agent_id()
    )
  );

DROP POLICY IF EXISTS "inquiry_messages_role_insert" ON inquiry_messages;
CREATE POLICY "inquiry_messages_role_insert" ON inquiry_messages
  FOR INSERT WITH CHECK (
    current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM inquiries i
      WHERE i.id = inquiry_messages.inquiry_id
        AND i.assigned_agent_id = current_agent_id()
    )
  );

DROP POLICY IF EXISTS "inquiry_tasks_role_all" ON inquiry_tasks;
CREATE POLICY "inquiry_tasks_role_all" ON inquiry_tasks
  FOR ALL USING (
    current_user_role() = 'admin'
    OR assigned_agent_id = current_agent_id()
  );

DROP POLICY IF EXISTS "appointments_admin_all" ON appointments;
CREATE POLICY "appointments_admin_all" ON appointments
  FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "appointments_agent_assigned" ON appointments;
CREATE POLICY "appointments_agent_assigned" ON appointments
  FOR SELECT USING (
    current_user_role() = 'agent'
    AND assigned_agent_id = current_agent_id()
  );

DROP POLICY IF EXISTS "appointments_public_insert" ON appointments;
CREATE POLICY "appointments_public_insert" ON appointments
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "saved_properties_owner_all" ON saved_properties;
CREATE POLICY "saved_properties_owner_all" ON saved_properties
  FOR ALL USING (buyer_profile_id = auth.uid())
  WITH CHECK (buyer_profile_id = auth.uid());

DROP POLICY IF EXISTS "property_comparisons_owner_all" ON property_comparisons;
CREATE POLICY "property_comparisons_owner_all" ON property_comparisons
  FOR ALL USING (buyer_profile_id = auth.uid())
  WITH CHECK (buyer_profile_id = auth.uid());

DROP POLICY IF EXISTS "developer_contacts_admin_all" ON developer_contacts;
CREATE POLICY "developer_contacts_admin_all" ON developer_contacts
  FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "developer_contacts_developer_read" ON developer_contacts;
CREATE POLICY "developer_contacts_developer_read" ON developer_contacts
  FOR SELECT USING (
    current_user_role() = 'developer_partner'
    AND developer_id = current_developer_id()
  );

DROP POLICY IF EXISTS "cms_content_revisions_admin_read" ON cms_content_revisions;
CREATE POLICY "cms_content_revisions_admin_read" ON cms_content_revisions
  FOR SELECT USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "materialized_view_refresh_log_admin_all" ON materialized_view_refresh_log;
CREATE POLICY "materialized_view_refresh_log_admin_all" ON materialized_view_refresh_log
  FOR ALL USING (current_user_role() = 'admin');

-- =============================================================================
-- END OF AUDIT ADDITIONS
-- =============================================================================
