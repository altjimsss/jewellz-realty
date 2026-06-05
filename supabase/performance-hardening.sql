-- =============================================================================
-- JEWELLZ REALTY - PERFORMANCE HARDENING PATCH
-- Run this in Supabase SQL Editor after supabase/cms-compatibility-views.sql.
--
-- These indexes target the public analytics/inquiry write path and the CMS reads.
-- They are safe to run more than once.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep this patch safe even when Supabase already has older versions of the
-- analytics tables.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  anonymous_visitor_id TEXT,
  source TEXT NOT NULL DEFAULT 'direct',
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  landing_path TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  language TEXT,
  page_view_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS anonymous_visitor_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS landing_path TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS os TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS page_view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  page_path TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'page_view',
  ADD COLUMN IF NOT EXISTS page_path TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS property_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'website',
  page_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE property_analytics
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'page_view',
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS page_path TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS lead_score NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  reason TEXT,
  confidence NUMERIC(5,2),
  source TEXT NOT NULL DEFAULT 'ai',
  is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  was_clicked BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at TIMESTAMPTZ
);

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS buyer_id UUID,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS was_clicked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_last_seen
  ON sessions(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_anonymous_visitor
  ON sessions(anonymous_visitor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_property_session
  ON analytics_events(property_id, session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON analytics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_analytics_created_at
  ON property_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_analytics_session
  ON property_analytics(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiries_property_created
  ON inquiries(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiries_status_created
  ON inquiries(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiries_priority_score
  ON inquiries(priority, lead_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiries_session
  ON inquiries(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_property_clicked
  ON recommendations(property_id, was_clicked, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_clicked_at
  ON recommendations(clicked_at DESC)
  WHERE was_clicked = TRUE;

CREATE TABLE IF NOT EXISTS ai_analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL DEFAULT 'cms_analytics',
  period_label TEXT NOT NULL DEFAULT 'weekly',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  report JSONB NOT NULL DEFAULT '{}'::JSONB,
  model_outputs JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_analytics_reports
  ADD COLUMN IF NOT EXISTS period_label TEXT NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS model_outputs JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS idx_ai_analytics_reports_created
  ON ai_analytics_reports(report_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_reports_period
  ON ai_analytics_reports(period_label, created_at DESC);

ALTER TABLE ai_analytics_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_analytics_reports_authenticated_read" ON ai_analytics_reports;
CREATE POLICY "ai_analytics_reports_authenticated_read" ON ai_analytics_reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ai_analytics_reports_authenticated_insert" ON ai_analytics_reports;
CREATE POLICY "ai_analytics_reports_authenticated_insert" ON ai_analytics_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ANALYZE sessions;
ANALYZE analytics_events;
ANALYZE property_analytics;
ANALYZE inquiries;
ANALYZE recommendations;
ANALYZE ai_analytics_reports;
