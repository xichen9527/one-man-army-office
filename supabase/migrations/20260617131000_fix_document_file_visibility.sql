-- 确保文档和文件对项目成员可见

-- 1. documents 表：项目成员可以查看项目下的所有文档
DO $$
BEGIN
  -- 先删除可能冲突的策略
  DROP POLICY IF EXISTS "Users can view documents in their projects" ON public.documents;
  DROP POLICY IF EXISTS "Users can view shared documents" ON public.documents;
  
  -- 创建新策略：用户可以查看自己创建的文档，或项目成员可查看项目下的所有文档
  CREATE POLICY "Users can view accessible documents" ON public.documents
    FOR SELECT
    USING (
      -- 用户是创建者
      creator_id = auth.uid()::text
      OR
      -- 文档是公开的
      is_public = true
      OR
      -- 用户是项目成员（通过 project_members 表）
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = documents.project_id
        AND pm.user_id = auth.uid()::text
        AND pm.status = 'active'
      )
      OR
      -- 用户是项目负责人（通过 projects 表）
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = documents.project_id
        AND p.owner_id = auth.uid()::text
      )
    );
END $$;

-- 2. files 表：项目成员可以查看项目下的所有文件
DO $$
BEGIN
  -- 先删除可能冲突的策略
  DROP POLICY IF EXISTS "Users can view files in their projects" ON public.files;
  DROP POLICY IF EXISTS "Users can view public files" ON public.files;
  
  -- 创建新策略：用户可以查看自己上传的文件，或项目成员可查看项目下的所有文件
  CREATE POLICY "Users can view accessible files" ON public.files
    FOR SELECT
    USING (
      -- 用户是上传者
      uploaded_by = auth.uid()::text
      OR
      -- 文件是公开的
      is_public = true
      OR
      -- 用户是项目成员
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = files.project_id
        AND pm.user_id = auth.uid()::text
        AND pm.status = 'active'
      )
      OR
      -- 用户是项目负责人
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = files.project_id
        AND p.owner_id = auth.uid()::text
      )
    );
END $$;

-- 3. 确保 project_members 表存在并正确设置
-- 如果不存在则创建
CREATE TABLE IF NOT EXISTS public.project_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- RLS 策略：项目成员可见
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
  
  CREATE POLICY "Users can view project members" ON public.project_members
    FOR SELECT
    USING (
      -- 用户自己是成员
      user_id = auth.uid()::text
      OR
      -- 用户是项目负责人
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_members.project_id
        AND p.owner_id = auth.uid()::text
      )
    );
END $$;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);

-- GRANT 权限
GRANT SELECT ON public.project_members TO authenticated, anon;
GRANT SELECT ON public.documents TO authenticated, anon;
GRANT SELECT ON public.files TO authenticated, anon;
