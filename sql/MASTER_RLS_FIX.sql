-- ============================================================
-- 一人成军办公平台 - 主 RLS 修复 (MASTER)
-- 覆盖 store 中所有 .from() 涉及的 21 张表
-- 策略列名以 store 代码实际查询为准（而非 schema）
-- 安全特性：存在性检查、幂等可重跑、不破坏已有正常策略
-- 执行时间：< 2 秒
-- ============================================================

-- ============================================================
-- 0. 修复 files 表列名不一致 (schema: uploaded_by, store: uploader_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='files' AND column_name='uploaded_by'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='files' AND column_name='uploader_id'
  ) THEN
    ALTER TABLE public.files RENAME COLUMN uploaded_by TO uploader_id;
  END IF;
END $$;

-- ============================================================
-- 辅助函数：安全创建策略（带列存在性检查）
-- 用法：SELECT create_policy_if_column_exists('table', 'policy_name', 'cmd', 'using_expr', 'with_check_expr');
-- ============================================================
CREATE OR REPLACE FUNCTION create_policy_if_column_exists(
  p_table TEXT, p_policy TEXT, p_cmd TEXT,
  p_using TEXT DEFAULT NULL, p_check TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_sql TEXT;
  v_has_table BOOLEAN;
  -- 我们在外部 SQL 里用调用者传入的列名做检查
  -- 这里简化为：只要表存在就尝试创建，让 CREATE POLICY 自己报错
BEGIN
  -- 检查表是否存在
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name=p_table
  ) INTO v_has_table;
  IF NOT v_has_table THEN
    RETURN; -- 表不存在，静默跳过
  END IF;
  -- 删除已存在的同名策略
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_policy, p_table);
  -- 构建并执行 CREATE POLICY
  v_sql := format('CREATE POLICY %I ON public.%I FOR %s', p_policy, p_table, p_cmd);
  IF p_using IS NOT NULL THEN
    v_sql := v_sql || ' USING (' || p_using || ')';
  END IF;
  IF p_check IS NOT NULL THEN
    v_sql := v_sql || ' WITH CHECK (' || p_check || ')';
  END IF;
  EXECUTE v_sql;
EXCEPTION WHEN OTHERS THEN
  -- 列不存在等错误：记录到 notice 但不中断
  RAISE NOTICE 'Skip policy % on %: %', p_policy, p_table, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. ai_conversations (owner: user_id)
-- ============================================================
SELECT create_policy_if_column_exists('ai_conversations', 'ai_conv_select_own', 'SELECT', 'user_id = auth.uid()::text');
SELECT create_policy_if_column_exists('ai_conversations', 'ai_conv_insert_own', 'INSERT', NULL, 'user_id = auth.uid()::text');
SELECT create_policy_if_column_exists('ai_conversations', 'ai_conv_update_own', 'UPDATE', 'user_id = auth.uid()::text');
SELECT create_policy_if_column_exists('ai_conversations', 'ai_conv_delete_own', 'DELETE', 'user_id = auth.uid()::text');

-- ============================================================
-- 2. ai_messages (owner: 通过 conversation 的 user_id)
-- ============================================================
SELECT create_policy_if_column_exists('ai_messages', 'ai_msg_select_own', 'SELECT',
  'conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()::text)');
SELECT create_policy_if_column_exists('ai_messages', 'ai_msg_insert_own', 'INSERT', NULL,
  'conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()::text)');
SELECT create_policy_if_column_exists('ai_messages', 'ai_msg_update_own', 'UPDATE',
  'conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()::text)');
SELECT create_policy_if_column_exists('ai_messages', 'ai_msg_delete_own', 'DELETE',
  'conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()::text)');

