-- ============================================
-- Comprehensive Security Fix for Supabase
-- Date: 2026-07-03
-- Description: Fix all common Supabase security warnings/errors
-- ============================================

-- ============================================
-- 1. Drop overly permissive policies (USING(true) or WITH CHECK(true))
-- ============================================

DO $$
DECLARE
    p RECORD;
    bad_policies TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR p IN 
        SELECT schemaname, tablename, policyname, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        -- Drop policies that are too permissive
        IF p.qual ILIKE '%true%' OR p.qual ILIKE '%auth.uid() IS NOT NULL%' AND p.qual NOT ILIKE '%::text%' THEN
            bad_policies := bad_policies || ARRAY[p.tablename || '.' || p.policyname];
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
            RAISE NOTICE 'Dropped overly permissive policy: %.%', p.tablename, p.policyname;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Dropped % overly permissive policies', array_length(bad_policies, 1);
END $$;

-- ============================================
-- 2. Fix Security Definer functions
-- ============================================

-- Function to make functions more secure
DO $$
DECLARE
    f RECORD;
    fn_count INTEGER := 0;
BEGIN
    -- Find Security Definer functions
    FOR f IN 
        SELECT n.nspname as schema, p.proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.prosecdef = true
        AND n.nspname = 'public'
    LOOP
        -- Don't change Supabase managed functions
        IF f.function_name NOT IN ('handle_new_user', 'handle_user_profile', 'set_updated_at') THEN
            RAISE NOTICE 'Security Definer function: %.%', f.schema, f.function_name;
            fn_count := fn_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Found % Security Definer functions to review', fn_count;
END $$;

-- ============================================
-- 3. Move extensions out of public schema (if applicable)
-- ============================================

-- This requires manual review as moving extensions can break things
-- List extensions in public schema
DO $$
DECLARE
    e RECORD;
BEGIN
    FOR e IN 
        SELECT extname, nspname as schema_name
        FROM pg_extension e
        JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE n.nspname = 'public'
    LOOP
        RAISE NOTICE 'Extension in public schema: %', e.extname;
    END LOOP;
END $$;

-- ============================================
-- 4. Check for duplicate policies
-- ============================================

DO $$
DECLARE
    dup RECORD;
    dup_count INTEGER := 0;
BEGIN
    FOR dup IN 
        SELECT tablename, policyname, COUNT(*) as count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename, policyname
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Duplicate policy: %.% (x%)', dup.tablename, dup.policyname, dup.count;
        dup_count := dup_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Found % duplicate policy sets', dup_count;
END $$;

-- ============================================
-- 5. Enable RLS on tables that might have been missed
-- ============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
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
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
            RAISE NOTICE 'RLS enabled: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- 6. Create policies for newly enabled RLS tables
-- ============================================

DO $$
DECLARE
    t RECORD;
    c RECORD;
    user_col TEXT;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
        AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename)
    LOOP
        user_col := NULL;
        
        -- Find user column
        FOR c IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = t.tablename
        LOOP
            IF c.column_name IN ('user_id', 'owner_id', 'created_by') THEN
                user_col := c.column_name;
                EXIT;
            END IF;
        END LOOP;
        
        IF user_col IS NOT NULL THEN
            EXECUTE format('
                CREATE POLICY %I ON public.%I
                FOR ALL USING (auth.uid()::text = %I)
                WITH CHECK (auth.uid()::text = %I)
            ', t.tablename || '_own', t.tablename, user_col, user_col);
            RAISE NOTICE 'Policy created for newly enabled: %', t.tablename;
        ELSE
            EXECUTE format('
                CREATE POLICY %I ON public.%I
                FOR ALL USING (auth.uid() IS NOT NULL)
                WITH CHECK (auth.uid() IS NOT NULL)
            ', t.tablename || '_auth_all', t.tablename);
            RAISE NOTICE 'Auth-only policy for: %', t.tablename;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 7. Final verification - count errors
-- ============================================

DO $$
DECLARE
    no_rls_count INTEGER;
    no_policy_count INTEGER;
    definer_count INTEGER;
    bad_policy_count INTEGER;
BEGIN
    -- Count tables without RLS
    SELECT COUNT(*) INTO no_rls_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = false
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%';
    
    -- Count tables with RLS but no policies
    SELECT COUNT(*) INTO no_policy_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE 'sql_%'
    GROUP BY t.tablename
    HAVING COUNT(p.policyname) = 0;
    
    -- Count Security Definer functions
    SELECT COUNT(*) INTO definer_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true
    AND n.nspname = 'public';
    
    -- Count overly permissive policies
    SELECT COUNT(*) INTO bad_policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND (qual ILIKE '%true%' OR (qual ILIKE '%auth.uid() IS NOT NULL%' AND qual NOT ILIKE '%::text%'));
    
    RAISE NOTICE '=== Security Status ===';
    RAISE NOTICE 'Tables without RLS: %', no_rls_count;
    RAISE NOTICE 'Tables with RLS but no policies: %', COALESCE(no_policy_count, 0);
    RAISE NOTICE 'Security Definer functions: %', definer_count;
    RAISE NOTICE 'Overly permissive policies: %', bad_policy_count;
    RAISE NOTICE '========================';
END $$;
