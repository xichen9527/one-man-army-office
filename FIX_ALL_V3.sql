-- ============================================================
-- FIX_ALL_V3.sql — 动态删全部策略 + 修复列类型 + 重建策略
-- 在 Supabase SQL Editor 中执行
-- 与 V2 的区别：移除所有 CREATE POLICY 的 IF NOT EXISTS（Supabase PG 不支持）
-- ============================================================

-- ============ 第0步：动态删除 public 模式下所有 RLS 策略 ============
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
  RAISE NOTICE 'All policies dropped';
END $$;

-- ============ 第1步：GRANT 权限 ============
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- ============ 第2步：禁用所有表的 RLS（避免 ALTER 列时被阻塞）============
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
  END LOOP;
  RAISE NOTICE 'RLS disabled on all tables';
END $$;

-- ============ 第3步：删除所有 FK 约束 ============
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS tbl
    FROM pg_constraint
    WHERE contype = 'f' AND connamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
  RAISE NOTICE 'Foreign keys dropped';
END $$;

-- ============ 第4步：统一所有 uuid 列为 text ============
DO $$
DECLARE
  col_rec RECORD;
BEGIN
  FOR col_rec IN
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'uuid'
      AND column_name IN (
        'owner_id', 'creator_id', 'assignee_id', 'user_id',
        'host_id', 'sender_id', 'uploaded_by', 'created_by',
        'assigned_to', 'requester_id', 'approver_id', 'team_owner_id'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE text USING %I::text',
      col_rec.table_name, col_rec.column_name, col_rec.column_name
    );
    RAISE NOTICE 'Altered %.% from uuid to text', col_rec.table_name, col_rec.column_name;
  END LOOP;

  -- 修复 video_conferences.participants 如果是 uuid[]
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_conferences' AND column_name = 'participants'
      AND data_type = 'ARRAY'
  ) THEN
    BEGIN
      ALTER TABLE public.video_conferences
        ALTER COLUMN participants TYPE text[] USING participants::text[];
      RAISE NOTICE 'Altered video_conferences.participants to text[]';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'video_conferences.participants already text[] or not exists: %', SQLERRM;
    END;
  END IF;

  RAISE NOTICE 'All uuid columns converted to text';
END $$;

-- 填充 NULL owner_id
DO $$
BEGIN
  UPDATE public.customers SET owner_id = auth.uid()::text WHERE owner_id IS NULL;
  UPDATE public.sales_opportunities SET owner_id = auth.uid()::text WHERE owner_id IS NULL;
  RAISE NOTICE 'NULL owner_id rows updated';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not update NULL rows: %', SQLERRM;
END $$;

-- ============ 第5步：重新启用 RLS 并创建策略 ============

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id);

-- projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (auth.uid()::text = owner_id OR is_public = true);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid()::text = owner_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid()::text = owner_id);

-- tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING (auth.uid()::text = creator_id OR auth.uid()::text = assignee_id);
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING (auth.uid()::text = creator_id OR auth.uid()::text = assignee_id);
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING (auth.uid()::text = creator_id);

-- documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_own" ON public.documents FOR SELECT USING (auth.uid()::text = creator_id OR is_public = true OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid()::text));
CREATE POLICY "documents_insert_own" ON public.documents FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
CREATE POLICY "documents_update_own" ON public.documents FOR UPDATE USING (auth.uid()::text = creator_id);
CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE USING (auth.uid()::text = creator_id);

-- channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels_select_own" ON public.channels FOR SELECT USING (auth.uid()::text = created_by OR is_private = false);
CREATE POLICY "channels_insert_own" ON public.channels FOR INSERT WITH CHECK (auth.uid()::text = created_by);
CREATE POLICY "channels_update_own" ON public.channels FOR UPDATE USING (auth.uid()::text = created_by);
CREATE POLICY "channels_delete_own" ON public.channels FOR DELETE USING (auth.uid()::text = created_by);

-- messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_channel" ON public.messages FOR SELECT USING (channel_id IN (SELECT id FROM public.channels WHERE created_by = auth.uid()::text OR is_private = false));
CREATE POLICY "messages_insert_channel" ON public.messages FOR INSERT WITH CHECK (channel_id IN (SELECT id FROM public.channels WHERE created_by = auth.uid()::text OR is_private = false));
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE USING (auth.uid()::text = sender_id);
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE USING (auth.uid()::text = sender_id);

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (auth.uid()::text = user_id);

-- ai_conversations
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_conversations_select_own" ON public.ai_conversations FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "ai_conversations_insert_own" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "ai_conversations_update_own" ON public.ai_conversations FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "ai_conversations_delete_own" ON public.ai_conversations FOR DELETE USING (auth.uid()::text = user_id);

-- ai_messages
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_messages_select_own" ON public.ai_messages FOR SELECT USING (conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()::text));
CREATE POLICY "ai_messages_insert_own" ON public.ai_messages FOR INSERT WITH CHECK (conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()::text));
CREATE POLICY "ai_messages_delete_own" ON public.ai_messages FOR DELETE USING (conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()::text));

-- customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT USING (auth.uid()::text = owner_id);
CREATE POLICY "customers_insert_own" ON public.customers FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "customers_update_own" ON public.customers FOR UPDATE USING (auth.uid()::text = owner_id);
CREATE POLICY "customers_delete_own" ON public.customers FOR DELETE USING (auth.uid()::text = owner_id);

-- sales_opportunities
ALTER TABLE public.sales_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_opportunities_select_own" ON public.sales_opportunities FOR SELECT USING (auth.uid()::text = owner_id);
CREATE POLICY "sales_opportunities_insert_own" ON public.sales_opportunities FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "sales_opportunities_update_own" ON public.sales_opportunities FOR UPDATE USING (auth.uid()::text = owner_id);
CREATE POLICY "sales_opportunities_delete_own" ON public.sales_opportunities FOR DELETE USING (auth.uid()::text = owner_id);

