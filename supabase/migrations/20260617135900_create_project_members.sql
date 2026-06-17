-- ============================================================
-- Fix: Create project_members table + update document/file RLS
-- Date: 2026-06-17 13:58
-- ============================================================

-- 1. Create project_members table
CREATE TABLE IF NOT EXISTS public.project_members (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_user_id ON public.project_members(user_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Users can view project members') THEN
    CREATE POLICY "Users can view project members" ON public.project_members
      FOR SELECT USING (
        user_id = auth.uid()::text
        OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()::text)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Project owners can manage members') THEN
    CREATE POLICY "Project owners can manage members" ON public.project_members
      FOR ALL USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()::text));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO anon, authenticated;

-- 2. Update documents RLS (simplified, no project_members dependency for now)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can view accessible documents') THEN
    CREATE POLICY "Users can view accessible documents" ON public.documents
      FOR SELECT USING (
        creator_id = auth.uid()::text
        OR is_public = true
        OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()::text)
      );
  END IF;
END $$;

-- 3. Update files RLS (simplified)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'files' AND policyname = 'Users can view accessible files') THEN
    CREATE POLICY "Users can view accessible files" ON public.files
      FOR SELECT USING (
        uploaded_by = auth.uid()::text
        OR is_public = true
        OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()::text)
      );
  END IF;
END $$;
