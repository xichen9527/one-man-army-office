-- ============================================================
-- 综合修复 SQL（2026-06-17）
-- 需要在 Supabase SQL Editor 中逐块执行
-- ============================================================

-- ========== 第一块：files 表添加 task_id ==========
ALTER TABLE IF EXISTS public.files ADD COLUMN IF NOT EXISTS task_id TEXT;
CREATE INDEX IF NOT EXISTS idx_files_task_id ON public.files(task_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);

-- ========== 第二块：files 表 RLS 策略 ==========
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- 先删除旧策略（避免冲突）
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
DROP POLICY IF EXISTS "Users can insert own files" ON public.files;
DROP POLICY IF EXISTS "Users can update own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete own files" ON public.files;

-- 重建策略（使用 uploaded_by 而非 owner_id）
CREATE POLICY "Users can view own files" ON public.files FOR SELECT USING (uploaded_by = auth.uid()::text);
CREATE POLICY "Users can insert own files" ON public.files FOR INSERT WITH CHECK (uploaded_by = auth.uid()::text);
CREATE POLICY "Users can update own files" ON public.files FOR UPDATE USING (uploaded_by = auth.uid()::text) WITH CHECK (uploaded_by = auth.uid()::text);
CREATE POLICY "Users can delete own files" ON public.files FOR DELETE USING (uploaded_by = auth.uid()::text);

-- ========== 第三块：social_accounts 表 metadata 列 ==========
ALTER TABLE IF EXISTS public.social_accounts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ========== 第四块：Storage 存储桶权限 ==========
-- avatars 存储桶
DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
CREATE POLICY "Authenticated users can read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- files 存储桶
DROP POLICY IF EXISTS "Authenticated users can read files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Authenticated users can read files" ON storage.objects FOR SELECT USING (bucket_id = 'files');
CREATE POLICY "Users can upload own files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========== 第五块：GRANT 权限确认 ==========
-- 确保关键表有 authenticated 角色权限
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['profiles', 'projects', 'tasks', 'documents', 'channels', 'messages', 'notifications', 'ai_conversations', 'ai_messages', 'customers', 'sales_opportunities', 'followups', 'social_accounts', 'social_posts', 'trending_topics', 'video_conferences', 'team_members', 'invitations', 'files', 'task_reports', 'workspace_members', 'workspace_templates', 'content_templates', 'automation_workflows', 'marketing_campaigns'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END;
  END LOOP;
END $$;

-- ========== 验证 ==========
SELECT 'files columns' as check_type, string_agg(col, ', ') as result
FROM (
  SELECT column_name as col FROM information_schema.columns WHERE table_name = 'files' AND table_schema = 'public' ORDER BY ordinal_position
) sub;

SELECT 'files RLS' as check_type, tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'files';

SELECT 'social_accounts metadata' as check_type, column_name, data_type FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'metadata';