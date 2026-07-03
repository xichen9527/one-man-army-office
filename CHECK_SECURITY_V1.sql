-- ============================================
-- Comprehensive Security Fix for Supabase V4
-- Date: 2026-07-03
-- Description: Simple version - uses only basic commands
--              Avoids complex DO block loops that may have parser issues
-- ============================================

-- ============================================
-- 1. CHECK: Find overly permissive policies (no DROP)
-- ============================================

SELECT 'OVERLY_PERMISSIVE' as check_type, tablename, policyname, qual
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual = 'true' OR qual ILIKE '%= true%' OR qual ILIKE '%(true)%')
ORDER BY tablename, policyname;

-- ============================================
-- 2. CHECK: Security Definer functions
-- ============================================

SELECT 'SEC_DEFINER' as check_type, n.nspname as schema_name, p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
AND n.nspname = 'public'
ORDER BY n.nspname, p.proname;

-- ============================================
-- 3. CHECK: Extensions in public schema
-- ============================================

SELECT 'EXT_IN_PUBLIC' as check_type, pe.extname as extension_name, pn.nspname as schema_name
FROM pg_extension pe
JOIN pg_namespace pn ON pn.oid = pe.extnamespace
WHERE pn.nspname = 'public'
ORDER BY pe.extname;

-- ============================================
-- 4. CHECK: Tables without RLS
-- ============================================

SELECT 'NO_RLS' as check_type, tablename
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
-- 5. CHECK: Tables with RLS but no policies
-- ============================================

SELECT 'RLS_NO_POLICY' as check_type, t.tablename
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
-- 6. CHECK: Duplicate policies
-- ============================================

SELECT 'DUPLICATE_POLICY' as check_type, tablename, policyname, COUNT(*) as duplicate_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1
ORDER BY tablename, policyname;

-- ============================================
-- 7. SUMMARY: Overall security status
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
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Tables without RLS' as metric, 
    COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
AND tablename NOT IN (
    'schema_migrations', 'migrations', 'supabase_migrations',
    'storage_objects', 'storage_buckets', 'storage_prefixes'
);
