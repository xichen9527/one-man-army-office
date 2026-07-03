-- ============================================
-- Fix 44 Errors - Simple Version
-- Date: 2026-07-03
-- Description: Minimal SQL, no complex subqueries
-- ============================================

-- ============================================
-- STEP 1: Drop overly permissive policies
-- ============================================

DROP POLICY IF EXISTS "Your existing RLS policy" ON public.social_media_posts;
DROP POLICY IF EXISTS "Your existing RLS policy" ON public.social_media_accounts;

-- ============================================
-- STEP 2: Enable RLS on 10 tables
-- ============================================

ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create simple policies (use user_id column)
-- ============================================

-- Social media accounts
CREATE POLICY "social_media_accounts_own" ON public.social_media_accounts
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Social media posts
CREATE POLICY "social_media_posts_own" ON public.social_media_posts
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Social media analytics
CREATE POLICY "social_media_analytics_own" ON public.social_media_analytics
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

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

-- Tags (all authenticated users)
CREATE POLICY "tags_all_auth" ON public.tags
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- User roles (all can read, all can modify - simple version)
CREATE POLICY "user_roles_read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_roles_write" ON public.user_roles
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Audit logs
CREATE POLICY "audit_logs_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Workspace templates
CREATE POLICY "workspace_templates_own" ON public.workspace_templates
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Documents (use user_id if exists, otherwise allow all auth)
CREATE POLICY "documents_read" ON public.documents
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "documents_write" ON public.documents
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Video conferences
CREATE POLICY "video_conferences_select" ON public.video_conferences
  FOR SELECT TO authenticated
  USING (auth.uid()::text = host_id);

CREATE POLICY "video_conferences_insert" ON public.video_conferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = host_id);

CREATE POLICY "video_conferences_update" ON public.video_conferences
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = host_id);

CREATE POLICY "video_conferences_delete" ON public.video_conferences
  FOR DELETE TO authenticated
  USING (auth.uid()::text = host_id);

-- ============================================
-- STEP 4: Verification
-- ============================================

SELECT 'Tables with RLS' as metric, COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

SELECT 'RLS Policies' as metric, COUNT(*)::text as count
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 'Tables without RLS' as metric, COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
AND tablename NOT IN ('schema_migrations', 'migrations', 'supabase_migrations',
    'storage_objects', 'storage_buckets', 'storage_prefixes');

SELECT 'Tables with RLS but no policy' as metric, COUNT(*)::text as count
FROM (
    SELECT t.tablename
    FROM pg_tables t
    LEFT JOIN pg_policies pp ON pp.tablename = t.tablename AND pp.schemaname = 'public'
    WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE 'sql_%'
    GROUP BY t.tablename
    HAVING COUNT(pp.policyname) = 0
) sub;

-- Show remaining overly permissive policies (should be 0)
SELECT tablename, policyname, qual
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual = 'true' OR qual ILIKE '%= true%');
