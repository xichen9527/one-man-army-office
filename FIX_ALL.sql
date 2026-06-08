-- ============================================================
-- FIX_ALL.sql — 一键修复：GRANT权限 + owner_id + RLS策略
-- 在 Supabase SQL Editor 中执行
-- 顺序：GRANT → DROP 所有策略 → DROP FK → ALTER 类型 → 重建策略
-- ============================================================

-- ============ 第1步：GRANT 权限（解决 permission denied） ============
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- ============ 第2步：删除所有现有 RLS 策略（避免 ALTER 列时依赖阻塞） ============
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_select_own_or_public" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
DROP POLICY IF EXISTS "documents_select_own" ON public.documents;
DROP POLICY IF EXISTS "documents_select_own_or_public" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
DROP POLICY IF EXISTS "channels_select_own" ON public.channels;
DROP POLICY IF EXISTS "channels_insert_own" ON public.channels;
DROP POLICY IF EXISTS "channels_update_own" ON public.channels;
DROP POLICY IF EXISTS "channels_delete_own" ON public.channels;
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
DROP POLICY IF EXISTS "messages_select_channel_member" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_channel_member" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "ai_conversations_select_own" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_insert_own" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_update_own" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_delete_own" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_messages_select_own" ON public.ai_messages;
DROP POLICY IF EXISTS "ai_messages_insert_own" ON public.ai_messages;
DROP POLICY IF EXISTS "ai_messages_delete_own" ON public.ai_messages;
DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_own" ON public.customers;
DROP POLICY IF EXISTS "sales_opportunities_select_own" ON public.sales_opportunities;
DROP POLICY IF EXISTS "sales_opportunities_insert_own" ON public.sales_opportunities;
DROP POLICY IF EXISTS "sales_opportunities_update_own" ON public.sales_opportunities;
DROP POLICY IF EXISTS "sales_opportunities_delete_own" ON public.sales_opportunities;
DROP POLICY IF EXISTS "followups_select_own" ON public.followups;
DROP POLICY IF EXISTS "followups_insert_own" ON public.followups;
DROP POLICY IF EXISTS "followups_delete_own" ON public.followups;
DROP POLICY IF EXISTS "social_accounts_select_own" ON public.social_accounts;
DROP POLICY IF EXISTS "social_accounts_insert_own" ON public.social_accounts;
DROP POLICY IF EXISTS "social_accounts_update_own" ON public.social_accounts;
DROP POLICY IF EXISTS "social_accounts_delete_own" ON public.social_accounts;
DROP POLICY IF EXISTS "social_posts_select_own" ON public.social_posts;
DROP POLICY IF EXISTS "social_posts_insert_own" ON public.social_posts;
DROP POLICY IF EXISTS "social_posts_update_own" ON public.social_posts;
DROP POLICY IF EXISTS "social_posts_delete_own" ON public.social_posts;
DROP POLICY IF EXISTS "trending_topics_select_all" ON public.trending_topics;
DROP POLICY IF EXISTS "trending_topics_insert_all" ON public.trending_topics;
DROP POLICY IF EXISTS "trending_topics_update_all" ON public.trending_topics;
DROP POLICY IF EXISTS "video_conferences_select_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_insert_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_update_own" ON public.video_conferences;
DROP POLICY IF EXISTS "video_conferences_delete_own" ON public.video_conferences;
DROP POLICY IF EXISTS "team_members_select_own" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_own" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_own" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_own" ON public.team_members;
DROP POLICY IF EXISTS "invitations_select_own" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert_own" ON public.invitations;
DROP POLICY IF EXISTS "invitations_update_own" ON public.invitations;
DROP POLICY IF EXISTS "invitations_delete_own" ON public.invitations;
DROP POLICY IF EXISTS "files_select_own" ON public.files;
DROP POLICY IF EXISTS "files_select_own_or_public" ON public.files;
DROP POLICY IF EXISTS "files_insert_own" ON public.files;
DROP POLICY IF EXISTS "files_update_own" ON public.files;
DROP POLICY IF EXISTS "files_delete_own" ON public.files;

-- ============ 第3步：删除 FK 约束（避免 ALTER TYPE 时冲突） ============
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_owner_id_fkey;
ALTER TABLE public.sales_opportunities DROP CONSTRAINT IF EXISTS sales_opportunities_owner_id_fkey;
-- 其他可能存在的 FK
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_creator_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_creator_id_fkey;
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_created_by_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.ai_conversations DROP CONSTRAINT IF EXISTS ai_conversations_user_id_fkey;
ALTER TABLE public.social_accounts DROP CONSTRAINT IF EXISTS social_accounts_user_id_fkey;
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_uploaded_by_fkey;
ALTER TABLE public.video_conferences DROP CONSTRAINT IF EXISTS video_conferences_host_id_fkey;
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_owner_id_fkey;
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_team_owner_id_fkey;
ALTER TABLE public.followups DROP CONSTRAINT IF EXISTS followups_user_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- ============ 第4步：统一所有 user_id/owner_id 列为 TEXT ============

