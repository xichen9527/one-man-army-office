-- ============================================================
-- Fix: video_conferences RLS correct type casting
-- Date: 2026-06-17 14:00
-- ============================================================

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Conference host or participant can view" ON public.video_conferences;
DROP POLICY IF EXISTS "Users can insert conferences" ON public.video_conferences;
DROP POLICY IF EXISTS "Host can update conferences" ON public.video_conferences;
DROP POLICY IF EXISTS "Host can delete conferences" ON public.video_conferences;

-- Recreate with correct typing
-- host_id: if uuid type → auth.uid()::uuid; if text → auth.uid()::text
-- participants: if uuid[] → cast to text[] for comparison
CREATE POLICY "Conference host or participant can view" ON public.video_conferences
  FOR SELECT USING (
    host_id::text = auth.uid()::text
    OR auth.uid()::text = ANY(participants::text[])
  );

CREATE POLICY "Users can insert conferences" ON public.video_conferences
  FOR INSERT WITH CHECK (host_id::text = auth.uid()::text);

CREATE POLICY "Host can update conferences" ON public.video_conferences
  FOR UPDATE USING (host_id::text = auth.uid()::text);

CREATE POLICY "Host can delete conferences" ON public.video_conferences
  FOR DELETE USING (host_id::text = auth.uid()::text);
