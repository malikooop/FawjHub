/*
# FawjHub Schema - Part 2: Admin Functions and Admin Policies

1. Creates is_admin() SECURITY DEFINER function for safe admin checks in RLS
2. Adds admin write policies on subjects and resources
3. Adds increment_download_count() SECURITY DEFINER function
4. Updates profiles SELECT to allow admin to read all profiles
*/

-- ============================================
-- IS_ADMIN FUNCTION (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================
-- UPDATE PROFILES SELECT POLICY (admin can read all)
-- ============================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

-- ============================================
-- SUBJECTS ADMIN POLICIES
-- ============================================
DROP POLICY IF EXISTS "subjects_insert_admin" ON subjects;
CREATE POLICY "subjects_insert_admin"
ON subjects FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subjects_update_admin" ON subjects;
CREATE POLICY "subjects_update_admin"
ON subjects FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subjects_delete_admin" ON subjects;
CREATE POLICY "subjects_delete_admin"
ON subjects FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- RESOURCES ADMIN POLICIES
-- ============================================
DROP POLICY IF EXISTS "resources_select_published" ON resources;
CREATE POLICY "resources_select_published"
ON resources FOR SELECT
TO anon, authenticated
USING (published = true OR public.is_admin());

DROP POLICY IF EXISTS "resources_insert_admin" ON resources;
CREATE POLICY "resources_insert_admin"
ON resources FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "resources_update_admin" ON resources;
CREATE POLICY "resources_update_admin"
ON resources FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "resources_delete_admin" ON resources;
CREATE POLICY "resources_delete_admin"
ON resources FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================
-- INCREMENT DOWNLOAD COUNT FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_download_count(resource_uuid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE resources SET download_count = download_count + 1 WHERE id = resource_uuid;
$$;
