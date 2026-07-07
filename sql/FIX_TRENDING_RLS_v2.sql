-- ============================================
-- RLS 策略修复脚本 v2 (修正 GRANT USAGE 语法错误)
-- 解决 fetchTrendingTopics 数据加载失败
-- 在 Supabase SQL Editor 中执行
-- ============================================
-- 创建时间: 2026-07-07T01:37:58.758Z
-- ============================================


-- ===== trending_topics =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trending_topics') THEN
    RAISE NOTICE 'Table trending_topics does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_trending_topics ON public.trending_topics';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_trending_topics ON public.trending_topics';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_trending_topics ON public.trending_topics';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_trending_topics ON public.trending_topics';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view trending_topics" ON public.trending_topics';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.trending_topics';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.trending_topics';
  EXECUTE 'DROP POLICY IF EXISTS "trending_topics_select_policy" ON public.trending_topics';
  EXECUTE 'DROP POLICY IF EXISTS "trending_topics_policy" ON public.trending_topics';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_trending_topics" ON public.trending_topics';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_trending_topics ON public.trending_topics FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_trending_topics ON public.trending_topics FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_trending_topics ON public.trending_topics FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_trending_topics ON public.trending_topics FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.trending_topics TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.trending_topics TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='trending_topics'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'trending_topics_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for trending_topics';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing trending_topics: %', SQLERRM;
END $$;

-- ===== trending_keywords =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trending_keywords') THEN
    RAISE NOTICE 'Table trending_keywords does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.trending_keywords ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_trending_keywords ON public.trending_keywords';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_trending_keywords ON public.trending_keywords';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_trending_keywords ON public.trending_keywords';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_trending_keywords ON public.trending_keywords';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view trending_keywords" ON public.trending_keywords';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.trending_keywords';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.trending_keywords';
  EXECUTE 'DROP POLICY IF EXISTS "trending_keywords_select_policy" ON public.trending_keywords';
  EXECUTE 'DROP POLICY IF EXISTS "trending_keywords_policy" ON public.trending_keywords';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_trending_keywords" ON public.trending_keywords';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_trending_keywords ON public.trending_keywords FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_trending_keywords ON public.trending_keywords FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_trending_keywords ON public.trending_keywords FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_trending_keywords ON public.trending_keywords FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.trending_keywords TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.trending_keywords TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='trending_keywords'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'trending_keywords_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for trending_keywords';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing trending_keywords: %', SQLERRM;
END $$;

-- ===== trending_history =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trending_history') THEN
    RAISE NOTICE 'Table trending_history does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.trending_history ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_trending_history ON public.trending_history';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_trending_history ON public.trending_history';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_trending_history ON public.trending_history';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_trending_history ON public.trending_history';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view trending_history" ON public.trending_history';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.trending_history';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.trending_history';
  EXECUTE 'DROP POLICY IF EXISTS "trending_history_select_policy" ON public.trending_history';
  EXECUTE 'DROP POLICY IF EXISTS "trending_history_policy" ON public.trending_history';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_trending_history" ON public.trending_history';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_trending_history ON public.trending_history FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_trending_history ON public.trending_history FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_trending_history ON public.trending_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_trending_history ON public.trending_history FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.trending_history TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.trending_history TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='trending_history'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'trending_history_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for trending_history';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing trending_history: %', SQLERRM;
END $$;

-- ===== ai_conversations =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_conversations') THEN
    RAISE NOTICE 'Table ai_conversations does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_ai_conversations ON public.ai_conversations';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_ai_conversations ON public.ai_conversations';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_ai_conversations ON public.ai_conversations';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_ai_conversations ON public.ai_conversations';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view ai_conversations" ON public.ai_conversations';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.ai_conversations';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.ai_conversations';
  EXECUTE 'DROP POLICY IF EXISTS "ai_conversations_select_policy" ON public.ai_conversations';
  EXECUTE 'DROP POLICY IF EXISTS "ai_conversations_policy" ON public.ai_conversations';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_ai_conversations" ON public.ai_conversations';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_ai_conversations ON public.ai_conversations FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_ai_conversations ON public.ai_conversations FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_ai_conversations ON public.ai_conversations FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_ai_conversations ON public.ai_conversations FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='ai_conversations'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'ai_conversations_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for ai_conversations';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing ai_conversations: %', SQLERRM;
