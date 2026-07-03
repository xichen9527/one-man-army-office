-- ============================================
-- Enable RLS on all public tables (Smart Version)
-- Date: 2026-07-03
-- Description: Fix all RLS Disabled in Public errors
--              Auto-detects column structure and creates appropriate policies
-- ============================================

-- ============================================
-- 1. Enable RLS on ALL public tables
-- ============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
        AND tablename NOT IN (
            -- Skip Supabase system tables
            'schema_migrations', 'migrations', 'supabase_migrations',
            -- Skip storage tables (managed by Supabase)
            'storage_objects', 'storage_buckets', 'storage_prefixes'
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
            RAISE NOTICE 'RLS enabled on: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- 2. Auto-create RLS policies based on column structure
-- ============================================

DO $$
DECLARE
    t RECORD;
    c RECORD;
    id_col TEXT;
    user_col TEXT;
    has_user BOOLEAN;
    has_owner BOOLEAN;
    has_created BOOLEAN;
BEGIN
    -- For each table with RLS enabled
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
    LOOP
        has_user := false;
        has_owner := false;
        has_created := false;
        id_col := NULL;
        user_col := NULL;
        
        -- Check what columns this table has
        FOR c IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = t.tablename
        LOOP
            IF c.column_name = 'user_id' THEN has_user := true; user_col := 'user_id'; END IF;
            IF c.column_name = 'owner_id' THEN has_owner := true; user_col := 'owner_id'; END IF;
            IF c.column_name = 'created_by' THEN has_created := true; user_col := 'created_by'; END IF;
            IF c.column_name = 'id' AND id_col IS NULL THEN id_col := 'id'; END IF;
        END LOOP;
        
        -- Create policy based on available columns
        IF user_col IS NOT NULL THEN
            -- Table has user_id/owner_id/created_by - create user-scoped policy
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t.tablename || '_own', t.tablename);
                EXECUTE format('
                    CREATE POLICY %I ON public.%I
                    FOR ALL USING (auth.uid()::text = %I)
                    WITH CHECK (auth.uid()::text = %I)
                ', t.tablename || '_own', t.tablename, user_col, user_col);
                RAISE NOTICE 'Policy created: %_own (using %)', t.tablename, user_col;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Policy skipped for %: %', t.tablename, SQLERRM;
            END;
        ELSIF id_col = 'id' THEN
            -- Table only has 'id' - create self-only policy
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t.tablename || '_own', t.tablename);
                EXECUTE format('
                    CREATE POLICY %I ON public.%I
                    FOR ALL USING (auth.uid()::text = id)
                    WITH CHECK (auth.uid()::text = id)
                ', t.tablename || '_own', t.tablename);
                RAISE NOTICE 'Policy created: %_own (using id)', t.tablename;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Policy skipped for %: %', t.tablename, SQLERRM;
            END;
        ELSE
            -- Table has no identifiable user column - allow all authenticated
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t.tablename || '_auth_all', t.tablename);
                EXECUTE format('
                    CREATE POLICY %I ON public.%I
                    FOR ALL USING (auth.uid() IS NOT NULL)
                    WITH CHECK (auth.uid() IS NOT NULL)
                ', t.tablename || '_auth_all', t.tablename);
                RAISE NOTICE 'Policy created: %_auth_all (no user column)', t.tablename;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Policy skipped for %: %', t.tablename, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 3. Special handling for specific tables
-- ============================================

-- Profiles: users can only update their own profile
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
        CREATE POLICY "profiles_own" ON public.profiles
          FOR ALL USING (auth.uid()::text = id)
          WITH CHECK (auth.uid()::text = id);
        RAISE NOTICE 'Special policy: profiles_own';
    END IF;
END $$;

-- Teams: users can be members of teams (check team_members table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
        DROP POLICY IF EXISTS "teams_member" ON public.teams;
        CREATE POLICY "teams_member" ON public.teams
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.team_members tm 
              WHERE tm.team_id = teams.id 
              AND tm.user_id = auth.uid()::text
            )
            OR auth.uid()::text = owner_id
          );
        RAISE NOTICE 'Special policy: teams_member';
    END IF;
END $$;

-- Channels: users can access channels they're members of
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'channels') THEN
        DROP POLICY IF EXISTS "channels_member" ON public.channels;
        CREATE POLICY "channels_member" ON public.channels
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.channel_members cm 
              WHERE cm.channel_id = channels.id 
              AND cm.user_id = auth.uid()::text
            )
          );
        RAISE NOTICE 'Special policy: channels_member';
    END IF;
END $$;

-- ============================================
-- 4. Grant permissions
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================
-- 5. Verification
-- ============================================

SELECT 
    schemaname, 
    tablename, 
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
ORDER BY tablename;

-- Count summary
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

-- List all policies
SELECT policyname, tablename, permissive, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
