-- Migrate trending_topics to match frontend type definition
-- Old schema: topic_name, topic_url, last_updated, created_at
-- New schema: title, url, heat, trend, description, captured_at

-- Drop old table and recreate (this is a cache table, no valuable data to preserve)
DROP TABLE IF EXISTS public.trending_topics CASCADE;

CREATE TABLE public.trending_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  heat INTEGER DEFAULT 0,
  trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
  url TEXT,
  description TEXT,
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: everyone can read, only service role can write (Edge Function uses service_role key)
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trending_topics' AND policyname = 'Trending topics are viewable by everyone') THEN
    CREATE POLICY "Trending topics are viewable by everyone" ON public.trending_topics
      FOR SELECT USING (true);
  END IF;
END $$;

-- Index for fast platform filtering
CREATE INDEX IF NOT EXISTS idx_trending_topics_platform ON public.trending_topics(platform);
CREATE INDEX IF NOT EXISTS idx_trending_topics_heat ON public.trending_topics(heat DESC);

-- GRANT
GRANT ALL ON public.trending_topics TO service_role;
GRANT SELECT ON public.trending_topics TO anon;
GRANT SELECT ON public.trending_topics TO authenticated;
