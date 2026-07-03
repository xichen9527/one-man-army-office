-- ============================================
-- Comprehensive Security Fix for Supabase V3
-- Date: 2026-07-03
-- Description: Fixed variable naming conflict issues
--              Use unique variable names to avoid conflicts with system views
-- ============================================

-- ============================================
-- 1. Drop overly permissive policies
-- ============================================

DO $$
DECLARE
    policy_rec RECORD;
    dropped_count INTEGER := 0;
BEGIN
    FOR policy_rec IN 
        SELECT tablename, policyname, qual
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        IF policy_rec.qual = 'true' 
           OR policy_rec.qual ILIKE '%= true%'
           OR policy_rec.qual ILIKE '%(true)%' THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                           policy_rec.policyname, policy_rec.tablename);
            dropped_count := dropped_count + 1;
            RAISE NOTICE 'Dropped: %.%', policy_rec.tablename, policy_rec.policyname;
        END IF;
    END LOOP;
    RAISE NOTICE 'Total policies dropped: %', dropped_count;
END $$;

-- ============================================
-- 2. Find Security Definer functions
-- ============================================

DO $$
DECLARE
    func_rec RECORD;
    definer_count INTEGER := 0;
BEGIN
    FOR func_rec IN 
        SELECT n.nspname as schema_name, p.proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.prosecdef = true
        AND n.nspname = 'public'
    LOOP
        IF func_rec.function_name NOT IN ('handle_new_user', 'handle_user_profile', 'set_updated_at') THEN
            RAISE NOTICE 'Security Definer: %.%', func_rec.schema_name, func_rec.function_name;
            definer_count := definer_count + 1;
        END IF;
    END LOOP;
    RAISE NOTICE 'Total Security Definer functions: %', definer_count;
END $$;

-- ============================================
-- 3. Find extensions in public schema
-- ============================================

DO $$
DECLARE
    ext_rec RECORD;
    ext_count INTEGER := 0;
BEGIN
    FOR ext_rec IN 
        SELECT pe.extname as extension_name, pn.nspname as schema_name
        FROM pg_extension pe
        JOIN pg_namespace pn ON pn.oid = pe.extnamespace
        WHERE pn.nspname = 'public'
    LOOP
        RAISE NOTICE 'Extension in public: %', ext_rec.extension_name;
        ext_count := ext_count + 1;
    END LOOP;
    RAISE NOTICE 'Total extensions in public: %', ext_count;
END $$;

-- ============================================
-- 4. Check for duplicate policies
-- ============================================

SELECT tablename, policyname, COUNT(*) as duplicate_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1;

-- ============================================
-- 5. Enable RLS on any missed tables
-- ============================================

DO $$
DECLARE
    tbl_rec RECORD;
    rls_enabled_count INTEGER := 0;
BEGIN
    FOR tbl_rec IN 
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
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_rec.tablename);
            rls_enabled_count := rls_enabled_count + 1;
            RAISE NOTICE 'RLS enabled: %', tbl_rec.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped %: %', tbl_rec.tablename, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE 'Total RLS enabled: %', rls_enabled_count;
END $$;

-- ============================================
-- 6. Create policies for tables without any policy
-- ============================================

DO $$
DECLARE
    tbl_rec RECORD;
    col_rec RECORD;
    user_column TEXT;
    policy_created INTEGER := 0;
BEGIN
    FOR tbl_rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
        AND NOT EXISTS (SELECT 1 FROM pg_policies pol WHERE pol.tablename = tbl_rec.tablename)
    LOOP
        user_column := NULL;
        
        FOR col_rec IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = tbl_rec.tablename
        LOOP
            IF col_rec.column_name IN ('user_id', 'owner_id', 'created_by') THEN
                user_column := col_rec.column_name;
                EXIT;
            END IF;
        END LOOP;
        
        IF user_column IS NOT NULL THEN
            EXECUTE format('
                CREATE POLICY %I ON public.%I
                FOR ALL USING (auth.uid()::text = %I)
                WITH CHECK (auth.uid()::text = %I)
            ', tbl_rec.tablename || '_own', tbl_rec.tablename, user_column, user_column);
            RAISE NOTICE 'Policy created for %: %', tbl_rec.tablename, user_column;
        ELSE
            EXECUTE format('
                CREATE POLICY %I ON public.%I
                FOR ALL USING (auth.uid() IS NOT NULL)
                WITH CHECK (auth.uid() IS NOT NULL)
            ', tbl_rec.tablename || '_auth_all', tbl_rec.tablename);
            RAISE NOTICE 'Auth-only policy for: %', tbl_rec.tablename;
        END IF;
        policy_created := policy_created + 1;
    END LOOP;
    RAISE NOTICE 'Total policies created: %', policy_created;
END $$;

-- ============================================
-- 7. Final verification
-- ============================================

DO $$
DECLARE
    no_rls_count INTEGER;
    no_policy_count INTEGER;
    definer_total INTEGER;
    bad_policy_total INTEGER;
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
    
    -- Count Security Definer functions
    SELECT COUNT(*) INTO definer_total
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true
    AND n.nspname = 'public';
    
    -- Count overly permissive policies
    SELECT COUNT(*) INTO bad_policy_total
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND (qual = 'true' OR qual ILIKE '%= true%');
    
    RAISE NOTICE '=== Final Security Status ===';
    RAISE NOTICE 'Tables without RLS: %', no_rls_count;
    RAISE NOTICE 'Tables with RLS but no policies: %', COALESCE(no_policy_count, 0);
    RAISE NOTICE 'Security Definer functions: %', definer_total;
    RAISE NOTICE 'Overly permissive policies: %', bad_policy_total;
    RAISE NOTICE '===============================';
END $$;
