-- ============================================
-- Verify RLS Status - Fixed Version
-- Date: 2026-07-03
-- Description: Get the actual current state of RLS
-- ============================================

-- ============================================
-- 1. Check if RLS is actually enabled on specific tables
-- ============================================

SELECT 
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND c.relname IN (
    'tags', 'social_media_accounts', 'marketing_campaigns', 
    'schedules', 'user_roles', 'audit_logs', 'social_media_posts',
    'workspace_templates', 'documents', 'video_conferences'
)
ORDER BY c.relname;

-- ============================================
-- 2. Check policies on these tables
-- ============================================

SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    permissive, 
    substring(qual::text, 1, 100) as using_expression
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'tags', 'social_media_accounts', 'marketing_campaigns', 
    'schedules', 'user_roles', 'audit_logs', 'social_media_posts',
    'workspace_templates', 'documents', 'video_conferences'
)
ORDER BY tablename, policyname;

-- ============================================
-- 3. Re-enable RLS on all mentioned tables (idempotent)
-- ============================================

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_conferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Ensure all needed policies exist
-- ============================================

-- For tags (shared by all users)
DROP POLICY IF EXISTS "tags_all_auth" ON public.tags;
DROP POLICY IF EXISTS "tags_all_authenticated" ON public.tags;
CREATE POLICY "tags_all_auth" ON public.tags
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- For social_media_accounts
DROP POLICY IF EXISTS "social_media_accounts_own" ON public.social_media_accounts;
CREATE POLICY "social_media_accounts_own" ON public.social_media_accounts
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- For social_media_posts
DROP POLICY IF EXISTS "social_media_posts_own" ON public.social_media_posts;
CREATE POLICY "social_media_posts_own" ON public.social_media_posts
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- For marketing_campaigns
DROP POLICY IF EXISTS "marketing_campaigns_own" ON public.marketing_campaigns;
CREATE POLICY "marketing_campaigns_own" ON public.marketing_campaigns
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- For schedules
DROP POLICY IF EXISTS "schedules_own" ON public.schedules;
CREATE POLICY "schedules_own" ON public.schedules
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- For user_roles (read all, write own)
DROP POLICY IF EXISTS "user_roles_read" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_write" ON public.user_roles;
CREATE POLICY "user_roles_read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "user_roles_write" ON public.user_roles
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- For audit_logs
DROP POLICY IF EXISTS "audit_logs_read" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- For workspace_templates
DROP POLICY IF EXISTS "workspace_templates_own" ON public.workspace_templates;
CREATE POLICY "workspace_templates_own" ON public.workspace_templates
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- For documents (all authenticated)
DROP POLICY IF EXISTS "documents_read" ON public.documents;
DROP POLICY IF EXISTS "documents_write" ON public.documents;
CREATE POLICY "documents_read" ON public.documents
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "documents_write" ON public.documents
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- For video_conferences
DROP POLICY IF EXISTS "video_conferences_select" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_insert" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_update" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_delete" ON public.video_conferences;
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
-- 5. Final verification - all should be TRUE for rls_enabled
-- ============================================

SELECT 
    c.relname as tablename,
    c.relrowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public') as policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname IN (
    'tags', 'social_media_accounts', 'marketing_campaigns', 
    'schedules', 'user_roles', 'audit_logs', 'social_media_posts',
    'workspace_templates', 'documents', 'video_conferences'
)
ORDER BY c.relname;

-- ============================================
-- 6. Summary
-- ============================================

SELECT 'Tables with RLS' as metric, COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 'Total policies' as metric, COUNT(*)::text as count
FROM pg_policies 
WHERE schemaname = 'public';
