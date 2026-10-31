-- Property walkthrough video uploads for the CMS.
-- Run this once in the Supabase SQL Editor so videos are stored in their own
-- bucket instead of the image-only "property-images" bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-videos',
  'property-videos',
  TRUE,
  314572800,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg', 'video/*']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "property_videos_public_read" ON storage.objects;
CREATE POLICY "property_videos_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'property-videos');

DROP POLICY IF EXISTS "property_videos_admin_insert" ON storage.objects;
CREATE POLICY "property_videos_admin_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'property-videos'
  AND public.is_admin()
);

DROP POLICY IF EXISTS "property_videos_admin_update" ON storage.objects;
CREATE POLICY "property_videos_admin_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'property-videos'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'property-videos'
  AND public.is_admin()
);

DROP POLICY IF EXISTS "property_videos_admin_delete" ON storage.objects;
CREATE POLICY "property_videos_admin_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'property-videos'
  AND public.is_admin()
);
