-- ============================================
-- Fix RLS policies for special tables (no user_id column)
-- Date: 2026-07-03
-- Description: Fix tables like 'tags' that don't have user_id
--              These tables should be accessible to all authenticated users
-- ============================================

-- ============================================
-- 1. Check tables with RLS but no policies
-- ============================================

-- Find tables with RLS enabled but no policies
SELECT 
    t.tablename,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE 'sql_%'
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- ============================================
-- 2. Fix tags table - all authenticated users can access
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tags') THEN
        -- Drop existing incorrect policy if any
        DROP POLICY IF EXISTS "tags_own" ON public.tags;
        DROP POLICY IF EXISTS "tags_select" ON public.tags;
        DROP POLICY IF EXISTS "tags_all" ON public.tags;
        
        -- Create policy: all authenticated users can do everything
        CREATE POLICY "tags_all_authenticated" ON public.tags
          FOR ALL USING (auth.uid() IS NOT NULL)
          WITH CHECK (auth.uid() IS NOT NULL);
        
        RAISE NOTICE 'Policy created: tags_all_authenticated';
    ELSE
        RAISE NOTICE 'Table tags does not exist';
    END IF;
END $$;

-- ============================================
-- 3. Fix other tables with similar issues
-- (tables with RLS but no user_id column)
-- ============================================

DO $$
DECLARE
    t RECORD;
    has_user_col BOOLEAN;
    has_owner_col BOOLEAN;
    has_created_col BOOLEAN;
BEGIN
    FOR t IN 
        SELECT DISTINCT p.tablename
        FROM pg_policies p
        WHERE p.schemaname = 'public'
        AND p.policyname LIKE '%_own'
        AND p.cmd = 'SELECT'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            AND c.table_name = p.tablename
            AND c.column_name IN ('user_id', 'owner_id', 'created_by')
        )
    LOOP
        -- Check if this table has user_id (in case the policy was already correct)
        has_user_col := EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            AND c.table_name = t.tablename
            AND c.column_name = 'user_id'
        );
        
        IF NOT has_user_col THEN
            RAISE NOTICE 'Table % has _own policy but no user column - needs fix', t.tablename;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 4. Show all current policies for verification
-- ============================================

SELECT 
    policyname, 
    tablename, 
    cmd,
    permissive,
    CASE WHEN cmd = 'SELECT' THEN qual ELSE '(see WITH CHECK)' END as using_clause,
    CASE WHEN cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL') THEN qual ELSE '(see USING)' END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public'
AND policyname LIKE '%_own'
ORDER BY tablename, policyname;

-- ============================================
-- 5. Final verification
-- ============================================

SELECT 
    'Tables with RLS' as metric, 
    COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 
    'RLS Policies' as metric, 
    COUNT(*)::text as count
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 
    'Tables with RLS but NO policies' as metric,
    COUNT(*)::text as count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE 'sql_%'
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0;
