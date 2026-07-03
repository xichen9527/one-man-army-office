-- ============================================
-- FIX_RLS_WORKING.sql
-- 简单有效的 RLS 修复 - 允许认证用户访问自己的数据
-- ============================================

-- 为每个表启用 RLS 并创建简单的策略
-- 策略逻辑：用户只能访问 user_id = auth.uid()::text 的行

DO $$
DECLARE
  t text;
  has_user_id boolean;
  has_owner_id boolean;
  has_created_by boolean;
BEGIN
  -- 遍历所有用户表（排除 Supabase 系统表）
  FOR t IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE '_%' 
    AND tablename NOT IN ('schema_migrations', 'profiles')
  LOOP
    -- 检查表是否有 user_id 列
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) INTO has_user_id;
    
    -- 检查表是否有 owner_id 列
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id'
    ) INTO has_owner_id;
    
    -- 检查表是否有 created_by 列
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'created_by'
    ) INTO has_created_by;
    
    -- 启用 RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    
    -- 删除现有策略（避免冲突）
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select_policy', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert_policy', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update_policy', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete_policy', t);
    
    -- 创建策略（根据可用的列）
    IF has_user_id THEN
      EXECUTE format('
        CREATE POLICY %I ON %I 
        FOR ALL 
        USING (user_id = auth.uid()::text)
        WITH CHECK (user_id = auth.uid()::text)
      ', t || '_policy', t);
    ELSIF has_owner_id THEN
      EXECUTE format('
        CREATE POLICY %I ON %I 
        FOR ALL 
        USING (owner_id = auth.uid()::text)
        WITH CHECK (owner_id = auth.uid()::text)
      ', t || '_policy', t);
    ELSIF has_created_by THEN
      EXECUTE format('
        CREATE POLICY %I ON %I 
        FOR ALL 
        USING (created_by = auth.uid()::text)
        WITH CHECK (created_by = auth.uid()::text)
      ', t || '_policy', t);
    ELSE
      -- 没有用户 ID 列的表 - 允许所有认证用户访问
      EXECUTE format('
        CREATE POLICY %I ON %I 
        FOR ALL 
        USING (auth.role() = ''authenticated'')
        WITH CHECK (auth.role() = ''authenticated'')
      ', t || '_policy', t);
    END IF;
    
    RAISE NOTICE 'Fixed RLS for table: %', t;
  END LOOP;
  
  -- 特殊处理 profiles 表（用户可以访问自己的 profile）
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS profiles_policy ON profiles;
    CREATE POLICY profiles_policy ON profiles 
      FOR ALL 
      USING (id = auth.uid()::text)
      WITH CHECK (id = auth.uid()::text);
    RAISE NOTICE 'Fixed RLS for table: profiles';
  END IF;
END $$;

-- 验证结果
SELECT 
  tablename, 
  rowsecurity as rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
