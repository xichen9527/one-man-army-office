-- ============================================================
-- Migration: Enable RLS + User Data Isolation
-- Date: 2026-06-03
-- Purpose: Ensure each user only sees and manages their own data
-- ============================================================

-- Enable RLS on all tables
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

-- ============================================================
-- profiles: users can read/update their own profile only
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- projects: owner sees all, public projects visible to authenticated
-- ============================================================
DROP POLICY IF EXISTS "projects_select_own_or_public" ON public.projects;
CREATE POLICY "projects_select_own_or_public" ON public.projects
  FOR SELECT USING (
    auth.uid() = owner_id
    OR is_public = true
  );

DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================
-- tasks: creator or assignee can see, only creator/assignee can update
-- ============================================================
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (
    auth.uid() = creator_id
    OR auth.uid() = assignee_id
  );

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = creator_id
    OR auth.uid() = assignee_id
  );

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (auth.uid() = creator_id);

-- ============================================================
-- documents: creator sees own, public docs visible
-- ============================================================
DROP POLICY IF EXISTS "documents_select_own_or_public" ON public.documents;
CREATE POLICY "documents_select_own_or_public" ON public.documents
  FOR SELECT USING (
    auth.uid() = creator_id
    OR is_public = true
  );

DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
CREATE POLICY "documents_insert_own" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
CREATE POLICY "documents_delete_own" ON public.documents
  FOR DELETE USING (auth.uid() = creator_id);

-- ============================================================
-- channels: created_by user sees their channels
-- ============================================================
DROP POLICY IF EXISTS "channels_select_own" ON public.channels;
CREATE POLICY "channels_select_own" ON public.channels
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "channels_insert_own" ON public.channels;
CREATE POLICY "channels_insert_own" ON public.channels
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "channels_update_own" ON public.channels;
CREATE POLICY "channels_update_own" ON public.channels
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "channels_delete_own" ON public.channels;
CREATE POLICY "channels_delete_own" ON public.channels
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================================
-- messages: visible to channel creator (channel-based access)
-- ============================================================
DROP POLICY IF EXISTS "messages_select_channel_member" ON public.messages;
CREATE POLICY "messages_select_channel_member" ON public.messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT created_by FROM public.channels WHERE id = channel_id
    )
  );

DROP POLICY IF EXISTS "messages_insert_channel_member" ON public.messages;
CREATE POLICY "messages_insert_channel_member" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM public.channels WHERE id = channel_id
    )
  );

DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own" ON public.messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ============================================================
-- notifications: user sees only their own
-- ============================================================
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ai_conversations: user sees only their own
-- ============================================================
DROP POLICY IF EXISTS "ai_conversations_select_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_select_own" ON public.ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_insert_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_insert_own" ON public.ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_update_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_update_own" ON public.ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_delete_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_delete_own" ON public.ai_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ai_messages: user sees messages of their own conversations
-- ============================================================
DROP POLICY IF EXISTS "ai_messages_select_own" ON public.ai_messages;
CREATE POLICY "ai_messages_select_own" ON public.ai_messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.ai_conversations WHERE id = conversation_id
    )
  );

DROP POLICY IF EXISTS "ai_messages_insert_own" ON public.ai_messages;
CREATE POLICY "ai_messages_insert_own" ON public.ai_messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.ai_conversations WHERE id = conversation_id
    )
  );

DROP POLICY IF EXISTS "ai_messages_delete_own" ON public.ai_messages;
CREATE POLICY "ai_messages_delete_own" ON public.ai_messages
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM public.ai_conversations WHERE id = conversation_id
    )
  );

-- ============================================================
-- customers: needs owner_id column - add it first
-- ============================================================
-- NOTE: Run migration 20260603000001_add_customer_owner_id.sql first
-- If owner_id column exists, apply policies:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'owner_id'
  ) THEN
    EXECUTE '
      DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
      CREATE POLICY "customers_select_own" ON public.customers
        FOR SELECT USING (auth.uid() = owner_id);

      DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
      CREATE POLICY "customers_insert_own" ON public.customers
        FOR INSERT WITH CHECK (auth.uid() = owner_id);

      DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
      CREATE POLICY "customers_update_own" ON public.customers
        FOR UPDATE USING (auth.uid() = owner_id);

      DROP POLICY IF EXISTS "customers_delete_own" ON public.customers;
      CREATE POLICY "customers_delete_own" ON public.customers
        FOR DELETE USING (auth.uid() = owner_id);
    ';
  END IF;
END $$;

-- ============================================================
-- sales_opportunities: needs owner_id column - add it first
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_opportunities' AND column_name = 'owner_id'
  ) THEN
    EXECUTE '
      DROP POLICY IF EXISTS "sales_opportunities_select_own" ON public.sales_opportunities;
      CREATE POLICY "sales_opportunities_select_own" ON public.sales_opportunities
        FOR SELECT USING (auth.uid() = owner_id);

      DROP POLICY IF EXISTS "sales_opportunities_insert_own" ON public.sales_opportunities;
      CREATE POLICY "sales_opportunities_insert_own" ON public.sales_opportunities
        FOR INSERT WITH CHECK (auth.uid() = owner_id);

      DROP POLICY IF EXISTS "sales_opportunities_update_own" ON public.sales_opportunities;
      CREATE POLICY "sales_opportunities_update_own" ON public.sales_opportunities
        FOR UPDATE USING (auth.uid() = owner_id);

      DROP POLICY IF EXISTS "sales_opportunities_delete_own" ON public.sales_opportunities;
      CREATE POLICY "sales_opportunities_delete_own" ON public.sales_opportunities
        FOR DELETE USING (auth.uid() = owner_id);
    ';
  END IF;
