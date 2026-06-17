-- ============================================================
-- 文档共享功能 SQL（修复版 v2 - 所有 CREATE POLICY 都用 DO$$ 检查）
-- 执行位置：https://supabase.com/dashboard/project/jikjcdrrcywnwmtaabzh/sql/editor
-- ============================================================

-- 1. 创建 document_shares 表（如不存在）
CREATE TABLE IF NOT EXISTS public.document_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_by TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, shared_with)
);

-- 2. 添加 documents.task_id 列（如不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'task_id' AND table_schema = 'public') THEN
    ALTER TABLE public.documents ADD COLUMN task_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. 创建索引（如不存在）
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_with ON public.document_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON public.documents(task_id);

-- 4. document_shares RLS 策略（每个都用 DO$$ 检查是否存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_shares' AND policyname = 'Users can view shared documents') THEN
    ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view shared documents" ON public.document_shares
      FOR SELECT USING (shared_with = auth.uid()::text OR shared_by = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_shares' AND policyname = 'Users can create shares') THEN
    CREATE POLICY "Users can create shares" ON public.document_shares
      FOR INSERT WITH CHECK (shared_by = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_shares' AND policyname = 'Users can update own shares') THEN
    CREATE POLICY "Users can update own shares" ON public.document_shares
      FOR UPDATE USING (shared_by = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_shares' AND policyname = 'Users can delete own shares') THEN
    CREATE POLICY "Users can delete own shares" ON public.document_shares
      FOR DELETE USING (shared_by = auth.uid()::text);
  END IF;
END $$;

-- 5. documents 表 RLS 补充（如策略不存在则创建）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can view shared docs') THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view shared docs" ON public.documents
      FOR SELECT USING (
        creator_id = auth.uid()::text
        OR id IN (SELECT document_id FROM document_shares WHERE shared_with = auth.uid()::text)
        OR is_public = true
      );
  END IF;
END $$;

-- 6. GRANT 权限
GRANT ALL ON public.document_shares TO authenticated;
GRANT SELECT ON public.document_shares TO anon;