-- customers.owner_id
ALTER TABLE public.customers ALTER COLUMN owner_id TYPE text USING owner_id::text;
ALTER TABLE public.customers ALTER COLUMN owner_id DROP NOT NULL;

-- sales_opportunities.owner_id
ALTER TABLE public.sales_opportunities ALTER COLUMN owner_id TYPE text USING owner_id::text;
ALTER TABLE public.sales_opportunities ALTER COLUMN owner_id DROP NOT NULL;

-- 其他列（如果当前是 uuid 则转 text）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'owner_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.projects ALTER COLUMN owner_id TYPE text USING owner_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'creator_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.tasks ALTER COLUMN creator_id TYPE text USING creator_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assignee_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.tasks ALTER COLUMN assignee_id TYPE text USING assignee_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'created_by' AND data_type = 'uuid') THEN
    ALTER TABLE public.channels ALTER COLUMN created_by TYPE text USING created_by::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'creator_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.documents ALTER COLUMN creator_id TYPE text USING creator_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.notifications ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_conversations' AND column_name = 'user_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.ai_conversations ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'user_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.social_accounts ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'uploaded_by' AND data_type = 'uuid') THEN
    ALTER TABLE public.files ALTER COLUMN uploaded_by TYPE text USING uploaded_by::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_conferences' AND column_name = 'host_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.video_conferences ALTER COLUMN host_id TYPE text USING host_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'owner_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.team_members ALTER COLUMN owner_id TYPE text USING owner_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'user_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.team_members ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitations' AND column_name = 'team_owner_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.invitations ALTER COLUMN team_owner_id TYPE text USING team_owner_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followups' AND column_name = 'user_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.followups ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
  END IF;
END $$;

-- 填充 owner_id
UPDATE public.customers SET owner_id = (SELECT id::text FROM auth.users LIMIT 1) WHERE owner_id IS NULL;
UPDATE public.sales_opportunities SET owner_id = (SELECT id::text FROM auth.users LIMIT 1) WHERE owner_id IS NULL;

-- ============ 第5步：启用 RLS 并创建策略（auth.uid()::text 匹配） ============

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id);

-- projects
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (auth.uid()::text = owner_id OR is_public = true);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid()::text = owner_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid()::text = owner_id);

-- tasks
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING (auth.uid()::text = creator_id OR auth.uid()::text = assignee_id);
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING (auth.uid()::text = creator_id OR auth.uid()::text = assignee_id);
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING (auth.uid()::text = creator_id);

-- documents
CREATE POLICY "documents_select_own" ON public.documents FOR SELECT USING (auth.uid()::text = creator_id OR is_public = true);
CREATE POLICY "documents_insert_own" ON public.documents FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
CREATE POLICY "documents_update_own" ON public.documents FOR UPDATE USING (auth.uid()::text = creator_id);
CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE USING (auth.uid()::text = creator_id);

-- channels
CREATE POLICY "channels_select_own" ON public.channels FOR SELECT USING (auth.uid()::text = created_by);
CREATE POLICY "channels_insert_own" ON public.channels FOR INSERT WITH CHECK (auth.uid()::text = created_by);
CREATE POLICY "channels_update_own" ON public.channels FOR UPDATE USING (auth.uid()::text = created_by);
CREATE POLICY "channels_delete_own" ON public.channels FOR DELETE USING (auth.uid()::text = created_by);

-- messages
CREATE POLICY "messages_select_own" ON public.messages FOR SELECT USING (auth.uid()::text IN (SELECT created_by FROM public.channels WHERE id = channel_id));
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT created_by FROM public.channels WHERE id = channel_id));
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE USING (auth.uid()::text = sender_id);
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE USING (auth.uid()::text = sender_id);

-- notifications
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (auth.uid()::text = user_id);

-- ai_conversations
CREATE POLICY "ai_conversations_select_own" ON public.ai_conversations FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "ai_conversations_insert_own" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "ai_conversations_update_own" ON public.ai_conversations FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "ai_conversations_delete_own" ON public.ai_conversations FOR DELETE USING (auth.uid()::text = user_id);

-- ai_messages
CREATE POLICY "ai_messages_select_own" ON public.ai_messages FOR SELECT USING (auth.uid()::text IN (SELECT user_id FROM public.ai_conversations WHERE id = conversation_id));
CREATE POLICY "ai_messages_insert_own" ON public.ai_messages FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT user_id FROM public.ai_conversations WHERE id = conversation_id));
CREATE POLICY "ai_messages_delete_own" ON public.ai_messages FOR DELETE USING (auth.uid()::text IN (SELECT user_id FROM public.ai_conversations WHERE id = conversation_id));

