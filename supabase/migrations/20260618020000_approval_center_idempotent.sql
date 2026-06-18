-- =============================================
-- 审批中心幂等迁移（最终版 v2）
-- 修复：user_roles.user_id 是 UUID，不能用 ::text 比较
-- =============================================

-- 1. 删除已存在的触发器和函数
DROP TRIGGER IF EXISTS approvals_updated_at ON approvals;
DROP FUNCTION IF EXISTS update_approvals_updated_at() CASCADE;

-- 2. 创建函数（幂等）
CREATE OR REPLACE FUNCTION update_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 确保表存在（无外键约束）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approvals') THEN
    CREATE TABLE approvals (
      id TEXT PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('file_upload', 'project_create', 'task_assign', 'other')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      requester_id TEXT NOT NULL,
      approver_id TEXT,
      project_id TEXT,
      task_id TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
    
    CREATE INDEX IF NOT EXISTS idx_approvals_requester ON approvals(requester_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
    CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals(type);
  END IF;
END $$;

-- 4. 创建触发器（幂等）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'approvals_updated_at'
  ) THEN
    CREATE TRIGGER approvals_updated_at
      BEFORE UPDATE ON approvals
      FOR EACH ROW
      EXECUTE FUNCTION update_approvals_updated_at();
  END IF;
END $$;

-- 5. 启用 RLS
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- 6. 删除旧策略后重建（幂等）
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'approvals' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON approvals', pol.policyname);
  END LOOP;
END $$;

-- 7. 创建新策略
-- approvals.requester_id 是 TEXT，auth.uid() 返回 UUID，所以用 auth.uid()::text
CREATE POLICY "Users can view own approvals" ON approvals
  FOR SELECT USING (requester_id = auth.uid()::text);

-- user_roles.user_id 是 UUID，所以子查询中不转换，用 auth.uid()（也是 UUID）
CREATE POLICY "Admins can view all approvals" ON approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create approval requests" ON approvals
  FOR INSERT WITH CHECK (requester_id = auth.uid()::text);

CREATE POLICY "Admins can update approvals" ON approvals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 8. 授权
GRANT SELECT, INSERT, UPDATE ON approvals TO authenticated;
GRANT SELECT ON approvals TO anon;

COMMENT ON TABLE approvals IS '审批请求表';
