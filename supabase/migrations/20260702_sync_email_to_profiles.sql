-- 同步 auth.users.email 到 profiles.email 的触发器
-- 当用户在 Supabase Auth 中确认新邮箱后，自动更新 profiles.email

-- 创建函数：同步邮箱从 auth.users 到 profiles
CREATE OR REPLACE FUNCTION public.handle_email_update()
RETURNS TRIGGER AS $$
BEGIN
  -- 当 auth.users 的 email 变更时，同步到 profiles
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器（需要在 Supabase Dashboard 的 SQL Editor 中执行）
-- 注意：无法直接为 auth.users 创建触发器，因为 auth schema 是 Supabase 管理的
-- 替代方案：使用 Supabase Email Hook 或在前端监听 USER_UPDATED 事件

-- 由于无法直接为 auth.users 创建触发器，我们依赖前端的 onAuthStateChange 事件
-- 前端代码已在 src/store/index.ts 中添加 USER_UPDATED 事件监听

-- 另外，确保 profiles 表的 email 字段有正确的 RLS 策略
-- 用户需要能在 USER_UPDATED 事件触发时更新自己的 email

-- 检查并创建 RLS 策略（如果不存在）
DO $$
BEGIN
  -- 允许用户更新自己的 email
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own email'
  ) THEN
    CREATE POLICY "Users can update own email"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);
  END IF;
END $$;
