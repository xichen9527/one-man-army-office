-- ============================================================
-- files 表 RLS 策略修复（uploader_id = auth.uid()::text）
-- 执行方式：Supabase SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "Users can read own files" ON files;
DROP POLICY IF EXISTS "Users can insert own files" ON files;
DROP POLICY IF EXISTS "Users can update own files" ON files;
DROP POLICY IF EXISTS "Users can delete own files" ON files;

-- SELECT: 用户只能读取自己上传的文件
CREATE POLICY "Users can read own files" ON files
  FOR SELECT USING (uploader_id = auth.uid()::text OR is_public = true);

-- INSERT: 用户只能上传自己创建的文件
CREATE POLICY "Users can insert own files" ON files
  FOR INSERT WITH CHECK (uploader_id = auth.uid()::text);

-- UPDATE: 用户只能更新自己上传的文件
CREATE POLICY "Users can update own files" ON files
  FOR UPDATE USING (uploader_id = auth.uid()::text);

-- DELETE: 用户只能删除自己上传的文件
CREATE POLICY "Users can delete own files" ON files
  FOR DELETE USING (uploader_id = auth.uid()::text);
