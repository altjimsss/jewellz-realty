-- Allow locations without a province, including cities in Metro Manila (NCR).
-- Run this in the Supabase SQL Editor for the live project.

ALTER TABLE public.properties
  ALTER COLUMN province DROP NOT NULL;
