-- Missing tables for one-man-army-office
-- Execute in Supabase SQL Editor

-- 1. Login Sessions (audit + security)
CREATE TABLE IF NOT EXISTS login_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  login_method TEXT DEFAULT 'email' CHECK (login_method IN ('email', 'oauth', '2fa')),
  is_current BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON login_sessions TO anon, authenticated;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON login_sessions FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert sessions" ON login_sessions FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON login_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_expires ON login_sessions (expires_at);

-- 2. File Versions (version history for documents/files)
CREATE TABLE IF NOT EXISTS file_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  change_summary TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(file_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON file_versions TO anon, authenticated;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own file versions" ON file_versions FOR ALL USING (auth.uid()::text = created_by);
CREATE POLICY "Users can insert file versions" ON file_versions FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions (file_id);

-- 3. Customer Contacts (multiple contacts per customer)
CREATE TABLE IF NOT EXISTS customer_contacts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_contacts TO anon, authenticated;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own customer contacts" ON customer_contacts FOR ALL USING (auth.uid()::text = created_by);
CREATE POLICY "Users can insert customer contacts" ON customer_contacts FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts (customer_id);

-- 4. Project Milestones (track project milestones/deadlines)
CREATE TABLE IF NOT EXISTS project_milestones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON project_milestones TO anon, authenticated;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own milestones" ON project_milestones FOR ALL USING (auth.uid()::text = created_by);
CREATE POLICY "Users can insert milestones" ON project_milestones FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones (project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON project_milestones (status);

-- 5. Tags (global tag system for projects/docs/customers)
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO anon, authenticated;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tags" ON tags FOR ALL USING (auth.uid()::text = created_by);
CREATE POLICY "Users can insert tags" ON tags FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);

-- Tag associations (many-to-many)
CREATE TABLE IF NOT EXISTS tag_associations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('project', 'document', 'customer', 'social_post', 'task')),
  resource_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tag_id, resource_type, resource_id)
);
GRANT SELECT, INSERT, DELETE ON tag_associations TO anon, authenticated;
ALTER TABLE tag_associations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tag associations" ON tag_associations FOR ALL USING (
  EXISTS (SELECT 1 FROM tags WHERE tags.id = tag_associations.tag_id AND tags.created_by = auth.uid()::text)
);
CREATE POLICY "Users can insert tag associations" ON tag_associations FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tag_assoc_resource ON tag_associations (resource_type, resource_id);

-- 6. Notes (quick notes/memos not tied to specific modules)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  color TEXT DEFAULT '#FEF3C7' CHECK (color IN ('#FEF3C7', '#DBEAFE', '#FCE7F3', '#D1FAE5', '#E0E7FF', '#FEE2E2')),
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO anon, authenticated;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notes" ON notes FOR ALL USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert notes" ON notes FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes (user_id, is_pinned) WHERE is_pinned = true;
