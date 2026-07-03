-- ============================================
-- Comprehensive Security Fix for Supabase V2
-- Date: 2026-07-03
-- Description: Fixed alias conflict issue
-- ============================================

-- ============================================
-- 1. Drop overly permissive policies (USING(true))
-- ============================================

DO $$
DECLARE
    pol RECORD;
    bad_count INTEGER := 0;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname, qual
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        IF pol.qual ILIKE '%= true%' OR pol.qual = 'true' OR pol.qual ILIKE '%(true)%' THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
            bad_count := bad_count + 1;
            RAISE NOTICE 'Dropped overly permissive policy: %.%', pol.tablename, pol.policyname;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Total dropped: %', bad_count;
END $$;

-- ============================================
-- 2. Identify Security Definer functions
-- ============================================

DO $$
DECLARE
    func_rec RECORD;
    fn_count INTEGER := 0;
BEGIN
    FOR func_rec IN 
        SELECT n.nspname as schema_name, p.proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.prosecdef = true
        AND n.nspname = 'public'
    LOOP
        IF func_rec.function_name NOT IN ('handle_new_user', 'handle_user_profile', 'set_updated_at') THEN
            RAISE NOTICE 'Security Definer function found: %.%', func_rec.schema_name, func_rec.function_name;
            fn_count := fn_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Total Security Definer functions to review: %', fn_count;
END $$;

-- ============================================
-- 3. Identify extensions in public schema
-- ============================================

DO $$
DECLARE
    ext_rec RECORD;
BEGIN
    FOR ext_rec IN 
        SELECT ext.extname as ext_name, ns.nspname as schema_name
        FROM pg_extension ext
        JOIN pg_namespace ns ON ns.oid = ext.extnamespace
        WHERE ns.nspname = 'public'
    LOOP
        RAISE NOTICE 'Extension in public schema: %', ext_rec.ext_name;
    END LOOP;
END $$;

-- ============================================
-- 4. Check for duplicate policies
-- ============================================

DO $$
DECLARE
    dup_rec RECORD;
    dup_total INTEGER := 0;
BEGIN
    FOR dup_rec IN 
        SELECT tablename, policyname, COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename, policyname
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Duplicate policy: %.% (x%)', dup_rec.tablename, dup_rec.policyname, dup_rec.policy_count;
        dup_total := dup_total + 1;
    END LOOP;
    
    RAISE NOTICE 'Total duplicate policy sets: %', dup_total;
END $$;

-- ============================================
-- 5. Enable RLS on any missed tables
-- ============================================

DO $$
DECLARE
    tbl_rec RECORD;
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
            RAISE NOTICE 'RLS enabled: %', tbl_rec.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped %: %', tbl_rec.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- 6. Create policies for tables without any policy
-- ============================================

DO $$
DECLARE
    tbl_rec RECORD;
    col_rec RECORD;
    user_col TEXT;
BEGIN
    FOR tbl_rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
        AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = tbl_rec.tablename)
    LOOP
        user_col := NULL;
        
        FOR col_rec IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = tbl_rec.tablename
        LOOP
            IF col_rec.column_name IN ('user_id', 'owner_id', 'created_by') THEN
                user_col := col_rec.column_name;
                EXIT;
            END IF;
        END LOOP;
        
        IF user_col IS NOT NULL THEN
            EXECUTE format('
                CREATE POLICY %I ON public.%I
                FOR ALL USING (auth.uid()::text = %I)
                WITH CHECK (auth.uid()::text = %I)
            ', tbl_rec.tablename || '_own', tbl_rec.tablename, user_col, user_col);
            RAISE NOTICE 'Policy created: % (using %)', tbl_rec.tablename, user_col;
        ELSE
            EXECUTE format('
                CREATE POLICY %I ON public.%I
                FOR ALL USING (auth.uid() IS NOT NULL)
                WITH CHECK (auth.uid() IS NOT NULL)
            ', tbl_rec.tablename || '_auth_all', tbl_rec.tablename);
            RAISE NOTICE 'Auth-only policy for: %', tbl_rec.tablename;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 7. Final verification
-- ============================================

DO $$
DECLARE
    no_rls INTEGER;
    no_policy INTEGER;
    definer_count INTEGER;
    bad_pol INTEGER;
BEGIN
    SELECT COUNT(*) INTO no_rls
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = false
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%';
    
    SELECT COUNT(*) INTO no_policy
    FROM (
        SELECT t.tablename
        FROM pg_tables t
        LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
        WHERE t.schemaname = 'public'
        AND t.rowsecurity = true
        AND t.tablename NOT LIKE 'pg_%'
        AND t.tablename NOT LIKE 'sql_%'
        GROUP BY t.tablename
        HAVING COUNT(p.policyname) = 0
    ) sub;
    
    SELECT COUNT(*) INTO definer_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true
    AND n.nspname = 'public';
    
    SELECT COUNT(*) INTO bad_pol
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND (qual = 'true' OR qual ILIKE '%= true%');
    
    RAISE NOTICE '=== Security Status Summary ===';
    RAISE NOTICE 'Tables without RLS: %', no_rls;
    RAISE NOTICE 'Tables with RLS but no policies: %', COALESCE(no_policy, 0);
    RAISE NOTICE 'Security Definer functions (public schema): %', definer_count;
    RAISE NOTICE 'Overly permissive policies: %', bad_pol;
    RAISE NOTICE '==============================';
END $$;