END $$;

-- ===== ai_messages =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_messages') THEN
    RAISE NOTICE 'Table ai_messages does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_ai_messages ON public.ai_messages';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_ai_messages ON public.ai_messages';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_ai_messages ON public.ai_messages';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_ai_messages ON public.ai_messages';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view ai_messages" ON public.ai_messages';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.ai_messages';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.ai_messages';
  EXECUTE 'DROP POLICY IF EXISTS "ai_messages_select_policy" ON public.ai_messages';
  EXECUTE 'DROP POLICY IF EXISTS "ai_messages_policy" ON public.ai_messages';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_ai_messages" ON public.ai_messages';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_ai_messages ON public.ai_messages FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_ai_messages ON public.ai_messages FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_ai_messages ON public.ai_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_ai_messages ON public.ai_messages FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='ai_messages'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'ai_messages_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for ai_messages';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing ai_messages: %', SQLERRM;
END $$;

-- ===== approvals =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='approvals') THEN
    RAISE NOTICE 'Table approvals does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_approvals ON public.approvals';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_approvals ON public.approvals';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_approvals ON public.approvals';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_approvals ON public.approvals';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view approvals" ON public.approvals';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.approvals';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.approvals';
  EXECUTE 'DROP POLICY IF EXISTS "approvals_select_policy" ON public.approvals';
  EXECUTE 'DROP POLICY IF EXISTS "approvals_policy" ON public.approvals';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_approvals" ON public.approvals';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_approvals ON public.approvals FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_approvals ON public.approvals FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_approvals ON public.approvals FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_approvals ON public.approvals FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='approvals'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'approvals_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for approvals';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing approvals: %', SQLERRM;
END $$;

-- ===== automation_workflows =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='automation_workflows') THEN
    RAISE NOTICE 'Table automation_workflows does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_automation_workflows ON public.automation_workflows';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_automation_workflows ON public.automation_workflows';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_automation_workflows ON public.automation_workflows';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_automation_workflows ON public.automation_workflows';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view automation_workflows" ON public.automation_workflows';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.automation_workflows';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.automation_workflows';
  EXECUTE 'DROP POLICY IF EXISTS "automation_workflows_select_policy" ON public.automation_workflows';
  EXECUTE 'DROP POLICY IF EXISTS "automation_workflows_policy" ON public.automation_workflows';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_automation_workflows" ON public.automation_workflows';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_automation_workflows ON public.automation_workflows FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_automation_workflows ON public.automation_workflows FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_automation_workflows ON public.automation_workflows FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_automation_workflows ON public.automation_workflows FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_workflows TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_workflows TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='automation_workflows'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'automation_workflows_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for automation_workflows';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing automation_workflows: %', SQLERRM;
END $$;

-- ===== social_post_platforms =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_post_platforms') THEN
    RAISE NOTICE 'Table social_post_platforms does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.social_post_platforms ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_social_post_platforms ON public.social_post_platforms';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_social_post_platforms ON public.social_post_platforms';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_social_post_platforms ON public.social_post_platforms';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_social_post_platforms ON public.social_post_platforms';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view social_post_platforms" ON public.social_post_platforms';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.social_post_platforms';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.social_post_platforms';
  EXECUTE 'DROP POLICY IF EXISTS "social_post_platforms_select_policy" ON public.social_post_platforms';
  EXECUTE 'DROP POLICY IF EXISTS "social_post_platforms_policy" ON public.social_post_platforms';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_social_post_platforms" ON public.social_post_platforms';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_social_post_platforms ON public.social_post_platforms FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_social_post_platforms ON public.social_post_platforms FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_social_post_platforms ON public.social_post_platforms FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_social_post_platforms ON public.social_post_platforms FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_platforms TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_platforms TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='social_post_platforms'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'social_post_platforms_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for social_post_platforms';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing social_post_platforms: %', SQLERRM;
END $$;

-- ===== project_members =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_members') THEN
    RAISE NOTICE 'Table project_members does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_project_members ON public.project_members';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_project_members ON public.project_members';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_project_members ON public.project_members';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_project_members ON public.project_members';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view project_members" ON public.project_members';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.project_members';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.project_members';
  EXECUTE 'DROP POLICY IF EXISTS "project_members_select_policy" ON public.project_members';
  EXECUTE 'DROP POLICY IF EXISTS "project_members_policy" ON public.project_members';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_project_members" ON public.project_members';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_project_members ON public.project_members FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_project_members ON public.project_members FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_project_members ON public.project_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_project_members ON public.project_members FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='project_members'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'project_members_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for project_members';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing project_members: %', SQLERRM;