-- followups
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followups_select_own" ON public.followups FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "followups_insert_own" ON public.followups FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "followups_delete_own" ON public.followups FOR DELETE USING (auth.uid()::text = user_id);

-- social_accounts
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_accounts_select_own" ON public.social_accounts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "social_accounts_insert_own" ON public.social_accounts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "social_accounts_update_own" ON public.social_accounts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "social_accounts_delete_own" ON public.social_accounts FOR DELETE USING (auth.uid()::text = user_id);

-- social_posts
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_posts_select_own" ON public.social_posts FOR SELECT USING (account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text));
CREATE POLICY "social_posts_insert_own" ON public.social_posts FOR INSERT WITH CHECK (account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text));
CREATE POLICY "social_posts_update_own" ON public.social_posts FOR UPDATE USING (account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text));
CREATE POLICY "social_posts_delete_own" ON public.social_posts FOR DELETE USING (account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text));

-- social_post_platforms
ALTER TABLE public.social_post_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_post_platforms_select_own" ON public.social_post_platforms FOR SELECT USING (account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text));
CREATE POLICY "social_post_platforms_insert_own" ON public.social_post_platforms FOR INSERT WITH CHECK (account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text));
CREATE POLICY "social_post_platforms_update_own" ON public.social_post_platforms FOR UPDATE USING (account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text));
CREATE POLICY "social_post_platforms_delete_own" ON public.social_post_platforms FOR DELETE USING (account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text));

-- trending_topics
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trending_topics_select_all" ON public.trending_topics FOR SELECT USING (true);
CREATE POLICY "trending_topics_insert_all" ON public.trending_topics FOR INSERT WITH CHECK (true);
CREATE POLICY "trending_topics_update_all" ON public.trending_topics FOR UPDATE USING (true);

-- video_conferences
ALTER TABLE public.video_conferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "video_conferences_select_own" ON public.video_conferences FOR SELECT USING (auth.uid()::text = host_id OR auth.uid()::text = ANY(participants));
CREATE POLICY "video_conferences_insert_own" ON public.video_conferences FOR INSERT WITH CHECK (auth.uid()::text = host_id);
CREATE POLICY "video_conferences_update_own" ON public.video_conferences FOR UPDATE USING (auth.uid()::text = host_id);
CREATE POLICY "video_conferences_delete_own" ON public.video_conferences FOR DELETE USING (auth.uid()::text = host_id);

-- team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_members_select_own" ON public.team_members FOR SELECT USING (auth.uid()::text = owner_id OR auth.uid()::text = user_id);
CREATE POLICY "team_members_insert_own" ON public.team_members FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "team_members_update_own" ON public.team_members FOR UPDATE USING (auth.uid()::text = owner_id);
CREATE POLICY "team_members_delete_own" ON public.team_members FOR DELETE USING (auth.uid()::text = owner_id);

-- invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_select_own" ON public.invitations FOR SELECT USING (auth.uid()::text = team_owner_id);
CREATE POLICY "invitations_insert_own" ON public.invitations FOR INSERT WITH CHECK (auth.uid()::text = team_owner_id);
CREATE POLICY "invitations_update_own" ON public.invitations FOR UPDATE USING (auth.uid()::text = team_owner_id);
CREATE POLICY "invitations_delete_own" ON public.invitations FOR DELETE USING (auth.uid()::text = team_owner_id);

-- files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files_select_own" ON public.files FOR SELECT USING (auth.uid()::text = uploaded_by OR is_public = true);
CREATE POLICY "files_insert_own" ON public.files FOR INSERT WITH CHECK (auth.uid()::text = uploaded_by);
CREATE POLICY "files_update_own" ON public.files FOR UPDATE USING (auth.uid()::text = uploaded_by);
CREATE POLICY "files_delete_own" ON public.files FOR DELETE USING (auth.uid()::text = uploaded_by);

-- approvals
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_select_own" ON public.approvals FOR SELECT USING (auth.uid()::text = requester_id OR auth.uid()::text = approver_id OR status = 'pending');
CREATE POLICY "approvals_insert_own" ON public.approvals FOR INSERT WITH CHECK (auth.uid()::text = requester_id);
CREATE POLICY "approvals_update_own" ON public.approvals FOR UPDATE USING (auth.uid()::text = requester_id OR auth.uid()::text = approver_id);
CREATE POLICY "approvals_delete_own" ON public.approvals FOR DELETE USING (auth.uid()::text = requester_id);

-- customer_contacts
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_contacts_select_own" ON public.customer_contacts FOR SELECT USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
CREATE POLICY "customer_contacts_insert_own" ON public.customer_contacts FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
CREATE POLICY "customer_contacts_update_own" ON public.customer_contacts FOR UPDATE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
CREATE POLICY "customer_contacts_delete_own" ON public.customer_contacts FOR DELETE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));

-- video_conference_configs
ALTER TABLE public.video_conference_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "video_conference_configs_select_own" ON public.video_conference_configs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "video_conference_configs_insert_own" ON public.video_conference_configs FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "video_conference_configs_update_own" ON public.video_conference_configs FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "video_conference_configs_delete_own" ON public.video_conference_configs FOR DELETE USING (auth.uid()::text = user_id);

-- ============ 第6步：验证 ============
SELECT 'RLS enabled tables' as check, count(*) as cnt FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

SELECT 'Total policies' as check, count(*) as cnt FROM pg_policies WHERE schemaname = 'public';

SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
