-- 视频会议配置表
-- 每个用户可以配置自己的 LiveKit 凭证
CREATE TABLE IF NOT EXISTS video_conference_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'livekit', -- livekit / tencent / feishu / custom
  server_url TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  app_id TEXT,
  sdk_key TEXT,
  sdk_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS：只能查看/修改自己的配置
ALTER TABLE video_conference_configs ENABLE ROW LEVEL SECURITY;

-- 使用 DO $$ 块实现幂等创建策略
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_conference_configs' AND policyname = 'Users can manage own config') THEN
    CREATE POLICY "Users can manage own config" ON video_conference_configs
      FOR ALL USING (auth.uid()::text = user_id);
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_video_conference_configs_user_id ON video_conference_configs(user_id);

COMMENT ON TABLE video_conference_configs IS '存储用户的视频会议提供商配置';
COMMENT ON COLUMN video_conference_configs.provider IS '提供商：livekit / tencent / feishu / custom';
COMMENT ON COLUMN video_conference_configs.server_url IS '服务器地址（LiveKit: wss://xxx.livekit.cloud）';
COMMENT ON COLUMN video_conference_configs.api_key IS 'API Key（LiveKit 等）';
COMMENT ON COLUMN video_conference_configs.api_secret IS 'API Secret（LiveKit 等）';
COMMENT ON COLUMN video_conference_configs.app_id IS '应用 ID（腾讯会议/飞书等）';
COMMENT ON COLUMN video_conference_configs.sdk_key IS 'SDK Key（腾讯会议等）';
COMMENT ON COLUMN video_conference_configs.sdk_secret IS 'SDK Secret（腾讯会议等）';