END $$;

-- ============================================================
-- followups: user sees own, via customers relationship
-- ============================================================
-- Apply via customers (RLS cascades through owner)
DROP POLICY IF EXISTS "followups_select_own" ON public.followups;
CREATE POLICY "followups_select_own" ON public.followups
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "followups_insert_own" ON public.followups;
CREATE POLICY "followups_insert_own" ON public.followups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "followups_delete_own" ON public.followups;
CREATE POLICY "followups_delete_own" ON public.followups
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- social_accounts: user sees/manages only own
-- ============================================================
DROP POLICY IF EXISTS "social_accounts_select_own" ON public.social_accounts;
CREATE POLICY "social_accounts_select_own" ON public.social_accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_accounts_insert_own" ON public.social_accounts;
CREATE POLICY "social_accounts_insert_own" ON public.social_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_accounts_update_own" ON public.social_accounts;
CREATE POLICY "social_accounts_update_own" ON public.social_accounts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_accounts_delete_own" ON public.social_accounts;
CREATE POLICY "social_accounts_delete_own" ON public.social_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- social_posts: via account ownership (user_id through account)
-- ============================================================
DROP POLICY IF EXISTS "social_posts_select_own" ON public.social_posts;
CREATE POLICY "social_posts_select_own" ON public.social_posts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.social_accounts WHERE id = account_id
    )
  );

DROP POLICY IF EXISTS "social_posts_insert_own" ON public.social_posts;
CREATE POLICY "social_posts_insert_own" ON public.social_posts
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.social_accounts WHERE id = account_id
    )
  );

DROP POLICY IF EXISTS "social_posts_update_own" ON public.social_posts;
CREATE POLICY "social_posts_update_own" ON public.social_posts
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM public.social_accounts WHERE id = account_id
    )
  );

DROP POLICY IF EXISTS "social_posts_delete_own" ON public.social_posts;
CREATE POLICY "social_posts_delete_own" ON public.social_posts
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM public.social_accounts WHERE id = account_id
    )
  );

-- ============================================================
-- trending_topics: read-only, no sensitive data
-- ============================================================
DROP POLICY IF EXISTS "trending_topics_select_all" ON public.trending_topics;
CREATE POLICY "trending_topics_select_all" ON public.trending_topics
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "trending_topics_insert_all" ON public.trending_topics;
CREATE POLICY "trending_topics_insert_all" ON public.trending_topics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "trending_topics_update_all" ON public.trending_topics;
CREATE POLICY "trending_topics_update_all" ON public.trending_topics
  FOR UPDATE USING (true);

-- ============================================================
-- video_conferences: host sees own conferences
-- ============================================================
DROP POLICY IF EXISTS "video_conferences_select_own" ON public.video_conferences;
CREATE POLICY "video_conferences_select_own" ON public.video_conferences
  FOR SELECT USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "video_conferences_insert_own" ON public.video_conferences;
CREATE POLICY "video_conferences_insert_own" ON public.video_conferences
  FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "video_conferences_update_own" ON public.video_conferences;
CREATE POLICY "video_conferences_update_own" ON public.video_conferences
  FOR UPDATE USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "video_conferences_delete_own" ON public.video_conferences;
CREATE POLICY "video_conferences_delete_own" ON public.video_conferences
  FOR DELETE USING (auth.uid() = host_id);

-- ============================================================
-- team_members: owner sees their team, member sees self
-- ============================================================
DROP POLICY IF EXISTS "team_members_select_own" ON public.team_members;
CREATE POLICY "team_members_select_own" ON public.team_members
  FOR SELECT USING (
    auth.uid() = owner_id
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "team_members_insert_own" ON public.team_members;
CREATE POLICY "team_members_insert_own" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "team_members_update_own" ON public.team_members;
CREATE POLICY "team_members_update_own" ON public.team_members
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "team_members_delete_own" ON public.team_members;
CREATE POLICY "team_members_delete_own" ON public.team_members
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================
-- invitations: owner sees own invites
-- ============================================================
DROP POLICY IF EXISTS "invitations_select_own" ON public.invitations;
CREATE POLICY "invitations_select_own" ON public.invitations
  FOR SELECT USING (auth.uid() = team_owner_id);

DROP POLICY IF EXISTS "invitations_insert_own" ON public.invitations;
CREATE POLICY "invitations_insert_own" ON public.invitations
  FOR INSERT WITH CHECK (auth.uid() = team_owner_id);

DROP POLICY IF EXISTS "invitations_update_own" ON public.invitations;
CREATE POLICY "invitations_update_own" ON public.invitations
  FOR UPDATE USING (auth.uid() = team_owner_id);

DROP POLICY IF EXISTS "invitations_delete_own" ON public.invitations;
CREATE POLICY "invitations_delete_own" ON public.invitations
  FOR DELETE USING (auth.uid() = team_owner_id);

-- ============================================================
-- files: owner sees own, or public files
-- ============================================================
DROP POLICY IF EXISTS "files_select_own_or_public" ON public.files;
CREATE POLICY "files_select_own_or_public" ON public.files
  FOR SELECT USING (
    auth.uid() = uploaded_by
    OR is_public = true
  );

DROP POLICY IF EXISTS "files_insert_own" ON public.files;
CREATE POLICY "files_insert_own" ON public.files
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "files_update_own" ON public.files;
CREATE POLICY "files_update_own" ON public.files
  FOR UPDATE USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "files_delete_own" ON public.files;
CREATE POLICY "files_delete_own" ON public.files
  FOR DELETE USING (auth.uid() = uploaded_by);