END $$;

-- ===== video_conferences =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='video_conferences') THEN
    RAISE NOTICE 'Table video_conferences does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.video_conferences ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_video_conferences ON public.video_conferences';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_video_conferences ON public.video_conferences';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_video_conferences ON public.video_conferences';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_video_conferences ON public.video_conferences';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view video_conferences" ON public.video_conferences';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.video_conferences';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.video_conferences';
  EXECUTE 'DROP POLICY IF EXISTS "video_conferences_select_policy" ON public.video_conferences';
  EXECUTE 'DROP POLICY IF EXISTS "video_conferences_policy" ON public.video_conferences';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_video_conferences" ON public.video_conferences';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_video_conferences ON public.video_conferences FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_video_conferences ON public.video_conferences FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_video_conferences ON public.video_conferences FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_video_conferences ON public.video_conferences FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_conferences TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_conferences TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='video_conferences'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'video_conferences_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for video_conferences';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing video_conferences: %', SQLERRM;
END $$;

-- ===== video_conference_configs =====
DO $$
DECLARE
  has_rls BOOLEAN;
  seq_record RECORD;
BEGIN
  -- 1. 检查表是否存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='video_conference_configs') THEN
    RAISE NOTICE 'Table video_conference_configs does not exist, skipping';
    RETURN;
  END IF;

  -- 2. 启用 RLS
  ALTER TABLE public.video_conference_configs ENABLE ROW LEVEL SECURITY;

  -- 3. 删除可能存在的旧策略
  EXECUTE 'DROP POLICY IF EXISTS allow_select_video_conference_configs ON public.video_conference_configs';
  EXECUTE 'DROP POLICY IF EXISTS allow_insert_video_conference_configs ON public.video_conference_configs';
  EXECUTE 'DROP POLICY IF EXISTS allow_update_video_conference_configs ON public.video_conference_configs';
  EXECUTE 'DROP POLICY IF EXISTS allow_delete_video_conference_configs ON public.video_conference_configs';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view video_conference_configs" ON public.video_conference_configs';
  EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.video_conference_configs';
  EXECUTE 'DROP POLICY IF EXISTS "Allow all access" ON public.video_conference_configs';
  EXECUTE 'DROP POLICY IF EXISTS "video_conference_configs_select_policy" ON public.video_conference_configs';
  EXECUTE 'DROP POLICY IF EXISTS "video_conference_configs_policy" ON public.video_conference_configs';
  EXECUTE 'DROP POLICY IF EXISTS "user_select_video_conference_configs" ON public.video_conference_configs';

  -- 4. 创建新策略
  EXECUTE 'CREATE POLICY allow_select_video_conference_configs ON public.video_conference_configs FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY allow_insert_video_conference_configs ON public.video_conference_configs FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_update_video_conference_configs ON public.video_conference_configs FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY allow_delete_video_conference_configs ON public.video_conference_configs FOR DELETE TO authenticated USING (true)';

  -- 5. 授权角色
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_conference_configs TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_conference_configs TO authenticated';

  -- 6. 授权相关序列（如果存在）
  FOR seq_record IN
    SELECT c.relname AS seq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = (
      SELECT c2.oid FROM pg_class c2
      JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
      WHERE n2.nspname='public' AND c2.relname='video_conference_configs'
    )
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND (a.attname = c.relname OR c.relname = 'video_conference_configs_id_seq')
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.seq_name);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.seq_name);
  END LOOP;

  RAISE NOTICE 'Fixed RLS for video_conference_configs';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing video_conference_configs: %', SQLERRM;
END $$;

-- ============================================
-- 验证
-- ============================================
SELECT
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename=t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname='public' AND tablename IN (
  'trending_topics', 'trending_keywords', 'trending_history',
  'ai_conversations', 'ai_messages', 'approvals',
  'automation_workflows', 'social_post_platforms',
  'project_members', 'video_conferences', 'video_conference_configs'
)
ORDER BY tablename;
