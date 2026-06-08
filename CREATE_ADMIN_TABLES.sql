-- Admin tables

-- System audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO anon, authenticated;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON audit_logs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can view all logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert logs" ON audit_logs FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- System config key-value
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON system_config TO anon, authenticated;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view config" ON system_config FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage config" ON system_config FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
CREATE POLICY "Authenticated users can manage config" ON system_config FOR UPDATE USING (auth.uid()::text IS NOT NULL);

-- User roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO anon, authenticated;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view roles" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage roles" ON user_roles FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
CREATE POLICY "Admins can manage roles" ON user_roles FOR UPDATE USING (auth.uid()::text IS NOT NULL);

-- System stats dashboard materialized view helper (actual stats computed in Edge Function or client)
-- Default admin role for first user
INSERT INTO system_config (key, value, description) VALUES
  ('site_name', '"一人成军办公平台"', '站点名称'),
  ('maintenance_mode', 'false', '维护模式开关')
ON CONFLICT (key) DO NOTHING;
