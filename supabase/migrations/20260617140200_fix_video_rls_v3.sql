-- ============================================================
-- Fix: video_conferences RLS correct type casting (v3)
-- Date: 2026-06-17 14:02
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Conference host or participant can view" ON public.video_conferences;
DROP POLICY IF EXISTS "Users can insert conferences" ON public.video_conferences;
DROP POLICY IF EXISTS "Host can update conferences" ON public.video_conferences;
DROP POLICY IF EXISTS "Host can delete conferences" ON public.video_conferences;

-- Create correct SELECT policy
-- Handles both uuid and text types by casting to text consistently
CREATE POLICY "Conference host or participant can view" ON public.video_conferences
  FOR SELECT USING (
    host_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM unnest(participants) AS p
      WHERE p::text = auth.uid()::text
    )
  );

-- Insert: host must be current user
CREATE POLICY "Users can insert conferences" ON public.video_conferences
  FOR INSERT WITH CHECK (host_id::text = auth.uid()::text);

-- Update: only host
CREATE POLICY "Host can update conferences" ON public.video_conferences
  FOR UPDATE USING (host_id::text = auth.uid()::text);

-- Delete: only host
CREATE POLICY "Host can delete conferences" ON public.video_conferences
  FOR DELETE USING (host_id::text = auth.uid()::text);
