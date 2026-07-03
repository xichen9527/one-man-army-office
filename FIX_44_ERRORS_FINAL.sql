-- ============================================
-- Fix 44 Security Errors - Targeted Fix V5
-- Date: 2026-07-03
-- Description: Step-by-step fix for all identified issues
-- ============================================

-- ============================================
-- STEP 1: Drop overly permissive policies
-- ============================================

DROP POLICY IF EXISTS "Your existing RLS policy" ON public.social_media_posts;
DROP POLICY IF EXISTS "Your existing RLS policy" ON public.social_media_accounts;

SELECT 'Step 1 complete: Dropped 2 overly permissive policies' as status;

-- ============================================
-- STEP 2: Enable RLS on tables without RLS
-- ============================================

ALTER TABLE IF EXISTS public.social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_media_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;

SELECT 'Step 2 complete: Enabled RLS on 10 tables' as status;

-- ============================================
-- STEP 3: Create policies for newly enabled RLS tables
-- ============================================

-- Social media accounts
DROP POLICY IF EXISTS "social_media_accounts_own" ON public.social_media_accounts;
CREATE POLICY "social_media_accounts_own" ON public.social_media_accounts
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Social media posts
DROP POLICY IF EXISTS "social_media_posts_own" ON public.social_media_posts;
CREATE POLICY "social_media_posts_own" ON public.social_media_posts
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Social media analytics
DROP POLICY IF EXISTS "social_media_analytics_own" ON public.social_media_analytics;
CREATE POLICY "social_media_analytics_own" ON public.social_media_analytics
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Marketing campaigns
DROP POLICY IF EXISTS "marketing_campaigns_own" ON public.marketing_campaigns;
CREATE POLICY "marketing_campaigns_own" ON public.marketing_campaigns
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Schedules
DROP POLICY IF EXISTS "schedules_own" ON public.schedules;
CREATE POLICY "schedules_own" ON public.schedules
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Tags (all authenticated users can access shared tags)
DROP POLICY IF EXISTS "tags_all_authenticated" ON public.tags;
CREATE POLICY "tags_all_authenticated" ON public.tags
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- User roles (all can read, admin can modify)
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_modify" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "user_roles_admin_modify" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()::text
      AND ur.role = 'admin'
    )
  );

-- Audit logs (all can read, users can write their own)
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Workspace templates
DROP POLICY IF EXISTS "workspace_templates_own" ON public.workspace_templates;
CREATE POLICY "workspace_templates_own" ON public.workspace_templates
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Documents (check what columns it has)
-- Try user_id first
DROP POLICY IF EXISTS "documents_own" ON public.documents;
DROP POLICY IF EXISTS "documents_owner" ON public.documents;
DROP POLICY IF EXISTS "documents_uploaded" ON public.documents;

DO $$
BEGIN
    -- Try user_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'user_id') THEN
        CREATE POLICY "documents_own" ON public.documents
          FOR ALL USING (auth.uid()::text = user_id)
          WITH CHECK (auth.uid()::text = user_id);
    -- Try owner_id column
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'owner_id') THEN
        CREATE POLICY "documents_own" ON public.documents
          FOR ALL USING (auth.uid()::text = owner_id)
          WITH CHECK (auth.uid()::text = owner_id);
    -- Try uploaded_by column
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by') THEN
        CREATE POLICY "documents_own" ON public.documents
          FOR ALL USING (auth.uid()::text = uploaded_by)
          WITH CHECK (auth.uid()::text = uploaded_by);
    -- Try created_by column
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'created_by') THEN
        CREATE POLICY "documents_own" ON public.documents
          FOR ALL USING (auth.uid()::text = created_by)
          WITH CHECK (auth.uid()::text = created_by);
    -- Fallback: all authenticated users
    ELSE
        CREATE POLICY "documents_all_auth" ON public.documents
          FOR ALL USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Video conferences
DROP POLICY IF EXISTS "video_conferences_select_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_insert_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_update_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_delete_own" ON public.video_conferences;

CREATE POLICY "video_conferences_select_own" ON public.video_conferences
  FOR SELECT USING (auth.uid()::text = host_id OR auth.uid()::text = ANY(participants));

CREATE POLICY "video_conferences_insert_own" ON public.video_conferences
  FOR INSERT WITH CHECK (auth.uid()::text = host_id);

CREATE POLICY "video_conferences_update_own" ON public.video_conferences
  FOR UPDATE USING (auth.uid()::text = host_id);

CREATE POLICY "video_conferences_delete_own" ON public.video_conferences
  FOR DELETE USING (auth.uid()::text = host_id);

SELECT 'Step 3 complete: Created policies for all tables' as status;

-- ============================================
-- STEP 4: Re-run CHECK to verify
-- ============================================

SELECT 'OVERLY_PERMISSIVE_RECHECK' as check_type, tablename, policyname, qual
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual = 'true' OR qual ILIKE '%= true%' OR qual ILIKE '%(true)%')
ORDER BY tablename, policyname;

SELECT 'NO_RLS_RECHECK' as check_type, tablename
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
AND tablename NOT IN (
    'schema_migrations', 'migrations', 'supabase_migrations',
    'storage_objects', 'storage_buckets', 'storage_prefixes'
)
ORDER BY tablename;

SELECT 'RLS_NO_POLICY_RECHECK' as check_type, t.tablename
FROM pg_tables t
LEFT JOIN pg_policies pp ON pp.tablename = t.tablename AND pp.schemaname = 'public'
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE 'sql_%'
GROUP BY t.tablename
HAVING COUNT(pp.policyname) = 0
ORDER BY t.tablename;

-- ============================================
-- Final summary
-- ============================================

SELECT 'Tables with RLS' as metric, COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 'RLS Policies' as metric, COUNT(*)::text as count
FROM pg_policies 
WHERE schemaname = 'public';
