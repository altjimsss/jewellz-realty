-- Dedicated storage bucket for applicant CVs.
-- Run this once in the Supabase SQL Editor for the project used by the website.
-- Public access is required by the current application workflow, which saves a
-- direct resume URL in career_applications and includes it in admin notifications.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'career-resumes',
  'career-resumes',
  TRUE,
  5242880,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
