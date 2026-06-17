-- ============================================================
-- Fix: social_post_platforms table (missing) + video_conferences RLS
-- Date: 2026-06-17 13:50
-- ============================================================

-- 1. Create social_post_platforms table (was never created)
CREATE TABLE IF NOT EXISTS public.social_post_platforms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('weibo','wechat','douyin','xiaohongshu','bilibili','zhihu','toutiao','other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','draft','scheduled','published','failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  post_url TEXT,
  platform_post_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spp_post_id ON public.social_post_platforms(post_id);
CREATE INDEX IF NOT EXISTS idx_spp_account_id ON public.social_post_platforms(account_id);

ALTER TABLE public.social_post_platforms ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_post_platforms' AND policyname = 'Users can view own platform posts') THEN
    CREATE POLICY "Users can view own platform posts" ON public.social_post_platforms
      FOR SELECT USING (account_id IN (SELECT id FROM social_accounts WHERE user_id = auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_post_platforms' AND policyname = 'Users can insert own platform posts') THEN
    CREATE POLICY "Users can insert own platform posts" ON public.social_post_platforms
      FOR INSERT WITH CHECK (account_id IN (SELECT id FROM social_accounts WHERE user_id = auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_post_platforms' AND policyname = 'Users can update own platform posts') THEN
    CREATE POLICY "Users can update own platform posts" ON public.social_post_platforms
      FOR UPDATE USING (account_id IN (SELECT id FROM social_accounts WHERE user_id = auth.uid()::text))
      WITH CHECK (account_id IN (SELECT id FROM social_accounts WHERE user_id = auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_post_platforms' AND policyname = 'Users can delete own platform posts') THEN
    CREATE POLICY "Users can delete own platform posts" ON public.social_post_platforms
      FOR DELETE USING (account_id IN (SELECT id FROM social_accounts WHERE user_id = auth.uid()::text));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_platforms TO anon, authenticated;

-- 2. Fix video_conferences RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_conferences' AND policyname = 'Conference host or participant can view') THEN
    CREATE POLICY "Conference host or participant can view" ON public.video_conferences
      FOR SELECT USING (
        host_id::text = auth.uid()::text
        OR auth.uid()::text = ANY(participants)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_conferences' AND policyname = 'Users can insert conferences') THEN
    CREATE POLICY "Users can insert conferences" ON public.video_conferences
      FOR INSERT WITH CHECK (host_id::text = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_conferences' AND policyname = 'Host can update conferences') THEN
    CREATE POLICY "Host can update conferences" ON public.video_conferences
      FOR UPDATE USING (host_id::text = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_conferences' AND policyname = 'Host can delete conferences') THEN
    CREATE POLICY "Host can delete conferences" ON public.video_conferences
      FOR DELETE USING (host_id::text = auth.uid()::text);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_conferences TO anon, authenticated;
