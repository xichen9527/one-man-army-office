-- ============================================
-- One-Person Army Office - Comprehensive Database Fix
-- Date: 2026-07-02
-- Description: Final comprehensive fix for all database issues
-- ============================================

-- This script combines all necessary database migrations and fixes
-- Execute this in Supabase SQL Editor if you haven't run the migrations

-- ============================================
-- 1. Enable RLS and create missing tables
-- ============================================

-- Run the comprehensive fix migration if not already applied
-- (This includes most schema fixes)

-- ============================================
-- 2. Fix video_conferences schema
-- ============================================

-- Drop and recreate video_conferences table with correct schema
DROP POLICY IF EXISTS "video_conferences_select_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_insert_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_update_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_delete_own" ON public.video_conferences;

DROP TABLE IF EXISTS public.video_conferences CASCADE;

CREATE TABLE public.video_conferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id TEXT NOT NULL UNIQUE,
  meeting_number TEXT,
  join_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','ongoing','ended','cancelled')),
  max_participants INTEGER DEFAULT 10,
  participants UUID[] DEFAULT '{}',
  recording_enabled BOOLEAN DEFAULT false,
  recording_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.video_conferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_conferences_select_own" ON public.video_conferences
  FOR SELECT USING (auth.uid() = host_id OR auth.uid() = ANY(participants));

CREATE POLICY "video_conferences_insert_own" ON public.video_conferences
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "video_conferences_update_own" ON public.video_conferences
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "video_conferences_delete_own" ON public.video_conferences
  FOR DELETE USING (auth.uid() = host_id);

CREATE INDEX IF NOT EXISTS idx_video_conferences_host_id ON public.video_conferences(host_id);
CREATE INDEX IF NOT EXISTS idx_video_conferences_status ON public.video_conferences(status);

-- ============================================
-- 3. Add email_change_count to profiles table
-- ============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_change_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_email_change_at TIMESTAMPTZ;

-- ============================================
-- 4. Create missing tables (if not exists)
-- ============================================

-- Approval requests table
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
CREATE TABLE IF NOT EXISTS public.files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Followups table
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('call', 'email', 'meeting', 'other')),
  content TEXT NOT NULL,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trending topics table
CREATE TABLE IF NOT EXISTS public.trending_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  heat INTEGER DEFAULT 0,
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  url TEXT,
  description TEXT,
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. Enable RLS on all tables
-- ============================================

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. Create RLS policies for missing tables
-- ============================================

-- Approvals policies
DROP POLICY IF EXISTS "approvals_select_own" ON public.approvals;
DROP POLICY IF EXISTS "approvals_insert_own" ON public.approvals;
DROP POLICY IF EXISTS "approvals_update_own" ON public.approvals;

CREATE POLICY "approvals_select_own" ON public.approvals
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = approver_id);
CREATE POLICY "approvals_insert_own" ON public.approvals
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "approvals_update_own" ON public.approvals
  FOR UPDATE USING (auth.uid() = approver_id);

-- Files policies
DROP POLICY IF EXISTS "files_select_own" ON public.files;
DROP POLICY IF EXISTS "files_insert_own" ON public.files;
DROP POLICY IF EXISTS "files_delete_own" ON public.files;

CREATE POLICY "files_select_own" ON public.files
  FOR SELECT USING (auth.uid() = uploader_id);
CREATE POLICY "files_insert_own" ON public.files
  FOR INSERT WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "files_delete_own" ON public.files
  FOR DELETE USING (auth.uid() = uploader_id);

-- Followups policies
DROP POLICY IF EXISTS "followups_select_own" ON public.followups;
DROP POLICY IF EXISTS "followups_insert_own" ON public.followups;
DROP POLICY IF EXISTS "followups_delete_own" ON public.followups;

CREATE POLICY "followups_select_own" ON public.followups
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "followups_insert_own" ON public.followups
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "followups_delete_own" ON public.followups
  FOR DELETE USING (auth.uid() = user_id);

-- Trending topics policies (readable by all authenticated users)
DROP POLICY IF EXISTS "trending_topics_select_all" ON public.trending_topics;
CREATE POLICY "trending_topics_select_all" ON public.trending_topics
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- 7. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_approvals_requester_id ON public.approvals(requester_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_task_id ON public.files(task_id);
CREATE INDEX IF NOT EXISTS idx_followups_customer_id ON public.followups(customer_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_platform ON public.trending_topics(platform);

-- ============================================
-- 8. Create storage buckets (if using Supabase Storage)
-- ============================================

-- This needs to be done in Supabase Dashboard or via Supabase CLI
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
-- insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false);

-- ============================================
-- 9. Fix profiles table RLS (allow users to update their own email)
-- ============================================

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Complete!
-- ============================================

-- Verify the setup
SELECT 'Database fix complete!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
