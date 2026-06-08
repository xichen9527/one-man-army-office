-- 诊断脚本：检查 RLS 状态和 policies
-- 在 Supabase SQL Editor 中运行

-- 1. 检查各表的 RLS 是否启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles','projects','tasks','documents','channels','messages',
    'notifications','ai_conversations','ai_messages','customers',
    'sales_opportunities','followups','social_accounts','social_posts',
    'trending_topics','video_conferences','team_members','invitations','files'
  )
ORDER BY tablename;

-- 2. 检查是否有 INSERT 策略
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
  AND cmd = 'INSERT'
ORDER BY tablename;
