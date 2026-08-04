-- Adds a display-name column to agents (public queries read full_name)
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Seeds the initial agent roster (idempotent: skips names that already exist)
INSERT INTO public.agents (full_name, license_number, specialization, is_top_agent, created_at, updated_at)
SELECT v.full_name, v.license_number, v.specialization, v.is_top_agent, NOW(), NOW()
FROM (VALUES
  ('CINDY HERMOSO',     'PRC-24444', 'Residential Sales',   TRUE),
  ('JOHN A. SMITH',     'PRC-31567', 'Luxury Listings',     FALSE),
  ('LINDA WALKER',      'PRC-40218', 'Investment Advisory', FALSE),
  ('EVAN YU',           'PRC-28771', 'Commercial Leasing',  FALSE),
  ('MARIA SANTOS',      'PRC-50122', 'Condo & Pre-selling', FALSE),
  ('ROBERT DELA CRUZ',  'PRC-51984', 'Lot & Farm Sales',    FALSE),
  ('ANGELA REYES',      'PRC-53210', 'Buyer Representation', FALSE),
  ('PAOLO MENDOZA',     'PRC-54876', 'Property Management', FALSE)
) AS v(full_name, license_number, specialization, is_top_agent)
WHERE NOT EXISTS (
  SELECT 1 FROM public.agents a WHERE a.full_name = v.full_name
);
