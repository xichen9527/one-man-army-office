-- ============================================
-- One-Person Army Office - Comprehensive Database Fix V3
-- Date: 2026-07-03
-- Description: Fix all foreign key constraint errors
--              Remove all REFERENCES auth.users() constraints
--              Use application-level integrity instead
-- ============================================

-- ============================================
-- 1. Fix video_conferences schema (NO foreign key to auth.users)
-- ============================================

DROP POLICY IF EXISTS "video_conferences_select_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_insert_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_update_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_delete_own" ON public.video_conferences;
DROP TABLE IF EXISTS public.video_conferences CASCADE;

CREATE TABLE public.video_conferences (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  meeting_id TEXT NOT NULL UNIQUE,
  meeting_number TEXT,
  join_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  host_id TEXT NOT NULL,  -- NO foreign key: auth.users(id) is UUID, our field is TEXT
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','ongoing','ended','cancelled')),
  max_participants INTEGER DEFAULT 10,
  participants TEXT[] DEFAULT '{}',
  recording_enabled BOOLEAN DEFAULT false,
  recording_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.video_conferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_conferences_select_own" ON public.video_conferences
  FOR SELECT USING (auth.uid()::text = host_id OR auth.uid()::text = ANY(participants));

CREATE POLICY "video_conferences_insert_own" ON public.video_conferences
  FOR INSERT WITH CHECK (auth.uid()::text = host_id);

CREATE POLICY "video_conferences_update_own" ON public.video_conferences
  FOR UPDATE USING (auth.uid()::text = host_id);

CREATE POLICY "video_conferences_delete_own" ON public.video_conferences
  FOR DELETE USING (auth.uid()::text = host_id);

CREATE INDEX IF NOT EXISTS idx_video_conferences_host_id ON public.video_conferences(host_id);
CREATE INDEX IF NOT EXISTS idx_video_conferences_status ON public.video_conferences(status);

-- ============================================
-- 2. Add email_change_count to profiles table
-- ============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_change_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_email_change_at TIMESTAMPTZ;

-- ============================================
-- 3. Create missing tables (NO foreign keys to auth.users)
-- ============================================

-- Approval requests table
DROP TABLE IF EXISTS public.approvals CASCADE;
CREATE TABLE public.approvals (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  requester_id TEXT NOT NULL,  -- NO foreign key to auth.users
  approver_id TEXT,            -- NO foreign key to auth.users
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  data JSONB DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Files table
DROP TABLE IF EXISTS public.files CASCADE;
CREATE TABLE public.files (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  project_id TEXT,  -- NO foreign key: may reference existing projects
  task_id TEXT,     -- NO foreign key: may reference existing tasks
  uploader_id TEXT NOT NULL,  -- NO foreign key to auth.users
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Followups table
DROP TABLE IF EXISTS public.followups CASCADE;
CREATE TABLE public.followups (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  customer_id TEXT NOT NULL,  -- NO foreign key: may reference existing customers
  user_id TEXT NOT NULL,      -- NO foreign key to auth.users
  type TEXT CHECK (type IN ('call', 'email', 'meeting', 'other')),
  content TEXT NOT NULL,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trending topics table
DROP TABLE IF EXISTS public.trending_topics CASCADE;
CREATE TABLE public.trending_topics (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  heat INTEGER DEFAULT 0,
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  url TEXT,
  description TEXT,
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. Enable RLS on all tables
-- ============================================

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Create RLS policies for all tables
-- ============================================

-- Approvals policies
DROP POLICY IF EXISTS "approvals_select_own" ON public.approvals;
DROP POLICY IF EXISTS "approvals_insert_own" ON public.approvals;
DROP POLICY IF EXISTS "approvals_update_own" ON public.approvals;

CREATE POLICY "approvals_select_own" ON public.approvals
  FOR SELECT USING (auth.uid()::text = requester_id OR auth.uid()::text = approver_id);
CREATE POLICY "approvals_insert_own" ON public.approvals
  FOR INSERT WITH CHECK (auth.uid()::text = requester_id);
CREATE POLICY "approvals_update_own" ON public.approvals
  FOR UPDATE USING (auth.uid()::text = approver_id);

-- Files policies
DROP POLICY IF EXISTS "files_select_own" ON public.files;
DROP POLICY IF EXISTS "files_insert_own" ON public.files;
DROP POLICY IF EXISTS "files_delete_own" ON public.files;

CREATE POLICY "files_select_own" ON public.files
  FOR SELECT USING (auth.uid()::text = uploader_id);
CREATE POLICY "files_insert_own" ON public.files
  FOR INSERT WITH CHECK (auth.uid()::text = uploader_id);
CREATE POLICY "files_delete_own" ON public.files
  FOR DELETE USING (auth.uid()::text = uploader_id);

-- Followups policies
DROP POLICY IF EXISTS "followups_select_own" ON public.followups;
DROP POLICY IF EXISTS "followups_insert_own" ON public.followups;
DROP POLICY IF EXISTS "followups_delete_own" ON public.followups;

CREATE POLICY "followups_select_own" ON public.followups
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "followups_insert_own" ON public.followups
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "followups_delete_own" ON public.followups
  FOR DELETE USING (auth.uid()::text = user_id);

-- Trending topics policies (readable by all authenticated users)
DROP POLICY IF EXISTS "trending_topics_select_all" ON public.trending_topics;
DROP POLICY IF EXISTS "trending_topics_insert_auth" ON public.trending_topics;

CREATE POLICY "trending_topics_select_all" ON public.trending_topics
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "trending_topics_insert_auth" ON public.trending_topics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 6. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_approvals_requester_id ON public.approvals(requester_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON public.approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_task_id ON public.files(task_id);
CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON public.files(uploader_id);
CREATE INDEX IF NOT EXISTS idx_followups_customer_id ON public.followups(customer_id);
CREATE INDEX IF NOT EXISTS idx_followups_user_id ON public.followups(user_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_platform ON public.trending_topics(platform);

-- ============================================
-- 7. Fix profiles table RLS
-- ============================================

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ============================================
-- Complete!
-- ============================================

SELECT 'Database fix V3 complete!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
