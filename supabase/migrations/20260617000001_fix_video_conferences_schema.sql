-- Fix video_conferences table to match frontend Conference type
-- The original schema was missing many columns that the frontend expects

-- Drop existing table and recreate with correct schema
-- (This is a development fix; in production you'd use ALTER TABLE ADD COLUMN)

-- First, drop RLS policies
DROP POLICY IF EXISTS "video_conferences_select_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_insert_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_update_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_delete_own" ON public.video_conferences;

-- Drop the table
DROP TABLE IF EXISTS public.video_conferences;

-- Recreate with full schema matching the frontend Conference type
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

-- Recreate RLS policies with UUID host_id
ALTER TABLE public.video_conferences ENABLE ROW LEVEL SECURITY;

-- Select: host or participant can see
CREATE POLICY "video_conferences_select_own" ON public.video_conferences
  FOR SELECT USING (
    auth.uid() = host_id
    OR auth.uid() = ANY(participants)
  );

-- Insert: only host
CREATE POLICY "video_conferences_insert_own" ON public.video_conferences
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Update: only host
CREATE POLICY "video_conferences_update_own" ON public.video_conferences
  FOR UPDATE USING (auth.uid() = host_id);

-- Delete: only host
CREATE POLICY "video_conferences_delete_own" ON public.video_conferences
  FOR DELETE USING (auth.uid() = host_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_video_conferences_host_id ON public.video_conferences(host_id);
CREATE INDEX IF NOT EXISTS idx_video_conferences_status ON public.video_conferences(status);
