-- Add the supplied developer directory as display-only developer partners.
-- No login accounts are created. Existing names are left unchanged, and rows
-- already present (case-insensitive company-name match) are skipped.

BEGIN;

DO $$
DECLARE
  company TEXT;
  base_slug TEXT;
  candidate_slug TEXT;
  suffix INTEGER;
BEGIN
  FOREACH company IN ARRAY ARRAY[
    'Apec Homes',
    'SNRDC',
    'Ovialand',
    'Axeia',
    'Borland',
    'Caya',
    'Aboitiz Land',
    '8990 Holdings Inc',
    'Raemulan Lands',
    'Phirst Park Homes',
    'Next Asia',
    'Dolmar',
    'Haus Talk Inc.',
    'Eruro Towers International Inc',
    'Moldex Reality',
    'Holiday Homes',
    'P.A Properties',
    'P.A Properties Hankyu Hasnshin',
    'Solar Resources Inc',
    'Re Oak Properties',
    'Blue Mountain Properties',
    'Mega Prestige',
    'The Hauslands',
    'Holand Realty Development Corp',
    'Century Properties',
    'Cajesar Development Corporation',
    'Lynville',
    'Fiesta Communities',
    'MyCiti Homes',
    'Ecoverde Homes'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM public.developer_partners
      WHERE lower(btrim(company_name)) = lower(btrim(company))
    ) THEN
      CONTINUE;
    END IF;

    base_slug := trim(both '-' FROM regexp_replace(lower(company), '[^a-z0-9]+', '-', 'g'));
    candidate_slug := base_slug;
    suffix := 2;

    WHILE EXISTS (
      SELECT 1 FROM public.developer_partners WHERE slug = candidate_slug
    ) LOOP
      candidate_slug := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;

    INSERT INTO public.developer_partners (
      profile_id,
      company_name,
      slug,
      is_active
    ) VALUES (
      NULL,
      company,
      candidate_slug,
      TRUE
    );
  END LOOP;
END;
$$;

COMMIT;
