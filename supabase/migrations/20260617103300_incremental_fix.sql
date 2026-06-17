-- ============================================================
-- 增量修复 SQL - 安全版本（幂等，可重复执行）
-- 执行位置：https://supabase.com/dashboard/project/jikjcdrrcywnwmtaabzh/sql/editor
-- ============================================================

-- 【1】files 表添加 task_id 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'task_id' AND table_schema = 'public') THEN
    ALTER TABLE public.files ADD COLUMN task_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 【2】task_id 和 project_id 索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_files_task_id ON public.files(task_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);

-- 【3】social_accounts 表添加 metadata 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'metadata' AND table_schema = 'public') THEN
    ALTER TABLE public.social_accounts ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- 【4】files 表 RLS 策略（使用 uploaded_by 字段）
-- 先删除旧策略（如果使用 owner_id）
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
DROP POLICY IF EXISTS "Users can insert own files" ON public.files;
DROP POLICY IF EXISTS "Users can update own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete own files" ON public.files;

-- 创建新策略（使用 uploaded_by，已 DROP 故无需 IF NOT EXISTS）
CREATE POLICY "Users can view own files" ON public.files
  FOR SELECT USING (uploaded_by = auth.uid()::text);
CREATE POLICY "Users can insert own files" ON public.files
  FOR INSERT WITH CHECK (uploaded_by = auth.uid()::text);
CREATE POLICY "Users can update own files" ON public.files
  FOR UPDATE USING (uploaded_by = auth.uid()::text)
  WITH CHECK (uploaded_by = auth.uid()::text);
CREATE POLICY "Users can delete own files" ON public.files
  FOR DELETE USING (uploaded_by = auth.uid()::text);

-- 【5】验证结果
SELECT 'files表字段' as 检查项,
       string_agg(column_name, ', ' ORDER BY ordinal_position) as 结果
FROM information_schema.columns
WHERE table_name = 'files' AND table_schema = 'public';

SELECT 'RLS策略' as 检查项, policyname as 策略名
FROM pg_policies WHERE tablename = 'files';

SELECT 'social_accounts字段' as 检查项, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'social_accounts' AND column_name = 'metadata';