-- AI-powered property recommendations with Supabase pgvector.
-- Run this in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS embedding_text TEXT,
ADD COLUMN IF NOT EXISTS embedding VECTOR(384),
ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.build_property_embedding_text(
	p_title TEXT,
	p_category TEXT,
	p_status TEXT,
	p_address TEXT,
	p_city TEXT,
	p_province TEXT,
	p_price NUMERIC,
	p_bedrooms INTEGER,
	p_bathrooms INTEGER,
	p_floor_area_sqm NUMERIC,
	p_lot_area_sqm NUMERIC,
	p_floor_count INTEGER,
	p_parking_slots INTEGER,
	p_description TEXT,
	p_key_features TEXT[],
	p_amenities TEXT[],
	p_nearby_landmarks TEXT[]
)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
	SELECT concat_ws(
		' | ',
		'Title: ' || COALESCE(p_title, ''),
		'Type: ' || COALESCE(p_category, ''),
		'Status: ' || COALESCE(p_status, ''),
		'Location: ' || concat_ws(', ', NULLIF(p_address, ''), NULLIF(p_city, ''), NULLIF(p_province, '')),
		'Price PHP: ' || COALESCE(p_price::TEXT, ''),
		'Bedrooms: ' || COALESCE(p_bedrooms::TEXT, ''),
		'Bathrooms: ' || COALESCE(p_bathrooms::TEXT, ''),
		'Floor area sqm: ' || COALESCE(p_floor_area_sqm::TEXT, ''),
		'Lot area sqm: ' || COALESCE(p_lot_area_sqm::TEXT, ''),
		'Floors: ' || COALESCE(p_floor_count::TEXT, ''),
		'Parking slots: ' || COALESCE(p_parking_slots::TEXT, ''),
		'Description: ' || COALESCE(p_description, ''),
		'Features: ' || COALESCE(array_to_string(p_key_features, ', '), ''),
		'Amenities: ' || COALESCE(array_to_string(p_amenities, ', '), ''),
		'Nearby: ' || COALESCE(array_to_string(p_nearby_landmarks, ', '), '')
	);
$$;

CREATE OR REPLACE FUNCTION public.refresh_property_embedding_text()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
		NEW.embedding_text := public.build_property_embedding_text(
		NEW.title::TEXT,
		NEW.category::TEXT,
		NEW.status::TEXT,
		NEW.address::TEXT,
		NEW.city::TEXT,
		NEW.province::TEXT,
		NEW.price::NUMERIC,
		NEW.bedrooms::INTEGER,
		NEW.bathrooms::INTEGER,
		NEW.floor_area_sqm::NUMERIC,
		NEW.lot_area_sqm::NUMERIC,
		NEW.floor_count::INTEGER,
		NEW.parking_slots::INTEGER,
		NEW.description::TEXT,
		NEW.key_features::TEXT[],
		NEW.amenities::TEXT[],
		NEW.nearby_landmarks::TEXT[]
	);

	IF TG_OP = 'UPDATE' AND NEW.embedding_text IS DISTINCT FROM OLD.embedding_text THEN
		NEW.embedding = NULL;
		NEW.embedding_updated_at = NULL;
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_property_embedding_text ON public.properties;

CREATE TRIGGER trg_refresh_property_embedding_text
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.refresh_property_embedding_text();

UPDATE public.properties
SET embedding_text = public.build_property_embedding_text(
	title::TEXT,
	category::TEXT,
	status::TEXT,
	address::TEXT,
	city::TEXT,
	province::TEXT,
	price::NUMERIC,
	bedrooms::INTEGER,
	bathrooms::INTEGER,
	floor_area_sqm::NUMERIC,
	lot_area_sqm::NUMERIC,
	floor_count::INTEGER,
	parking_slots::INTEGER,
	description::TEXT,
	key_features::TEXT[],
	amenities::TEXT[],
	nearby_landmarks::TEXT[]
)
WHERE embedding_text IS NULL;

CREATE INDEX IF NOT EXISTS properties_embedding_hnsw_idx
ON public.properties
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION public.match_recommended_properties(
	query_embedding VECTOR(384),
	match_count INTEGER DEFAULT 6,
	category_filter TEXT DEFAULT NULL,
	min_price NUMERIC DEFAULT NULL,
	max_price NUMERIC DEFAULT NULL
)
RETURNS TABLE (
	id UUID,
	similarity DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT
		p.id,
		1 - (p.embedding <=> query_embedding) AS similarity
	FROM public.properties p
	WHERE p.status::TEXT = 'published'
		AND p.embedding IS NOT NULL
		AND (category_filter IS NULL OR lower(p.category::TEXT) = lower(category_filter))
		AND (min_price IS NULL OR p.price >= min_price)
		AND (max_price IS NULL OR p.price <= max_price)
	ORDER BY p.embedding <=> query_embedding
	LIMIT LEAST(match_count, 20);
$$;
