-- Property image uploads for the CMS.
-- Run this once in Supabase SQL Editor if the "property-images" bucket does not exist yet.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "property_images_public_read" ON storage.objects;
CREATE POLICY "property_images_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "property_images_admin_insert" ON storage.objects;
CREATE POLICY "property_images_admin_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'property-images'
  AND public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "property_images_admin_update" ON storage.objects;
CREATE POLICY "property_images_admin_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'property-images'
  AND public.current_user_role() = 'admin'
)
WITH CHECK (
  bucket_id = 'property-images'
  AND public.current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "property_images_admin_delete" ON storage.objects;
CREATE POLICY "property_images_admin_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'property-images'
  AND public.current_user_role() = 'admin'
);
