-- =====================================================
-- 审批中心 (Approval Center)
-- =====================================================

-- 先创建 ID 生成函数（必须在表创建前）
CREATE OR REPLACE FUNCTION gen_random_id()
RETURNS TEXT AS $$
BEGIN
    RETURN substring(replace(replace(replace(gen_random_uuid()::text, '-', ''), 'a', 'x'), 'b', 'y') from 1 for 16);
END;
$$ LANGUAGE plpgsql;

-- 创建审批表
CREATE TABLE IF NOT EXISTS approvals (
    id              TEXT        PRIMARY KEY DEFAULT gen_random_id(),
    requester_id    TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    approver_id     TEXT        REFERENCES profiles(id) ON DELETE SET NULL,
    type            TEXT        NOT NULL CHECK (type IN ('file_upload', 'project_create', 'task_assign')),
    title           TEXT        NOT NULL,
    description     TEXT,
    status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    metadata        JSONB       DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approvals_updated_at
    BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- 策略：requester 可以查看自己的审批
CREATE POLICY "approvals_requester_read"
    ON approvals FOR SELECT
    USING (requester_id = auth.uid()::text);

-- 策略：admin 角色可以查看所有审批
CREATE POLICY "approvals_admin_read_all"
    ON approvals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()::text
              AND profiles.role = 'admin'
        )
    );

-- 策略：任何已登录用户可以插入审批（requester）
CREATE POLICY "approvals_insert"
    ON approvals FOR INSERT
    WITH CHECK (requester_id = auth.uid()::text);

-- 策略：admin 可以更新（审批通过/驳回）
CREATE POLICY "approvals_admin_update"
    ON approvals FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()::text
              AND profiles.role = 'admin'
        )
    );

-- 策略：requester 可以删除自己的 pending 审批
CREATE POLICY "approvals_requester_delete_pending"
    ON approvals FOR DELETE
    USING (
        requester_id = auth.uid()::text
        AND status = 'pending'
    );

-- =====================================================
-- 索引
-- =====================================================
CREATE INDEX IF NOT EXISTS approvals_requester_id_idx ON approvals(requester_id);
CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals(status);
CREATE INDEX IF NOT EXISTS approvals_type_idx ON approvals(type);
CREATE INDEX IF NOT EXISTS approvals_created_at_idx ON approvals(created_at DESC);

-- =====================================================
-- Realtime
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE approvals;
