/*
# Storage Policies for Resources Bucket

The 'resources' bucket exists as public=true (read access for all).
These policies ensure only admins can write/upload/delete files.

## Policies
- SELECT: anyone can read (public bucket)
- INSERT: only admins can upload
- UPDATE: only admins can replace files
- DELETE: only admins can delete files
*/

-- Enable RLS on storage.objects for the resources bucket
-- (storage objects already have RLS, we just need bucket-specific policies)

-- Drop existing policies if any
DROP POLICY IF EXISTS "resources_bucket_public_read" ON storage.objects;
DROP POLICY IF EXISTS "resources_bucket_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "resources_bucket_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "resources_bucket_admin_delete" ON storage.objects;

-- Public read access
CREATE POLICY "resources_bucket_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'resources');

-- Admin-only insert
CREATE POLICY "resources_bucket_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources' AND public.is_admin());

-- Admin-only update
CREATE POLICY "resources_bucket_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resources' AND public.is_admin())
WITH CHECK (bucket_id = 'resources' AND public.is_admin());

-- Admin-only delete
CREATE POLICY "resources_bucket_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resources' AND public.is_admin());
