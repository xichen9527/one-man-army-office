-- ============================================
-- Fix the broken social_media_analytics policy
-- Date: 2026-07-03
-- Description: Replace user_id-based policy with safe auth check
-- ============================================

-- Step 1: Drop the broken policy
DROP POLICY IF EXISTS "social_media_analytics_own" ON public.social_media_analytics;

-- Step 2: Create new safe policy
CREATE POLICY "social_media_analytics_all_auth" ON public.social_media_analytics
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Step 3: Find and fix any other policies that reference non-existent user_id columns
-- This is a list of common issues
DO $$
DECLARE
    pol_record RECORD;
    table_exists boolean;
    col_exists boolean;
BEGIN
    FOR pol_record IN 
        SELECT schemaname, tablename, policyname, qual::text as using_expr
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        -- Check if the policy uses user_id/owner_id/created_by
        IF pol_record.using_expr ILIKE '%user_id%' 
           OR pol_record.using_expr ILIKE '%owner_id%' 
           OR pol_record.using_expr ILIKE '%created_by%' THEN
            
            -- Check if table exists
            table_exists := EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = pol_record.schemaname 
                AND table_name = pol_record.tablename
            );
            
            IF table_exists THEN
                -- Check if the column actually exists
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = pol_record.schemaname
                    AND table_name = pol_record.tablename
                    AND (column_name = 'user_id' 
                         OR column_name = 'owner_id' 
                         OR column_name = 'created_by')
                ) INTO col_exists;
                
                IF NOT col_exists THEN
                    RAISE NOTICE 'Broken policy found: %.% - dropping', 
                        pol_record.tablename, pol_record.policyname;
                    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                        pol_record.policyname, pol_record.schemaname, pol_record.tablename);
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Step 4: Final verification
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
