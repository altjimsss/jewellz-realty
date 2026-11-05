-- Run in Supabase SQL Editor to make House the umbrella property category.
-- Existing specific house categories are preserved as property_subtype values.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_subtype TEXT;

UPDATE public.properties
SET property_subtype = category::TEXT,
    category = 'house'
WHERE category::TEXT IN ('house_and_lot', 'single_attached', 'single_detached', 'duplex', 'townhouse')
  AND (property_subtype IS NULL OR property_subtype = '');
