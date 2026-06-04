ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_id ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid()::text = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "projects_select_own_or_public" ON public.projects;
CREATE POLICY "projects_select_own_or_public" ON public.projects FOR SELECT USING (auth.uid()::text = owner_id OR is_public = true);
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid()::text = owner_id);
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING (auth.uid()::text = creator_id OR auth.uid()::text = assignee_id);
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING (auth.uid()::text = creator_id OR auth.uid()::text = assignee_id);
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING (auth.uid()::text = creator_id);

DROP POLICY IF EXISTS "documents_select_own_or_public" ON public.documents;
CREATE POLICY "documents_select_own_or_public" ON public.documents FOR SELECT USING (auth.uid()::text = creator_id OR is_public = true);
DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
CREATE POLICY "documents_insert_own" ON public.documents FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
CREATE POLICY "documents_update_own" ON public.documents FOR UPDATE USING (auth.uid()::text = creator_id);
DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE USING (auth.uid()::text = creator_id);

DROP POLICY IF EXISTS "channels_select_own" ON public.channel_id;
CREATE POLICY "channels_select_own" ON public.channel_id FOR SELECT USING (auth.uid()::text = created_by);
DROP POLICY IF EXISTS "channels_insert_own" ON public.channel_id;
CREATE POLICY "channels_insert_own" ON public.channel_id FOR INSERT WITH CHECK (auth.uid()::text = created_by);
DROP POLICY IF EXISTS "channels_update_own" ON public.channel_id;
CREATE POLICY "channels_update_own" ON public.channel_id FOR UPDATE USING (auth.uid()::text = created_by);
DROP POLICY IF EXISTS "channels_delete_own" ON public.channel_id;
CREATE POLICY "channels_delete_own" ON public.channel_id FOR DELETE USING (auth.uid()::text = created_by);

DROP POLICY IF EXISTS "messages_select_channel_member" ON public.messages;
CREATE POLICY "messages_select_channel_member" ON public.messages FOR SELECT USING (auth.uid()::text IN (SELECT created_by FROM public.channel_id WHERE id = channel_id));
DROP POLICY IF EXISTS "messages_insert_channel_member" ON public.messages;
CREATE POLICY "messages_insert_channel_member" ON public.messages FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT created_by FROM public.channel_id WHERE id = channel_id));
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE USING (auth.uid()::text = sender_id);
DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE USING (auth.uid()::text = sender_id);

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "ai_conversations_select_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_select_own" ON public.ai_conversations FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "ai_conversations_insert_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_insert_own" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "ai_conversations_update_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_update_own" ON public.ai_conversations FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "ai_conversations_delete_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_delete_own" ON public.ai_conversations FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "ai_messages_select_own" ON public.ai_messages;
CREATE POLICY "ai_messages_select_own" ON public.ai_messages FOR SELECT USING (auth.uid()::text IN (SELECT user_id FROM public.ai_conversations WHERE id = conversation_id));
DROP POLICY IF EXISTS "ai_messages_insert_own" ON public.ai_messages;
CREATE POLICY "ai_messages_insert_own" ON public.ai_messages FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT user_id FROM public.ai_conversations WHERE id = conversation_id));
DROP POLICY IF EXISTS "ai_messages_delete_own" ON public.ai_messages;
CREATE POLICY "ai_messages_delete_own" ON public.ai_messages FOR DELETE USING (auth.uid()::text IN (SELECT user_id FROM public.ai_conversations WHERE id = conversation_id));
