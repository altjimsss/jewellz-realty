-- =============================================================================
-- JEWELLZ REALTY -- BASE PUBLIC SCHEMA
-- Run this FIRST in Supabase SQL Editor (public schema).
-- After this completes successfully, run rbac-policies.sql.
-- Safe to run multiple times (uses IF NOT EXISTS / CREATE OR REPLACE).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'agent', 'developer_partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('draft', 'published', 'reserved', 'sold', 'unpublished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.property_category AS ENUM ('condo','house','house_and_lot','townhouse','lot','farm','memorial','commercial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_badge AS ENUM ('none','featured','promo','new','hot');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inquiry_status AS ENUM ('new','assigned','contacted','viewing_scheduled','negotiating','reserved','closed_won','closed_lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inquiry_priority AS ENUM ('high','medium','low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gallery_section AS ENUM ('achievements','events','trainings','service','general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- TABLE: profiles
-- One row per auth.users entry. Stores app-level role + status.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'agent'
                  CHECK (role IN ('admin','agent','developer_partner')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url    TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patch: add any missing columns to an existing profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS full_name  TEXT,
  ADD COLUMN IF NOT EXISTS role       TEXT NOT NULL DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone      TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add role check constraint if missing (ignore error if already exists)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','agent','developer_partner'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-create a profile row whenever a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  next_full_name TEXT;
  next_role TEXT;
  role_is_enum BOOLEAN;
BEGIN
  next_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  next_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');

  IF next_role NOT IN ('admin', 'agent', 'developer_partner') THEN
    next_role := 'agent';
  END IF;

  SELECT c.udt_name = 'user_role'
    INTO role_is_enum
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'profiles'
    AND c.column_name = 'role';

  IF role_is_enum THEN
    EXECUTE '
      INSERT INTO public.profiles (id, email, full_name, role, is_active)
      VALUES ($1, $2, $3, $4::public.user_role, TRUE)
      ON CONFLICT (id) DO UPDATE
        SET
          email     = COALESCE(EXCLUDED.email, profiles.email),
          full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
          role      = COALESCE(profiles.role, EXCLUDED.role)'
    USING NEW.id, NEW.email, next_full_name, next_role;
  ELSE
    EXECUTE '
      INSERT INTO public.profiles (id, email, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (id) DO UPDATE
        SET
          email     = COALESCE(EXCLUDED.email, profiles.email),
          full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
          role      = COALESCE(profiles.role, EXCLUDED.role)'
    USING NEW.id, NEW.email, next_full_name, next_role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- TABLE: agents
-- Extended profile for users with role = 'agent'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  license_number    TEXT,
  specialization    TEXT,
  bio               TEXT,
  photo_url         TEXT,
  phone             TEXT,
  facebook_url      TEXT,
  instagram_url     TEXT,
  twitter_url       TEXT,
  linkedin_url      TEXT,
  is_top_agent      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        SMALLINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patch: add any missing columns to an existing agents table
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS license_number  TEXT,
  ADD COLUMN IF NOT EXISTS specialization  TEXT,
  ADD COLUMN IF NOT EXISTS bio             TEXT,
  ADD COLUMN IF NOT EXISTS photo_url       TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url    TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url   TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url     TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url    TEXT,
  ADD COLUMN IF NOT EXISTS is_top_agent    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sort_order      SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_agents_profile ON public.agents(profile_id);
CREATE INDEX IF NOT EXISTS idx_agents_active  ON public.agents(is_active, sort_order);

-- ---------------------------------------------------------------------------
-- TABLE: developer_companies
-- Extended profile for users with role = 'developer_partner'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.developer_companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  slug            TEXT UNIQUE,
  logo_url        TEXT,
  website_url     TEXT,
  description     TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_companies_profile ON public.developer_companies(profile_id);
CREATE INDEX IF NOT EXISTS idx_dev_companies_slug    ON public.developer_companies(slug);
CREATE INDEX IF NOT EXISTS idx_dev_companies_active  ON public.developer_companies(is_active);

-- ---------------------------------------------------------------------------
-- TABLE: developer_projects
-- Master developments owned by a developer company.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.developer_projects (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id      UUID NOT NULL REFERENCES public.developer_companies(id) ON DELETE CASCADE,
  project_name      TEXT NOT NULL,
  slug              TEXT UNIQUE,
  tagline           TEXT,
  description       TEXT,
  location_city     TEXT,
  location_province TEXT,
  cover_image_url   TEXT,
  brochure_url      TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_projects_developer ON public.developer_projects(developer_id);
CREATE INDEX IF NOT EXISTS idx_dev_projects_active    ON public.developer_projects(is_active);

-- ---------------------------------------------------------------------------
-- TABLE: properties
-- The core listing table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT,
  category            public.property_category,
  status              public.listing_status NOT NULL DEFAULT 'draft',
  badge               public.listing_badge NOT NULL DEFAULT 'none',
  price               NUMERIC(15,2),
  price_per_sqm       NUMERIC(12,2),
  reservation_fee     NUMERIC(12,2),
  bedrooms            SMALLINT CHECK (bedrooms >= 0),
  bathrooms           SMALLINT CHECK (bathrooms >= 0),
  parking_slots       SMALLINT CHECK (parking_slots >= 0),
  floor_area_sqm      NUMERIC(10,2),
  lot_area_sqm        NUMERIC(10,2),
  floors              SMALLINT,
  address             TEXT,
  city                TEXT,
  province            TEXT,
  latitude            NUMERIC(10,7),
  longitude           NUMERIC(10,7),
  featured_image_url  TEXT,
  images              TEXT[],
  video_url           TEXT,
  virtual_tour_url    TEXT,
  amenities           TEXT[],
  features            TEXT[],
  tags                TEXT[],
  seo_title           TEXT,
  seo_description     TEXT,
  internal_notes      TEXT,
  availability_notes  TEXT,
  turnover_date       DATE,
  last_price_change_at TIMESTAMPTZ,
  developer_id        UUID REFERENCES public.developer_companies(id) ON DELETE SET NULL,
  project_id          UUID REFERENCES public.developer_projects(id)  ON DELETE SET NULL,
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_slug     ON public.properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_status   ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_category ON public.properties(category, status);
CREATE INDEX IF NOT EXISTS idx_properties_city     ON public.properties(city, status);
CREATE INDEX IF NOT EXISTS idx_properties_price    ON public.properties(price, status);
CREATE INDEX IF NOT EXISTS idx_properties_developer ON public.properties(developer_id);
CREATE INDEX IF NOT EXISTS idx_properties_created  ON public.properties(created_at DESC);

-- ---------------------------------------------------------------------------
-- TABLE: property_images
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  width_px    INT,
  height_px   INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_images_property ON public.property_images(property_id, sort_order);

-- ---------------------------------------------------------------------------
-- TABLE: inquiries
-- Buyer leads / contact form submissions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inquiries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id       UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES public.agents(id)     ON DELETE SET NULL,
  buyer_name        TEXT,
  buyer_email       TEXT,
  buyer_phone       TEXT,
  message           TEXT,
  status            public.inquiry_status    NOT NULL DEFAULT 'new',
  priority          public.inquiry_priority  NOT NULL DEFAULT 'medium',
  lead_score        NUMERIC(5,4),
  notes             TEXT,
  session_id        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_property    ON public.inquiries(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_agent       ON public.inquiries(assigned_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_inquiries_status      ON public.inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_priority    ON public.inquiries(priority, lead_score DESC, created_at DESC);

-- ---------------------------------------------------------------------------
-- TABLE: gallery
-- Photo gallery for company events, achievements, etc.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT,
  description TEXT,
  image_url   TEXT NOT NULL,
  section     public.gallery_section NOT NULL DEFAULT 'general',
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_section ON public.gallery(section, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_active  ON public.gallery(is_active, sort_order);

-- ---------------------------------------------------------------------------
-- TABLE: sessions  (analytics - not auth sessions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id                  TEXT PRIMARY KEY,
  anonymous_visitor_id TEXT,
  source              TEXT NOT NULL DEFAULT 'direct',
  referrer            TEXT,
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,
  landing_path        TEXT,
  device_type         TEXT,
  browser             TEXT,
  os                  TEXT,
  language            TEXT,
  page_view_count     INTEGER NOT NULL DEFAULT 0,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_last_seen        ON public.sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_anonymous_visitor ON public.sessions(anonymous_visitor_id);

-- ---------------------------------------------------------------------------
-- TABLE: analytics_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT REFERENCES public.sessions(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  page_path   TEXT,
  source      TEXT NOT NULL DEFAULT 'website',
  metadata    JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created  ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_property ON public.analytics_events(property_id, session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type     ON public.analytics_events(event_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- TABLE: property_analytics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_analytics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  session_id  TEXT REFERENCES public.sessions(id) ON DELETE SET NULL,
  source      TEXT NOT NULL DEFAULT 'website',
  page_path   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prop_analytics_created  ON public.property_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prop_analytics_property ON public.property_analytics(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prop_analytics_session  ON public.property_analytics(session_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- TABLE: recommendations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recommendations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id   TEXT REFERENCES public.sessions(id) ON DELETE SET NULL,
  property_id  UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  reason       TEXT,
  confidence   NUMERIC(5,2),
  source       TEXT NOT NULL DEFAULT 'ai',
  is_fallback  BOOLEAN NOT NULL DEFAULT FALSE,
  was_clicked  BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recommendations_property ON public.recommendations(property_id, was_clicked, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_session  ON public.recommendations(session_id, generated_at DESC);

-- ---------------------------------------------------------------------------
-- TABLE: ai_analytics_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_analytics_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type   TEXT NOT NULL DEFAULT 'cms_analytics',
  period_label  TEXT NOT NULL DEFAULT 'weekly',
  period_start  TIMESTAMPTZ,
  period_end    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary       JSONB NOT NULL DEFAULT '{}'::JSONB,
  report        JSONB NOT NULL DEFAULT '{}'::JSONB,
  model_outputs JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_created ON public.ai_analytics_reports(report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_period  ON public.ai_analytics_reports(period_label, created_at DESC);

-- ---------------------------------------------------------------------------
-- TABLE: property_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title         TEXT NOT NULL,
  storage_url   TEXT NOT NULL,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prop_docs_property ON public.property_documents(property_id);

-- ---------------------------------------------------------------------------
-- DONE: verify tables exist
-- ---------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
