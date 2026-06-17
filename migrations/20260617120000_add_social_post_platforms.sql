-- 为自媒体运营模块添加多平台支持
-- 创建 social_post_platforms 关联表，实现一条内容可发布到多个平台

-- 1. 创建 social_post_platforms 表
CREATE TABLE IF NOT EXISTS social_post_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('weibo', 'wechat', 'douyin', 'xiaohongshu', 'bilibili', 'zhihu', 'toutiao', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'draft', 'scheduled', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  post_url TEXT,
  platform_post_id TEXT, -- 平台返回的内容ID
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, account_id) -- 同一内容对同一账号只能有一条关联记录
);

-- 2. 创建索引
CREATE INDEX idx_social_post_platforms_post_id ON social_post_platforms(post_id);
CREATE INDEX idx_social_post_platforms_account_id ON social_post_platforms(account_id);
CREATE INDEX idx_social_post_platforms_platform ON social_post_platforms(platform);
CREATE INDEX idx_social_post_platforms_status ON social_post_platforms(status);

-- 3. 修改 social_posts 表，使 account_id 和 platform 可为空（迁移到关联表）
ALTER TABLE social_posts ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE social_posts ALTER COLUMN platform DROP NOT NULL;

-- 4. 为 social_posts.platform 添加注释说明已废弃
COMMENT ON COLUMN social_posts.platform IS '已废弃：请使用 social_post_platforms 关联表';

-- 5. 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_post_platforms_updated_at
  BEFORE UPDATE ON social_post_platforms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. 数据迁移：将现有 social_posts 的平台数据迁移到关联表
-- 只有当 social_post_platforms 表为空时才执行迁移（避免重复迁移）
INSERT INTO social_post_platforms (post_id, account_id, platform, status, scheduled_at, published_at, post_url, metadata)
SELECT 
  p.id,
  COALESCE(p.account_id, a.id),
  COALESCE(p.platform, a.platform),
  p.status,
  p.scheduled_at,
  p.published_at,
  p.post_url,
  p.metadata
FROM social_posts p
LEFT JOIN social_accounts a ON a.id = p.account_id
WHERE p.account_id IS NOT NULL
  AND p.platform IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM social_post_platforms);

-- 7. 启用 RLS (Row Level Security)
ALTER TABLE social_post_platforms ENABLE ROW LEVEL SECURITY;

-- 8. 创建 RLS 策略
CREATE POLICY "用户只能查看自己关联的平台内容"
  ON social_post_platforms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM social_posts sp
      JOIN social_accounts sa ON sa.id = social_post_platforms.account_id
      WHERE sp.id = social_post_platforms.post_id
        AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "用户只能插入自己的平台内容关联"
  ON social_post_platforms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_posts sp
      JOIN social_accounts sa ON sa.id = social_post_platforms.account_id
      WHERE sp.id = social_post_platforms.post_id
        AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "用户只能更新自己的平台内容关联"
  ON social_post_platforms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM social_posts sp
      JOIN social_accounts sa ON sa.id = social_post_platforms.account_id
      WHERE sp.id = social_post_platforms.post_id
        AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "用户只能删除自己的平台内容关联"
  ON social_post_platforms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM social_posts sp
      JOIN social_accounts sa ON sa.id = social_post_platforms.account_id
      WHERE sp.id = social_post_platforms.post_id
        AND sa.user_id = auth.uid()
    )
  );
