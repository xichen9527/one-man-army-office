-- ============================================
-- Diagnose Remaining Security Issues
-- Date: 2026-07-03
-- Description: Find the exact 6 errors and 16 warnings
-- ============================================

-- ============================================
-- 1. Remaining OVERLY PERMISSIVE policies
-- ============================================

SELECT 'ERROR: OVERLY_PERMISSIVE_POLICY' as issue_type, tablename, policyname, qual
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual = 'true' OR qual ILIKE '%= true%' OR qual ILIKE '%(true)%')
ORDER BY tablename, policyname;

-- ============================================
-- 2. Remaining TABLES WITHOUT RLS
-- ============================================

SELECT 'ERROR: TABLE_WITHOUT_RLS' as issue_type, tablename
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
-- 3. Remaining RLS ENABLED BUT NO POLICY
-- ============================================

SELECT 'ERROR: RLS_NO_POLICY' as issue_type, t.tablename
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
-- 4. DUPLICATE policies
-- ============================================

SELECT 'WARNING: DUPLICATE_POLICY' as issue_type, tablename, policyname, COUNT(*) as duplicate_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1
ORDER BY tablename, policyname;

-- ============================================
-- 5. Security Definer functions
-- ============================================

SELECT 'WARNING: SECURITY_DEFINER' as issue_type, n.nspname as schema_name, p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
AND n.nspname = 'public'
ORDER BY n.nspname, p.proname;

-- ============================================
-- 6. Extensions in public schema
-- ============================================

SELECT 'WARNING: EXTENSION_IN_PUBLIC' as issue_type, pe.extname as extension_name, pn.nspname as schema_name
FROM pg_extension pe
JOIN pg_namespace pn ON pn.oid = pe.extnamespace
WHERE pn.nspname = 'public'
ORDER BY pe.extname;

-- ============================================
-- 7. Tables with multiple policies (info)
-- ============================================

SELECT 'INFO: MULTIPLE_POLICIES' as issue_type, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 3
ORDER BY policy_count DESC, tablename;

-- ============================================
-- 8. Auth schema exposure check
-- ============================================

SELECT 'CHECK: AUTH_SCHEMA_TABLES' as issue_type, tablename
FROM pg_tables 
WHERE schemaname = 'auth'
ORDER BY tablename;

-- ============================================
-- 9. Total summary
-- ============================================

SELECT 'TOTAL_RLS_TABLES' as metric, COUNT(*)::text as count
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 'TOTAL_NO_RLS_TABLES' as metric, COUNT(*)::text as count
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
UNION ALL
SELECT 'TOTAL_RLS_POLICIES' as metric, COUNT(*)::text as count
FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'TOTAL_SEC_DEFINER_FUNCTIONS' as metric, COUNT(*)::text as count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true AND n.nspname = 'public'
UNION ALL
SELECT 'TOTAL_EXTENSIONS_IN_PUBLIC' as metric, COUNT(*)::text as count
FROM pg_extension pe
JOIN pg_namespace pn ON pn.oid = pe.extnamespace
WHERE pn.nspname = 'public';
