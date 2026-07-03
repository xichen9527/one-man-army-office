-- ============================================
-- Fix ALL 34 RLS Errors - SAFE Version
-- Date: 2026-07-03
-- Description: Check column existence before using it
-- ============================================

-- ============================================
-- STEP 1: Show tables without RLS
-- ============================================

SELECT 'BEFORE: Tables without RLS' as step, tablename, 'No RLS' as issue
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

-- ============================================
-- STEP 2: Enable RLS on known tables
-- ============================================

ALTER TABLE IF EXISTS public.social_media_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lnum ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create policies (check column first)
-- ============================================

-- social_media_analytics (has user_id)
DROP POLICY IF EXISTS "social_media_analytics_own" ON public.social_media_analytics;
CREATE POLICY "social_media_analytics_own" ON public.social_media_analytics
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- test_table (no user_id, allow all auth)
DROP POLICY IF EXISTS "test_table_all_auth" ON public.test_table;
CREATE POLICY "test_table_all_auth" ON public.test_table
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- document_versions (allow all auth - safer)
DROP POLICY IF EXISTS "document_versions_all_auth" ON public.document_versions;
CREATE POLICY "document_versions_all_auth" ON public.document_versions
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- task_comments (allow all auth - safer)
DROP POLICY IF EXISTS "task_comments_all_auth" ON public.task_comments;
CREATE POLICY "task_comments_all_auth" ON public.task_comments
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- customer_interactions (allow all auth - safer)
DROP POLICY IF EXISTS "customer_interactions_all_auth" ON public.customer_interactions;
CREATE POLICY "customer_interactions_all_auth" ON public.customer_interactions
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- lnum (test table, allow all auth)
DROP POLICY IF EXISTS "lnum_all_auth" ON public.lnum;
CREATE POLICY "lnum_all_auth" ON public.lnum
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- automation_workflows (allow all auth - safer)
DROP POLICY IF EXISTS "automation_workflows_all_auth" ON public.automation_workflows;
CREATE POLICY "automation_workflows_all_auth" ON public.automation_workflows
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- login_attempts (only insert allowed, no read)
DROP POLICY IF EXISTS "login_attempts_insert" ON public.login_attempts;
CREATE POLICY "login_attempts_insert" ON public.login_attempts
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- project_members (allow all auth - safer)
DROP POLICY IF EXISTS "project_members_all_auth" ON public.project_members;
CREATE POLICY "project_members_all_auth" ON public.project_members
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 4: AUTO-FIX remaining tables (check column first)
-- ============================================

DO $$
DECLARE
    tname text;
    user_col text;
    policy_name text;
    col_exists boolean;
BEGIN
    FOR tname IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
        AND tablename NOT IN (
            'schema_migrations', 'migrations', 'supabase_migrations',
            'storage_objects', 'storage_buckets', 'storage_prefixes'
        )
    LOOP
        -- Try to enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tname);
        
        -- Find user column
        user_col := NULL;
        SELECT column_name INTO user_col
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = tname
        AND column_name IN ('user_id', 'owner_id', 'created_by')
        LIMIT 1;
        
        -- Verify column actually exists (defensive check)
        col_exists := FALSE;
        IF user_col IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = tname
                AND column_name = user_col
            ) INTO col_exists;
        END IF;
        
        policy_name := tname || '_auto_policy';
        IF col_exists THEN
            EXECUTE format('
                CREATE POLICY %I ON public.%I
                FOR ALL TO authenticated
                USING (auth.uid()::text = %I)
                WITH CHECK (auth.uid()::text = %I)
            ', policy_name, tname, user_col, user_col);
            RAISE NOTICE 'Fixed: % (using column: %)', tname, user_col;
        ELSE
            EXECUTE format('
                CREATE POLICY %I ON public.%I
                FOR ALL TO authenticated
                USING (auth.uid() IS NOT NULL)
                WITH CHECK (auth.uid() IS NOT NULL)
            ', policy_name, tname);
            RAISE NOTICE 'Fixed: % (using auth.uid() only)', tname;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- STEP 5: Verify
-- ============================================

SELECT 'AFTER: Tables still without RLS' as step, tablename
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

-- Final summary
SELECT 'Total tables with RLS' as metric, COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 'Total policies' as metric, COUNT(*)::text as count
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 'Tables without RLS' as metric, COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
AND tablename NOT IN (
    'schema_migrations', 'migrations', 'supabase_migrations',
    'storage_objects', 'storage_buckets', 'storage_prefixes'
);
