-- ============================================================
-- ADD_EMAIL_CHANGE_COLUMNS.sql
-- 在 profiles 表添加邮箱修改确认所需的字段
-- 在 Supabase SQL Editor 中执行
-- ============================================================

DO $$
BEGIN
  -- 待确认的新邮箱
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_change_pending') THEN
    ALTER TABLE public.profiles ADD COLUMN email_change_pending text;
  END IF;

  -- 确认令牌
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_change_token') THEN
    ALTER TABLE public.profiles ADD COLUMN email_change_token text;
  END IF;

  -- 令牌过期时间
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_change_token_exp') THEN
    ALTER TABLE public.profiles ADD COLUMN email_change_token_exp timestamptz;
  END IF;

  -- 索引（加速令牌查询）
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'idx_profiles_email_change_token') THEN
    CREATE INDEX idx_profiles_email_change_token ON public.profiles(email_change_token);
  END IF;
END $$;

-- RLS 策略：允许用户更新自己的邮箱相关字段
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own email fields') THEN
    CREATE POLICY "Users can update own email fields"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);
  END IF;
END $$;
