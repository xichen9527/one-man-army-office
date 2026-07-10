-- ============================================================
-- 修复 profiles / channels 表 RLS 导致的 403 错误
-- 问题：store 代码跨用户读取这两个表，但 RLS 策略只允许读自己的数据
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles 表：允许读取团队成员的基本资料（id/full_name/username/email）
--    原策略 profiles_select_own 只允许 auth.uid() = id，导致
--    fetchTeamMembers() 在读取队友 profiles 时 403
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_team" ON public.profiles
  FOR SELECT USING (
    auth.uid()::text = id
    OR auth.uid()::text IN (SELECT owner_id FROM team_members WHERE user_id = profiles.id)
    OR auth.uid()::text IN (SELECT user_id FROM team_members WHERE owner_id = profiles.id)
  );

-- ------------------------------------------------------------
-- 2. channels 表：允许读取公开频道 + 自己的私有频道
--    注意：store 查询的是 'channels' 表；部分 SQL 文件误写为 'channel_id'
--    下面两条都执行，只对存在的表生效（DROP POLICY IF EXISTS 安全）
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "channels_select_own" ON public.channels;
CREATE POLICY "channels_select_visible" ON public.channels
  FOR SELECT USING (is_private = false OR auth.uid()::text = created_by);

DROP POLICY IF EXISTS "channels_select_own" ON public.channel_id;
CREATE POLICY "channels_select_visible" ON public.channel_id
  FOR SELECT USING (is_private = false OR auth.uid()::text = created_by);
