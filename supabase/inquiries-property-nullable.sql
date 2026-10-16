-- Make inquiries.property_id nullable so appointment/inquiry submissions that are
-- not tied to a specific property no longer fail with:
--   null value in column "property_id" of relation "inquiries" violates not-null constraint
-- Applied to the deployed database; kept here for reference/reproducibility.

ALTER TABLE public.inquiries ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN property_id DROP NOT NULL;
