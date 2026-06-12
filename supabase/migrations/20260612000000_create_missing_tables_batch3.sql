-- ============================================================
-- 缺失表/列修复（第三批）2026-06-12 13:20
-- 改用 ALTER TABLE ADD COLUMN IF NOT EXISTS 避免冲突
-- ============================================================

-- 1. task_reports
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_reports') THEN
    CREATE TABLE public.task_reports (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      task_id UUID,
      project_id UUID,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved')),
      report_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.task_reports ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_reports TO authenticated;
    DROP POLICY IF EXISTS "Users manage own task reports" ON public.task_reports;
    CREATE POLICY "Users manage own task reports" ON public.task_reports FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
  ELSE
    ALTER TABLE public.task_reports ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE public.task_reports ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE public.task_reports ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE public.task_reports ADD COLUMN IF NOT EXISTS task_id UUID;
    ALTER TABLE public.task_reports ADD COLUMN IF NOT EXISTS project_id UUID;
    ALTER TABLE public.task_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
    ALTER TABLE public.task_reports ADD COLUMN IF NOT EXISTS report_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.task_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.task_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 2. workspace_members
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_members') THEN
    CREATE TABLE public.workspace_members (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT,
      workspace_id UUID,
      role TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
      joined_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
    DROP POLICY IF EXISTS "Users manage own workspace memberships" ON public.workspace_members;
    CREATE POLICY "Users manage own workspace memberships" ON public.workspace_members FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
  ELSE
    ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS workspace_id UUID;
    ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
    ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 3. workspace_templates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_templates') THEN
    CREATE TABLE public.workspace_templates (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      content TEXT,
      category TEXT,
      is_public BOOLEAN DEFAULT false,
      user_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.workspace_templates ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_templates TO authenticated;
    DROP POLICY IF EXISTS "Users manage own workspace templates" ON public.workspace_templates;
    CREATE POLICY "Users manage own workspace templates" ON public.workspace_templates FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
    DROP POLICY IF EXISTS "Public templates viewable by all" ON public.workspace_templates;
    CREATE POLICY "Public templates viewable by all" ON public.workspace_templates FOR SELECT USING (is_public = true);
  ELSE
    ALTER TABLE public.workspace_templates ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.workspace_templates ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.workspace_templates ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE public.workspace_templates ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.workspace_templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
    ALTER TABLE public.workspace_templates ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE public.workspace_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.workspace_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 4. content_templates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_templates') THEN
    CREATE TABLE public.content_templates (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      platform TEXT DEFAULT 'general' CHECK (platform IN ('general','weibo','wechat','xiaohongshu','zhihu','douyin','bilibili')),
      category TEXT,
      user_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_templates TO authenticated;
    DROP POLICY IF EXISTS "Users manage own content templates" ON public.content_templates;
    CREATE POLICY "Users manage own content templates" ON public.content_templates FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
  ELSE
    ALTER TABLE public.content_templates ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.content_templates ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE public.content_templates ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'general';
    ALTER TABLE public.content_templates ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.content_templates ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE public.content_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.content_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 5. automation_workflows
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_workflows') THEN
    CREATE TABLE public.automation_workflows (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      trigger_type TEXT NOT NULL CHECK (trigger_type IN ('schedule','event','manual')),
      trigger_config JSONB DEFAULT '{}',
      actions JSONB NOT NULL DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      user_id TEXT,
      last_run_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_workflows TO authenticated;
    DROP POLICY IF EXISTS "Users manage own automation workflows" ON public.automation_workflows;
    CREATE POLICY "Users manage own automation workflows" ON public.automation_workflows FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
  ELSE
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS trigger_type TEXT;
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{}';
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS actions JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 6. marketing_campaigns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN
    CREATE TABLE public.marketing_campaigns (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      platform TEXT DEFAULT 'general',
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','archived')),
      start_date DATE,
      end_date DATE,
      budget DECIMAL(10,2),
      target_audience TEXT,
      user_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
    DROP POLICY IF EXISTS "Users manage own marketing campaigns" ON public.marketing_campaigns;
    CREATE POLICY "Users manage own marketing campaigns" ON public.marketing_campaigns FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
  ELSE
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'general';
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2);
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT;
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 验证
SELECT 'task_reports' as tbl, count(*) as cnt FROM public.task_reports
UNION ALL SELECT 'workspace_members', count(*) FROM public.workspace_members
UNION ALL SELECT 'workspace_templates', count(*) FROM public.workspace_templates
UNION ALL SELECT 'content_templates', count(*) FROM public.content_templates
UNION ALL SELECT 'automation_workflows', count(*) FROM public.automation_workflows
UNION ALL SELECT 'marketing_campaigns', count(*) FROM public.marketing_campaigns;