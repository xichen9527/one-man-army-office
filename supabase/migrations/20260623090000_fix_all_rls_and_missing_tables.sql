-- 完整迁移脚本：修复所有RLS策略和缺失表
-- 执行日期：2026-06-23
-- 说明：此脚本包含所有必要的表创建和RLS策略，解决线上403/404错误

-- ============================================
-- 1. 创建 social_post_platforms 表（解决404错误）
-- ============================================
CREATE TABLE IF NOT EXISTS social_post_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  platform_url TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_social_post_platforms_post_id ON social_post_platforms(post_id);
CREATE INDEX IF NOT EXISTS idx_social_post_platforms_platform ON social_post_platforms(platform);

-- 启用RLS
ALTER TABLE social_post_platforms ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（幂等）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_post_platforms' AND policyname = 'Users can view own post platforms') THEN
    CREATE POLICY "Users can view own post platforms" ON social_post_platforms
      FOR SELECT USING (
        post_id IN (SELECT id FROM social_media_posts WHERE user_id = auth.uid()::text)
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_post_platforms' AND policyname = 'Users can insert own post platforms') THEN
    CREATE POLICY "Users can insert own post platforms" ON social_post_platforms
      FOR INSERT WITH (
        post_id IN (SELECT id FROM social_media_posts WHERE user_id = auth.uid()::text)
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_post_platforms' AND policyname = 'Users can update own post platforms') THEN
    CREATE POLICY "Users can update own post platforms" ON social_post_platforms
      FOR UPDATE USING (
        post_id IN (SELECT id FROM social_media_posts WHERE user_id = auth.uid()::text)
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_post_platforms' AND policyname = 'Users can delete own post platforms') THEN
    CREATE POLICY "Users can delete own post platforms" ON social_post_platforms
      FOR DELETE USING (
        post_id IN (SELECT id FROM social_media_posts WHERE user_id = auth.uid()::text)
      );
  END IF;
END $$;

-- ============================================
-- 2. 修复 video_conferences 表 RLS策略（解决403错误）
-- ============================================
-- 先删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own conferences" ON video_conferences;
DROP POLICY IF EXISTS "Users can insert conferences" ON video_conferences;
DROP POLICY IF EXISTS "Users can update own conferences" ON video_conferences;
DROP POLICY IF EXISTS "Users can delete own conferences" ON video_conferences;

-- 创建新的RLS策略（支持host_id和participants）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_conferences' AND policyname = 'Users can view conferences') THEN
    CREATE POLICY "Users can view conferences" ON video_conferences
      FOR SELECT USING (
        host_id = auth.uid()::text 
        OR auth.uid()::text = ANY(participants)
        OR EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_members.project_id = video_conferences.project_id 
          AND project_members.user_id = auth.uid()::text
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_conferences' AND policyname = 'Users can insert conferences') THEN
    CREATE POLICY "Users can insert conferences" ON video_conferences
      FOR INSERT WITH (host_id = auth.uid()::text);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_conferences' AND policyname = 'Users can update conferences') THEN
    CREATE POLICY "Users can update conferences" ON video_conferences
      FOR UPDATE USING (host_id = auth.uid()::text);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_conferences' AND policyname = 'Users can delete conferences') THEN
    CREATE POLICY "Users can delete conferences" ON video_conferences
      FOR DELETE USING (host_id = auth.uid()::text);
  END IF;
END $$;

-- ============================================
-- 3. 创建 project_members 表（如果不存在）
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 启用RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Users can view project members') THEN
    CREATE POLICY "Users can view project members" ON project_members
      FOR SELECT USING (
        user_id = auth.uid()::text
        OR project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text)
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Users can insert project members') THEN
    CREATE POLICY "Users can insert project members" ON project_members
      FOR INSERT WITH (
        project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text)
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Users can update project members') THEN
    CREATE POLICY "Users can update project members" ON project_members
      FOR UPDATE USING (
        project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text)
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Users can delete project members') THEN
    CREATE POLICY "Users can delete project members" ON project_members
      FOR DELETE USING (
        project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()::text)
      );
  END IF;
END $$;

-- ============================================
-- 4. 确保 documents 和 files 表有 task_id 字段
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'task_id') THEN
    ALTER TABLE documents ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'task_id') THEN
    ALTER TABLE files ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_files_task_id ON files(task_id);
  END IF;
END $$;

-- ============================================
-- 5. 创建 document_shares 表（如果不存在）
-- ============================================
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  shared_with_user_id TEXT,
  shared_with_email TEXT,
  permission TEXT DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_shares' AND policyname = 'Users can view document shares') THEN
    CREATE POLICY "Users can view document shares" ON document_shares
      FOR SELECT USING (
        document_id IN (SELECT id FROM documents WHERE creator_id = auth.uid()::text)
        OR shared_with_user_id = auth.uid()::text
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_shares' AND policyname = 'Users can insert document shares') THEN
    CREATE POLICY "Users can insert document shares" ON document_shares
      FOR INSERT WITH (
        document_id IN (SELECT id FROM documents WHERE creator_id = auth.uid()::text)
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_shares' AND policyname = 'Users can delete document shares') THEN
    CREATE POLICY "Users can delete document shares" ON document_shares
      FOR DELETE USING (
        document_id IN (SELECT id FROM documents WHERE creator_id = auth.uid()::text)
      );
  END IF;
END $$;

-- ============================================
-- 6. 授予权限（重要！）
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON social_post_platforms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON video_conferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_shares TO authenticated;

-- 如果是通过Supabase Management API创建的表，可能还需要授予anon角色权限
GRANT SELECT ON social_post_platforms TO anon;
GRANT SELECT ON video_conferences TO anon;
GRANT SELECT ON project_members TO anon;
GRANT SELECT ON document_shares TO anon;

-- ============================================
-- 完成
-- ============================================
SELECT 'Migration completed successfully' AS status;
