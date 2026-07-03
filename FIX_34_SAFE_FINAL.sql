-- ============================================
-- Fix ALL 34 RLS Errors - ULTRA SAFE Version
-- Date: 2026-07-03
-- Description: All operations check if table exists first
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
-- STEP 2: Enable RLS on known tables (with IF EXISTS)
-- ============================================

DO $$
BEGIN
    BEGIN ALTER TABLE public.social_media_analytics ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped social_media_analytics'; END;
    BEGIN ALTER TABLE public.test_table ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped test_table'; END;
    BEGIN ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped document_versions'; END;
    BEGIN ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped task_comments'; END;
    BEGIN ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped customer_interactions'; END;
    BEGIN ALTER TABLE public.lnum ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'lnum does not exist - skipped'; END;
    BEGIN ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped automation_workflows'; END;
    BEGIN ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped login_attempts'; END;
    BEGIN ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped project_members'; END;
END $$;

-- ============================================
-- STEP 3: Create policies (check if table exists first)
-- ============================================

-- social_media_analytics (use auth check since column may not exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_media_analytics') THEN
        DROP POLICY IF EXISTS "social_media_analytics_all_auth" ON public.social_media_analytics;
        CREATE POLICY "social_media_analytics_all_auth" ON public.social_media_analytics
          FOR ALL TO authenticated
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- test_table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_table') THEN
        DROP POLICY IF EXISTS "test_table_all_auth" ON public.test_table;
        CREATE POLICY "test_table_all_auth" ON public.test_table
          FOR ALL TO authenticated
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- document_versions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_versions') THEN
        DROP POLICY IF EXISTS "document_versions_all_auth" ON public.document_versions;
        CREATE POLICY "document_versions_all_auth" ON public.document_versions
          FOR ALL TO authenticated
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- task_comments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_comments') THEN
        DROP POLICY IF EXISTS "task_comments_all_auth" ON public.task_comments;
        CREATE POLICY "task_comments_all_auth" ON public.task_comments
          FOR ALL TO authenticated
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- customer_interactions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_interactions') THEN
        DROP POLICY IF EXISTS "customer_interactions_all_auth" ON public.customer_interactions;
        CREATE POLICY "customer_interactions_all_auth" ON public.customer_interactions
          FOR ALL TO authenticated
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- lnum (might not exist - check first)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lnum') THEN
        DROP POLICY IF EXISTS "lnum_all_auth" ON public.lnum;
        CREATE POLICY "lnum_all_auth" ON public.lnum
          FOR ALL TO authenticated
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    ELSE
        RAISE NOTICE 'Table lnum does not exist - skipped';
    END IF;
END $$;

-- automation_workflows
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_workflows') THEN
        DROP POLICY IF EXISTS "automation_workflows_all_auth" ON public.automation_workflows;
        CREATE POLICY "automation_workflows_all_auth" ON public.automation_workflows
          FOR ALL TO authenticated
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- login_attempts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'login_attempts') THEN
        DROP POLICY IF EXISTS "login_attempts_insert" ON public.login_attempts;
        CREATE POLICY "login_attempts_insert" ON public.login_attempts
          FOR INSERT TO authenticated
          WITH CHECK (true);
    END IF;
END $$;

-- project_members
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_members') THEN
        DROP POLICY IF EXISTS "project_members_all_auth" ON public.project_members;
        CREATE POLICY "project_members_all_auth" ON public.project_members
          FOR ALL TO authenticated
          USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- ============================================
-- STEP 4: AUTO-FIX any other tables without RLS
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
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tname);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to enable RLS on %: %', tname, SQLERRM;
            CONTINUE;
        END;
        
        user_col := NULL;
        SELECT column_name INTO user_col
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = tname
        AND column_name IN ('user_id', 'owner_id', 'created_by')
        LIMIT 1;
        
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
            -- Check if policy already exists first
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE schemaname = 'public' 
                AND tablename = tname
            ) THEN
                EXECUTE format('
                    CREATE POLICY %I ON public.%I
                    FOR ALL TO authenticated
                    USING (auth.uid()::text = %I)
                    WITH CHECK (auth.uid()::text = %I)
                ', policy_name, tname, user_col, user_col);
                RAISE NOTICE 'Fixed: % (using %)', tname, user_col;
            ELSE
                RAISE NOTICE 'Skipped: % (already has policy)', tname;
            END IF;
        ELSE
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE schemaname = 'public' 
                AND tablename = tname
            ) THEN
                EXECUTE format('
                    CREATE POLICY %I ON public.%I
                    FOR ALL TO authenticated
                    USING (auth.uid() IS NOT NULL)
                    WITH CHECK (auth.uid() IS NOT NULL)
                ', policy_name, tname);
                RAISE NOTICE 'Fixed: % (auth only)', tname;
            ELSE
                RAISE NOTICE 'Skipped: % (already has policy)', tname;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- STEP 5: Verify final state
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
SELECT 'Tables with RLS' as metric, COUNT(*)::text as count
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