-- customers
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT USING (auth.uid()::text = owner_id);
CREATE POLICY "customers_insert_own" ON public.customers FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "customers_update_own" ON public.customers FOR UPDATE USING (auth.uid()::text = owner_id);
CREATE POLICY "customers_delete_own" ON public.customers FOR DELETE USING (auth.uid()::text = owner_id);

-- sales_opportunities
CREATE POLICY "sales_opportunities_select_own" ON public.sales_opportunities FOR SELECT USING (auth.uid()::text = owner_id);
CREATE POLICY "sales_opportunities_insert_own" ON public.sales_opportunities FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "sales_opportunities_update_own" ON public.sales_opportunities FOR UPDATE USING (auth.uid()::text = owner_id);
CREATE POLICY "sales_opportunities_delete_own" ON public.sales_opportunities FOR DELETE USING (auth.uid()::text = owner_id);

-- followups
CREATE POLICY "followups_select_own" ON public.followups FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "followups_insert_own" ON public.followups FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "followups_delete_own" ON public.followups FOR DELETE USING (auth.uid()::text = user_id);

-- social_accounts
CREATE POLICY "social_accounts_select_own" ON public.social_accounts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "social_accounts_insert_own" ON public.social_accounts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "social_accounts_update_own" ON public.social_accounts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "social_accounts_delete_own" ON public.social_accounts FOR DELETE USING (auth.uid()::text = user_id);

-- social_posts
CREATE POLICY "social_posts_select_own" ON public.social_posts FOR SELECT USING (auth.uid()::text IN (SELECT user_id FROM public.social_accounts WHERE id = account_id));
CREATE POLICY "social_posts_insert_own" ON public.social_posts FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT user_id FROM public.social_accounts WHERE id = account_id));
CREATE POLICY "social_posts_update_own" ON public.social_posts FOR UPDATE USING (auth.uid()::text IN (SELECT user_id FROM public.social_accounts WHERE id = account_id));
CREATE POLICY "social_posts_delete_own" ON public.social_posts FOR DELETE USING (auth.uid()::text IN (SELECT user_id FROM public.social_accounts WHERE id = account_id));

-- trending_topics（公开可读写）
CREATE POLICY "trending_topics_select_all" ON public.trending_topics FOR SELECT USING (true);
CREATE POLICY "trending_topics_insert_all" ON public.trending_topics FOR INSERT WITH CHECK (true);
CREATE POLICY "trending_topics_update_all" ON public.trending_topics FOR UPDATE USING (true);

-- video_conferences
CREATE POLICY "video_conferences_select_own" ON public.video_conferences FOR SELECT USING (auth.uid()::text = host_id);
CREATE POLICY "video_conferences_insert_own" ON public.video_conferences FOR INSERT WITH CHECK (auth.uid()::text = host_id);
CREATE POLICY "video_conferences_update_own" ON public.video_conferences FOR UPDATE USING (auth.uid()::text = host_id);
CREATE POLICY "video_conferences_delete_own" ON public.video_conferences FOR DELETE USING (auth.uid()::text = host_id);

-- team_members
CREATE POLICY "team_members_select_own" ON public.team_members FOR SELECT USING (auth.uid()::text = owner_id OR auth.uid()::text = user_id);
CREATE POLICY "team_members_insert_own" ON public.team_members FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "team_members_update_own" ON public.team_members FOR UPDATE USING (auth.uid()::text = owner_id);
CREATE POLICY "team_members_delete_own" ON public.team_members FOR DELETE USING (auth.uid()::text = owner_id);

-- invitations
CREATE POLICY "invitations_select_own" ON public.invitations FOR SELECT USING (auth.uid()::text = team_owner_id);
CREATE POLICY "invitations_insert_own" ON public.invitations FOR INSERT WITH CHECK (auth.uid()::text = team_owner_id);
CREATE POLICY "invitations_update_own" ON public.invitations FOR UPDATE USING (auth.uid()::text = team_owner_id);
CREATE POLICY "invitations_delete_own" ON public.invitations FOR DELETE USING (auth.uid()::text = team_owner_id);

-- files
CREATE POLICY "files_select_own" ON public.files FOR SELECT USING (auth.uid()::text = uploaded_by OR is_public = true);
CREATE POLICY "files_insert_own" ON public.files FOR INSERT WITH CHECK (auth.uid()::text = uploaded_by);
CREATE POLICY "files_update_own" ON public.files FOR UPDATE USING (auth.uid()::text = uploaded_by);
CREATE POLICY "files_delete_own" ON public.files FOR DELETE USING (auth.uid()::text = uploaded_by);

-- ============ 第6步：验证 ============
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

SELECT count(*) as policy_count FROM pg_policies WHERE schemaname = 'public';