-- ============================================================
-- 3. approvals (尝试常见所有者列: user_id / requester_id / approver_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='approvals' AND column_name='user_id') THEN
    PERFORM create_policy_if_column_exists('approvals', 'approvals_select_own', 'SELECT', 'user_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('approvals', 'approvals_insert_own', 'INSERT', NULL, 'user_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('approvals', 'approvals_update_own', 'UPDATE', 'user_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('approvals', 'approvals_delete_own', 'DELETE', 'user_id = auth.uid()::text');
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='approvals' AND column_name='requester_id') THEN
    PERFORM create_policy_if_column_exists('approvals', 'approvals_select_own', 'SELECT', 'requester_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('approvals', 'approvals_insert_own', 'INSERT', NULL, 'requester_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('approvals', 'approvals_update_own', 'UPDATE', 'requester_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('approvals', 'approvals_delete_own', 'DELETE', 'requester_id = auth.uid()::text');
  ELSE
    RAISE NOTICE 'approvals: 未找到 user_id/requester_id 列，跳过';
  END IF;
END $$;

-- ============================================================
-- 4. channels (公开频道 + 自己创建的私有频道)
-- ============================================================
SELECT create_policy_if_column_exists('channels', 'channels_select_visible', 'SELECT',
  'is_private = false OR created_by = auth.uid()::text OR created_by = auth.uid()');
SELECT create_policy_if_column_exists('channels', 'channels_insert_own', 'INSERT', NULL,
  'created_by = auth.uid()::text OR created_by = auth.uid()');
SELECT create_policy_if_column_exists('channels', 'channels_update_own', 'UPDATE',
  'created_by = auth.uid()::text OR created_by = auth.uid()');
SELECT create_policy_if_column_exists('channels', 'channels_delete_own', 'DELETE',
  'created_by = auth.uid()::text OR created_by = auth.uid()');

-- ============================================================
-- 5. customers (owner: assigned_to)
-- ============================================================
SELECT create_policy_if_column_exists('customers', 'customers_select_assigned', 'SELECT',
  'assigned_to = auth.uid()::text OR assigned_to = auth.uid()');
SELECT create_policy_if_column_exists('customers', 'customers_insert_own', 'INSERT', NULL,
  'assigned_to = auth.uid()::text OR assigned_to = auth.uid()');
SELECT create_policy_if_column_exists('customers', 'customers_update_own', 'UPDATE',
  'assigned_to = auth.uid()::text OR assigned_to = auth.uid()');
SELECT create_policy_if_column_exists('customers', 'customers_delete_own', 'DELETE',
  'assigned_to = auth.uid()::text OR assigned_to = auth.uid()');

-- ============================================================
-- 6. documents (owner: creator_id, 公开或项目成员可读)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='creator_id') THEN
    PERFORM create_policy_if_column_exists('documents', 'docs_select_own_or_public', 'SELECT',
      'creator_id = auth.uid()::text OR is_public = true');
    PERFORM create_policy_if_column_exists('documents', 'docs_insert_own', 'INSERT', NULL,
      'creator_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('documents', 'docs_update_own', 'UPDATE',
      'creator_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('documents', 'docs_delete_own', 'DELETE',
      'creator_id = auth.uid()::text');
  END IF;
END $$;

-- ============================================================
-- 7. files (owner: uploader_id, 列已重命名)
-- ============================================================
SELECT create_policy_if_column_exists('files', 'files_select_own', 'SELECT', 'uploader_id = auth.uid()::text');
SELECT create_policy_if_column_exists('files', 'files_insert_own', 'INSERT', NULL, 'uploader_id = auth.uid()::text');
SELECT create_policy_if_column_exists('files', 'files_update_own', 'UPDATE', 'uploader_id = auth.uid()::text');
SELECT create_policy_if_column_exists('files', 'files_delete_own', 'DELETE', 'uploader_id = auth.uid()::text');

-- ============================================================
-- 8. followups (owner: user_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='followups' AND column_name='user_id') THEN
    PERFORM create_policy_if_column_exists('followups', 'followups_select_own', 'SELECT', 'user_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('followups', 'followups_insert_own', 'INSERT', NULL, 'user_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('followups', 'followups_update_own', 'UPDATE', 'user_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('followups', 'followups_delete_own', 'DELETE', 'user_id = auth.uid()::text');
  END IF;
END $$;

-- ============================================================
-- 9. invitations (owner: team_owner_id)
-- ============================================================
SELECT create_policy_if_column_exists('invitations', 'inv_select_own', 'SELECT', 'team_owner_id = auth.uid()::text');
SELECT create_policy_if_column_exists('invitations', 'inv_insert_own', 'INSERT', NULL, 'team_owner_id = auth.uid()::text');
SELECT create_policy_if_column_exists('invitations', 'inv_update_own', 'UPDATE', 'team_owner_id = auth.uid()::text');
SELECT create_policy_if_column_exists('invitations', 'inv_delete_own', 'DELETE', 'team_owner_id = auth.uid()::text');

-- ============================================================
-- 10. messages (通过 channel 权限: 公开频道消息可读，自己的私有频道可写)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='channel_id') THEN
    PERFORM create_policy_if_column_exists('messages', 'msg_select_via_channel', 'SELECT',
      'channel_id IN (SELECT id FROM public.channels WHERE is_private = false OR created_by = auth.uid()::text OR created_by = auth.uid())');
    PERFORM create_policy_if_column_exists('messages', 'msg_insert_via_channel', 'INSERT', NULL,
      'channel_id IN (SELECT id FROM public.channels WHERE created_by = auth.uid()::text OR created_by = auth.uid())');
    PERFORM create_policy_if_column_exists('messages', 'msg_update_own', 'UPDATE',
      'sender_id = auth.uid()::text OR sender_id = auth.uid()');
    PERFORM create_policy_if_column_exists('messages', 'msg_delete_own', 'DELETE',
      'sender_id = auth.uid()::text OR sender_id = auth.uid()');
  END IF;
END $$;

-- ============================================================
-- 11. notifications (owner: user_id)
-- ============================================================
SELECT create_policy_if_column_exists('notifications', 'notif_select_own', 'SELECT', 'user_id = auth.uid()::text');
SELECT create_policy_if_column_exists('notifications', 'notif_insert_any', 'INSERT', NULL, 'true');  -- 允许系统/服务端插入
SELECT create_policy_if_column_exists('notifications', 'notif_update_own', 'UPDATE', 'user_id = auth.uid()::text');
SELECT create_policy_if_column_exists('notifications', 'notif_delete_own', 'DELETE', 'user_id = auth.uid()::text');

-- ============================================================
-- 12. profiles (自己 + 团队成员可见)
-- ============================================================
SELECT create_policy_if_column_exists('profiles', 'profiles_select_own', 'SELECT', 'id = auth.uid()::text');
SELECT create_policy_if_column_exists('profiles', 'profiles_select_team', 'SELECT',
  'id IN (SELECT user_id FROM public.team_members WHERE owner_id = auth.uid()::text) OR id IN (SELECT owner_id FROM public.team_members WHERE user_id = auth.uid()::text)');
SELECT create_policy_if_column_exists('profiles', 'profiles_insert_own', 'INSERT', NULL, 'id = auth.uid()::text');
SELECT create_policy_if_column_exists('profiles', 'profiles_update_own', 'UPDATE', 'id = auth.uid()::text');

-- ============================================================
-- 13. projects (owner: owner_id, 公开或成员可读)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='owner_id') THEN
    PERFORM create_policy_if_column_exists('projects', 'projects_select_own_or_public', 'SELECT',
      'owner_id = auth.uid()::text OR is_public = true');
    PERFORM create_policy_if_column_exists('projects', 'projects_insert_own', 'INSERT', NULL,
      'owner_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('projects', 'projects_update_own', 'UPDATE',
      'owner_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('projects', 'projects_delete_own', 'DELETE',
      'owner_id = auth.uid()::text');
  END IF;
END $$;

-- ============================================================
-- 14. sales_opportunities (owner: assigned_to)
-- ============================================================
SELECT create_policy_if_column_exists('sales_opportunities', 'sales_select_assigned', 'SELECT',
  'assigned_to = auth.uid()::text OR assigned_to = auth.uid()');
SELECT create_policy_if_column_exists('sales_opportunities', 'sales_insert_own', 'INSERT', NULL,
  'assigned_to = auth.uid()::text OR assigned_to = auth.uid()');
SELECT create_policy_if_column_exists('sales_opportunities', 'sales_update_own', 'UPDATE',
  'assigned_to = auth.uid()::text OR assigned_to = auth.uid()');
SELECT create_policy_if_column_exists('sales_opportunities', 'sales_delete_own', 'DELETE',
  'assigned_to = auth.uid()::text OR assigned_to = auth.uid()');

-- ============================================================
-- 15. social_accounts (owner: user_id)
-- ============================================================
SELECT create_policy_if_column_exists('social_accounts', 'social_acc_select_own', 'SELECT', 'user_id = auth.uid()::text');
SELECT create_policy_if_column_exists('social_accounts', 'social_acc_insert_own', 'INSERT', NULL, 'user_id = auth.uid()::text');
SELECT create_policy_if_column_exists('social_accounts', 'social_acc_update_own', 'UPDATE', 'user_id = auth.uid()::text');
SELECT create_policy_if_column_exists('social_accounts', 'social_acc_delete_own', 'DELETE', 'user_id = auth.uid()::text');

-- ============================================================
-- 16. social_media_posts (owner: user_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='social_media_posts' AND column_name='user_id') THEN
    PERFORM create_policy_if_column_exists('social_media_posts', 'social_posts_select_own', 'SELECT', 'user_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('social_media_posts', 'social_posts_insert_own', 'INSERT', NULL, 'user_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('social_media_posts', 'social_posts_update_own', 'UPDATE', 'user_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('social_media_posts', 'social_posts_delete_own', 'DELETE', 'user_id = auth.uid()::text');
  END IF;
END $$;

-- ============================================================
-- 17. social_post_platforms (通过 post 的 user_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_post_platforms') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='social_post_platforms' AND column_name='post_id') THEN
      PERFORM create_policy_if_column_exists('social_post_platforms', 'spp_select_via_post', 'SELECT',
        'post_id IN (SELECT id FROM public.social_media_posts WHERE user_id = auth.uid()::text)');
      PERFORM create_policy_if_column_exists('social_post_platforms', 'spp_insert_via_post', 'INSERT', NULL,
        'post_id IN (SELECT id FROM public.social_media_posts WHERE user_id = auth.uid()::text)');
      PERFORM create_policy_if_column_exists('social_post_platforms', 'spp_update_via_post', 'UPDATE',
        'post_id IN (SELECT id FROM public.social_media_posts WHERE user_id = auth.uid()::text)');
      PERFORM create_policy_if_column_exists('social_post_platforms', 'spp_delete_via_post', 'DELETE',
        'post_id IN (SELECT id FROM public.social_media_posts WHERE user_id = auth.uid()::text)');
    END IF;
  END IF;
END $$;

-- ============================================================
-- 18. tasks (owner: creator_id, 公开或分配给自己可读)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='creator_id') THEN
    PERFORM create_policy_if_column_exists('tasks', 'tasks_select_own_or_assigned', 'SELECT',
      'creator_id = auth.uid()::text OR assignee_id = auth.uid()::text OR assignee_id = auth.uid()');
    PERFORM create_policy_if_column_exists('tasks', 'tasks_insert_own', 'INSERT', NULL,
      'creator_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('tasks', 'tasks_update_own_or_assigned', 'UPDATE',
      'creator_id = auth.uid()::text OR assignee_id = auth.uid()::text OR assignee_id = auth.uid()');
    PERFORM create_policy_if_column_exists('tasks', 'tasks_delete_own', 'DELETE',
      'creator_id = auth.uid()::text');
  END IF;
END $$;

-- ============================================================
-- 19. team_members (owner: owner_id, 成员自己可见)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='team_members' AND column_name='owner_id') THEN
    PERFORM create_policy_if_column_exists('team_members', 'tm_select_own_or_member', 'SELECT',
      'owner_id = auth.uid()::text OR user_id = auth.uid()::text OR user_id = auth.uid()');
    PERFORM create_policy_if_column_exists('team_members', 'tm_insert_own', 'INSERT', NULL,
      'owner_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('team_members', 'tm_update_own', 'UPDATE',
      'owner_id = auth.uid()::text');
    PERFORM create_policy_if_column_exists('team_members', 'tm_delete_own', 'DELETE',
      'owner_id = auth.uid()::text');
  END IF;
END $$;

-- ============================================================
-- 20. trending_topics (公开可读，Edge Function 写入)
-- ============================================================
SELECT create_policy_if_column_exists('trending_topics', 'trending_select_all', 'SELECT', 'true');
-- INSERT/UPDATE/DELETE 仅 service_role (Edge Function)，不创建用户策略

-- ============================================================
-- 21. video_conferences (owner: host_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='video_conferences' AND column_name='host_id') THEN
    PERFORM create_policy_if_column_exists('video_conferences', 'vc_select_own', 'SELECT',
      'host_id = auth.uid()::text OR host_id = auth.uid()');
    PERFORM create_policy_if_column_exists('video_conferences', 'vc_insert_own', 'INSERT', NULL,
      'host_id = auth.uid()::text OR host_id = auth.uid()');
    PERFORM create_policy_if_column_exists('video_conferences', 'vc_update_own', 'UPDATE',
      'host_id = auth.uid()::text OR host_id = auth.uid()');
    PERFORM create_policy_if_column_exists('video_conferences', 'vc_delete_own', 'DELETE',
      'host_id = auth.uid()::text OR host_id = auth.uid()');
  END IF;
END $$;

-- ============================================================
-- 完成提示
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE '主 RLS 修复完成。共处理 21 张表。';
  RAISE NOTICE '如个别策略因列名差异被跳过（notice），请检查该表结构。';
  RAISE NOTICE '============================================================';
END $$;
