-- Cached OpenStreetMap nearby places per property.
-- Run this in Supabase SQL Editor or with `supabase db query --linked --file`.

CREATE TABLE IF NOT EXISTS public.property_nearby_places (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
	category TEXT NOT NULL CHECK (category IN ('Education', 'Health', 'Food', 'Culture')),
	name TEXT NOT NULL,
	distance_meters INTEGER NOT NULL,
	latitude NUMERIC(10, 7),
	longitude NUMERIC(10, 7),
	address TEXT,
	map_uri TEXT,
	source TEXT NOT NULL DEFAULT 'openstreetmap',
	fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (property_id, category, name)
);

CREATE INDEX IF NOT EXISTS property_nearby_places_property_idx
ON public.property_nearby_places(property_id);

CREATE INDEX IF NOT EXISTS property_nearby_places_category_idx
ON public.property_nearby_places(category);

ALTER TABLE public.property_nearby_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nearby places are publicly readable" ON public.property_nearby_places;

CREATE POLICY "Nearby places are publicly readable"
ON public.property_nearby_places
FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Service role can manage nearby places" ON public.property_nearby_places;

CREATE POLICY "Service role can manage nearby places"
ON public.property_nearby_places
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
