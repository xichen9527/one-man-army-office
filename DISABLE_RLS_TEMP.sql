-- 临时禁用所有表的 RLS，让应用能正常运行
-- ⚠️ 注意：这仅用于调试，生产环境需要正确的 RLS 策略

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE '_%'
  LOOP
    -- 禁用 RLS
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'Disabled RLS for: %', t;
  END LOOP;
END $$;

-- 验证：所有表的 RLS 已禁用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
