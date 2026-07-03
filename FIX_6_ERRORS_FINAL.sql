-- ============================================
-- Fix 6 Remaining Errors - Final Version
-- Date: 2026-07-03
-- Description: Fix all user-fixable issues
-- ============================================

-- ============================================
-- PART 1: Drop overly permissive policies
-- ============================================

DROP POLICY IF EXISTS "Your existing RLS policy" ON public.social_media_posts;
DROP POLICY IF EXISTS "Your existing RLS policy" ON public.social_media_accounts;

SELECT 'Part 1 done: Dropped 2 overly permissive policies' as status;

-- ============================================
-- PART 2: Enable RLS on 4 remaining tables
-- ============================================

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_templates ENABLE ROW LEVEL SECURITY;

SELECT 'Part 2 done: Enabled RLS on 4 tables' as status;

-- ============================================
-- PART 3: Create policies for newly enabled tables
-- ============================================

-- Marketing campaigns
CREATE POLICY "marketing_campaigns_own" ON public.marketing_campaigns
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Schedules
CREATE POLICY "schedules_own" ON public.schedules
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Tags (all authenticated users can access)
CREATE POLICY "tags_all_auth" ON public.tags
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace templates
CREATE POLICY "workspace_templates_own" ON public.workspace_templates
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

SELECT 'Part 3 done: Created policies for 4 tables' as status;

-- ============================================
-- PART 4: Fix user_roles table (RLS enabled but no policy)
-- ============================================

-- Drop the existing duplicate policies
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_modify" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_read" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_write" ON public.user_roles;

-- Create clean policies for user_roles
CREATE POLICY "user_roles_read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_roles_write" ON public.user_roles
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

SELECT 'Part 4 done: Fixed user_roles table policies' as status;

-- ============================================
-- PART 5: Re-verify all issues
-- ============================================

-- Check overly permissive policies (should be 0)
SELECT 'CHECK: OVERLY_PERMISSIVE' as check_type, tablename, policyname
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual = 'true' OR qual ILIKE '%= true%' OR qual ILIKE '%(true)%');

-- Check tables without RLS (should be 0)
SELECT 'CHECK: NO_RLS' as check_type, tablename
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
AND tablename NOT IN (
    'schema_migrations', 'migrations', 'supabase_migrations',
    'storage_objects', 'storage_buckets', 'storage_prefixes'
);

-- Check RLS enabled but no policy (should be 0)
SELECT 'CHECK: RLS_NO_POLICY' as check_type, t.tablename
FROM pg_tables t
LEFT JOIN pg_policies pp ON pp.tablename = t.tablename AND pp.schemaname = 'public'
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE 'sql_%'
GROUP BY t.tablename
HAVING COUNT(pp.policyname) = 0;

-- Check duplicate policies (should be 0)
SELECT 'CHECK: DUPLICATE_POLICY' as check_type, tablename, policyname, COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1;

-- ============================================
-- Final summary
-- ============================================

SELECT 'Final: RLS tables' as metric, COUNT(*)::text as count
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 'Final: Total policies' as metric, COUNT(*)::text as count
FROM pg_policies WHERE schemaname = 'public';
