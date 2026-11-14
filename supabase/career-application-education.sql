-- OJT application education fields. Run in the Supabase SQL Editor before deploying
-- the matching application API changes.
ALTER TABLE public.career_applications
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS course_program TEXT;
