-- Indexes to speed up the property detail page queries.
-- Run this in Supabase SQL Editor or with `supabase db query --linked --file`.

-- Speeds up getPublishedPropertyBySlug (single property lookup by slug + status)
CREATE INDEX IF NOT EXISTS idx_properties_slug_status
ON public.properties(slug, status);

-- Speeds up getPublishedProperties / getRelatedProperties (listing + related queries)
CREATE INDEX IF NOT EXISTS idx_properties_status_created
ON public.properties(status, created_at DESC);

-- Speeds up category-scoped related-property lookups
CREATE INDEX IF NOT EXISTS idx_properties_status_category_created
ON public.properties(status, category, created_at DESC);
