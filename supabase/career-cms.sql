-- Career cards and applications for the CMS.
-- Run this in the Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.career_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  badge TEXT NOT NULL DEFAULT 'Full-Time',
  description TEXT NOT NULL,
  details TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.career_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.career_jobs(id) ON DELETE SET NULL,
  position_title TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  referral TEXT,
  subject TEXT,
  resume_url TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT career_applications_status_check
    CHECK (status IN ('new','reviewing','shortlisted','rejected','hired'))
);

CREATE INDEX IF NOT EXISTS idx_career_jobs_active_sort
  ON public.career_jobs(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_career_applications_created
  ON public.career_applications(created_at DESC);

ALTER TABLE public.career_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "career_jobs_public_read" ON public.career_jobs;
CREATE POLICY "career_jobs_public_read"
  ON public.career_jobs FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "career_jobs_admin_manage" ON public.career_jobs;
CREATE POLICY "career_jobs_admin_manage"
  ON public.career_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "career_applications_admin_manage" ON public.career_applications;
CREATE POLICY "career_applications_admin_manage"
  ON public.career_applications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Public submissions go through the Next.js API using the service role key.

INSERT INTO public.career_jobs (title, badge, description, details, sort_order, is_active)
VALUES
  (
    'Sales Senior Director',
    'Full-Time',
    'We are seeking an experienced and dynamic Senior Sales Director to lead and drive our sales team to achieve exceptional results. The ideal candidate will have a proven track record in sales leadership, strategic planning, and building high-performing teams.',
    ARRAY['Client Relationship Management','Performance Management','Sales Strategy Development','Team Leadership','The type of employment - full-time, part-time, or independent contractor.'],
    0,
    TRUE
  ),
  (
    'OJT (On the Job Training)',
    'Student',
    'Our company is looking for enthusiastic and driven OJT students eager to gain hands-on experience in a professional setting. This is an excellent opportunity to enhance your skills, build your portfolio, and learn from industry professionals.',
    ARRAY['Assist in daily real estate operations','Support marketing and social media efforts','Learn property listing and documentation','Shadow senior agents during property viewings','School endorsement / OJT contract required'],
    1,
    TRUE
  )
ON CONFLICT DO NOTHING;
