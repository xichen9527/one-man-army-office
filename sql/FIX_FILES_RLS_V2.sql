-- ============================================================
-- files 表 RLS 修复 V2：解决列名不匹配导致的 403
-- 根因：schema 定义列名为 uploaded_by，但 store 代码统一使用 uploader_id
--       若 RLS 策略引用了不存在的列，策略创建会失败 → 无 SELECT 策略 → 403
-- 修复：1) 将列统一重命名为 uploader_id（与 store 对齐）
--       2) 删除所有旧策略（无论名称），重建正确的 4 条策略
-- ============================================================

-- 1. 列名对齐：若 uploaded_by 存在则重命名为 uploader_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'files' AND column_name = 'uploaded_by'
  ) THEN
    ALTER TABLE public.files RENAME COLUMN uploaded_by TO uploader_id;
  END IF;
END $$;

-- 2. 删除所有旧的 files 策略（覆盖各 SQL 文件可能创建的名称）
DROP POLICY IF EXISTS "files_select" ON public.files;
DROP POLICY IF EXISTS "files_insert" ON public.files;
DROP POLICY IF EXISTS "files_select_own" ON public.files;
DROP POLICY IF EXISTS "files_insert_own" ON public.files;
DROP POLICY IF EXISTS "files_update_own" ON public.files;
DROP POLICY IF EXISTS "files_delete_own" ON public.files;
DROP POLICY IF EXISTS "Users can read own files" ON public.files;
DROP POLICY IF EXISTS "Users can insert own files" ON public.files;
DROP POLICY IF EXISTS "Users can update own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete own files" ON public.files;

-- 3. 重建正确的策略（统一使用 uploader_id，与 store 代码一致）
CREATE POLICY "files_select_own" ON public.files
  FOR SELECT USING (uploader_id = auth.uid()::text);

CREATE POLICY "files_insert_own" ON public.files
  FOR INSERT WITH CHECK (uploader_id = auth.uid()::text);

CREATE POLICY "files_update_own" ON public.files
  FOR UPDATE USING (uploader_id = auth.uid()::text);

CREATE POLICY "files_delete_own" ON public.files
  FOR DELETE USING (uploader_id = auth.uid()::text);
