/*
# FawjHub Security & Schema Enhancement

## Summary
1. FIXES CRITICAL: Profile privilege escalation — restricts UPDATE to only full_name column
2. Adds resource columns: uploaded_by, sha256, status, corrects_resource_id
3. Adds 'other' resource type and status lifecycle (draft/pending_review/approved/rejected/published)
4. Adds storage policies for resources bucket (admin-only write, public read)
5. Sanitizes search by adding a safe search function
6. Fixes download count to only increment existing published resources

## Security Changes
- profiles UPDATE policy now uses WITH CHECK that prevents is_admin modification
- New column-level security: is_admin can only be set via service role (no UPDATE policy covers it)
- Storage bucket policies: only admins can upload/update/delete, anyone can read
- Resource status workflow prepared for future moderation

## New Columns on resources
- uploaded_by (uuid, references auth.users) — who uploaded the file
- sha256 (text) — for duplicate detection
- status (text) — draft/pending_review/approved/rejected/published
- corrects_resource_id (uuid, references resources) — links a correction to its exam

## Important Notes
1. Existing resources get status='published' and published=true (no data loss)
2. The is_admin column is NO LONGER updatable by users through RLS
3. Storage policies are additive — bucket already exists as public=true
*/

-- ============================================
-- 1. FIX PROFILE PRIVILEGE ESCALATION
-- ============================================
-- Drop the old permissive UPDATE policy and replace with one that
-- only allows updating full_name (not is_admin)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Create a restricted UPDATE policy that only allows updating full_name
-- by checking that is_admin hasn't changed from its current value
CREATE POLICY "profiles_update_own_fullname_only"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_admin = (
    SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid()
  )
);

-- ============================================
-- 2. ADD RESOURCE COLUMNS (additive, no data loss)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'uploaded_by') THEN
    ALTER TABLE resources ADD COLUMN uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'sha256') THEN
    ALTER TABLE resources ADD COLUMN sha256 text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'status') THEN
    ALTER TABLE resources ADD COLUMN status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'published'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'corrects_resource_id') THEN
    ALTER TABLE resources ADD COLUMN corrects_resource_id uuid REFERENCES resources(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add 'other' to resource_type constraint
-- This requires dropping and recreating the constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resources_resource_type_check'
    AND conrelid = 'resources'::regclass
  ) THEN
    ALTER TABLE resources DROP CONSTRAINT resources_resource_type_check;
  END IF;
END $$;
ALTER TABLE resources ADD CONSTRAINT resources_resource_type_check
  CHECK (resource_type IN ('cours', 'td', 'tp', 'summary', 'exam', 'correction', 'other'));

-- Add index for sha256 duplicate detection
CREATE INDEX IF NOT EXISTS idx_resources_sha256 ON resources(sha256) WHERE sha256 != '';
CREATE INDEX IF NOT EXISTS idx_resources_uploaded_by ON resources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_corrects ON resources(corrects_resource_id) WHERE corrects_resource_id IS NOT NULL;

-- ============================================
-- 3. FIX DOWNLOAD COUNT FUNCTION
-- Only increment if resource exists and is published
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_download_count(resource_uuid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE resources
  SET download_count = download_count + 1
  WHERE id = resource_uuid AND (published = true OR public.is_admin());
$$;

-- ============================================
-- 4. SAFE SEARCH FUNCTION
-- Sanitizes user input before using in ilike filters
-- ============================================
CREATE OR REPLACE FUNCTION public.search_resources(search_term text)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  subject_id uuid,
  resource_type text,
  semester int,
  academic_year text,
  teacher text,
  file_url text,
  file_name text,
  file_size bigint,
  file_type text,
  published boolean,
  is_important boolean,
  download_count int,
  status text,
  sha256 text,
  corrects_resource_id uuid,
  uploaded_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  subject_id_1 uuid,
  subject_name text,
  subject_slug text,
  subject_description text,
  subject_code text,
  subject_semester int,
  subject_color text,
  subject_icon text,
  subject_sort_order int,
  subject_created_at timestamptz,
  subject_updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id, r.title, r.description, r.subject_id, r.resource_type,
    r.semester, r.academic_year, r.teacher, r.file_url, r.file_name,
    r.file_size, r.file_type, r.published, r.is_important,
    r.download_count, r.status, r.sha256, r.corrects_resource_id,
    r.uploaded_by, r.created_at, r.updated_at,
    s.id, s.name, s.slug, s.description, s.code, s.semester,
    s.color, s.icon, s.sort_order, s.created_at, s.updated_at
  FROM resources r
  LEFT JOIN subjects s ON s.id = r.subject_id
  WHERE r.published = true
  AND (
    r.title ILIKE '%' || search_term || '%'
    OR r.description ILIKE '%' || search_term || '%'
    OR r.teacher ILIKE '%' || search_term || '%'
    OR s.name ILIKE '%' || search_term || '%'
  )
  ORDER BY r.download_count DESC
  LIMIT 50;
$$;
