-- ============================================================
-- Fix: video_conferences RLS correct type casting (v2)
-- Date: 2026-06-17 14:01
-- Handles both uuid and text types for host_id and participants
-- ============================================================

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Conference host or participant can view" ON public.video_conferences;
DROP POLICY IF EXISTS "Users can insert conferences" ON public.video_conferences;
DROP POLICY IF EXISTS "Host can update conferences" ON public.video_conferences;
DROP POLICY IF EXISTS "Host can delete conferences" ON public.video_conferences;

-- Create correct SELECT policy
-- Works whether host_id is uuid or text, participants is uuid[] or text[]
CREATE POLICY "Conference host or participant can view" ON public.video_conferences
  FOR SELECT USING (
    host_id::text = auth.uid()::text
    OR auth.uid()::text = ANY(
      ARRAY(SELECT unnest(participants)::text)
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
