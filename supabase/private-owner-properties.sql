-- Allow listings owned by private individuals to have no developer partner.
-- Run this in the Supabase SQL Editor for the live project.

ALTER TABLE public.properties
  ALTER COLUMN developer_id DROP NOT NULL;
