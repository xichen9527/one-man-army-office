-- 社交媒体 RLS 策略修复
-- 问题：social_media_posts 和 social_post_platforms 缺少正确的 RLS 策略
-- social_media_posts 的 user_id 列不存在，需要通过 account_id → social_accounts → user_id 路径建立访问控制
-- 执行日期：2026-07-16

-- ============================================================
-- 辅助函数：幂等创建策略
-- ============================================================
CREATE OR REPLACE FUNCTION create_social_policy(
  p_table TEXT,
  p_name TEXT,
  p_operation TEXT,
  p_using_expression TEXT DEFAULT NULL,
  p_check_expression TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = p_table AND policyname = p_name
  ) THEN
    IF p_operation = 'SELECT' OR p_operation = 'DELETE' OR (p_operation = 'UPDATE' AND p_using_expression IS NOT NULL) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR %s USING (%s)',
        p_name, p_table, p_operation, p_using_expression
      );
    ELSIF p_operation = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR %s WITH CHECK (%s)',
        p_name, p_table, p_operation, p_check_expression
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 16. social_media_posts (通过 account_id → social_accounts → user_id)
-- ============================================================
DO $$
BEGIN
  -- 先检查 social_media_posts 表是否存在
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_media_posts') THEN
    
    -- 启用 RLS
    ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

    -- 删除旧的 user_id 策略（如果存在）
    DROP POLICY IF EXISTS "social_posts_select_own" ON public.social_media_posts;
    DROP POLICY IF EXISTS "social_posts_insert_own" ON public.social_media_posts;
    DROP POLICY IF EXISTS "social_posts_update_own" ON public.social_media_posts;
    DROP POLICY IF EXISTS "social_posts_delete_own" ON public.social_media_posts;

    -- 基于 account_id 的 SELECT 策略
    PERFORM create_social_policy(
      'social_media_posts',
      'smp_select_via_account',
      'SELECT',
      'account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text)'
    );

    -- 基于 account_id 的 INSERT 策略
    PERFORM create_social_policy(
      'social_media_posts',
      'smp_insert_via_account',
      'INSERT',
      NULL,
      'account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text)'
    );

    -- 基于 account_id 的 UPDATE 策略
    PERFORM create_social_policy(
      'social_media_posts',
      'smp_update_via_account',
      'UPDATE',
      'account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text)'
    );

    -- 基于 account_id 的 DELETE 策略
    PERFORM create_social_policy(
      'social_media_posts',
      'smp_delete_via_account',
      'DELETE',
      'account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text)'
    );

    RAISE NOTICE 'social_media_posts RLS 策略已创建（通过 account_id → social_accounts → user_id）';
  ELSE
    RAISE WARNING 'social_media_posts 表不存在，跳过 RLS 设置';
  END IF;
END $$;

-- ============================================================
-- 17. social_post_platforms (通过 post_id → social_media_posts → account_id → social_accounts → user_id)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_post_platforms') THEN
    
    -- 启用 RLS
    ALTER TABLE public.social_post_platforms ENABLE ROW LEVEL SECURITY;

    -- 删除旧的策略（如果存在）
    DROP POLICY IF EXISTS "Users can view own post platforms" ON public.social_post_platforms;
    DROP POLICY IF EXISTS "Users can insert own post platforms" ON public.social_post_platforms;
    DROP POLICY IF EXISTS "Users can update own post platforms" ON public.social_post_platforms;
    DROP POLICY IF EXISTS "Users can delete own post platforms" ON public.social_post_platforms;

    -- SELECT：通过 post_id → social_media_posts → account_id → social_accounts → user_id
    PERFORM create_social_policy(
      'social_post_platforms',
      'spp_select_via_account_chain',
      'SELECT',
      'post_id IN (SELECT id FROM public.social_media_posts WHERE account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text))'
    );

    -- INSERT：关联的 social_media_posts 须属于当前用户
    PERFORM create_social_policy(
      'social_post_platforms',
      'spp_insert_via_account_chain',
      'INSERT',
      NULL,
      'post_id IN (SELECT id FROM public.social_media_posts WHERE account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text))'
    );

    -- UPDATE
    PERFORM create_social_policy(
      'social_post_platforms',
      'spp_update_via_account_chain',
      'UPDATE',
      'post_id IN (SELECT id FROM public.social_media_posts WHERE account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text))'
    );

    -- DELETE
    PERFORM create_social_policy(
      'social_post_platforms',
      'spp_delete_via_account_chain',
      'DELETE',
      'post_id IN (SELECT id FROM public.social_media_posts WHERE account_id IN (SELECT id FROM public.social_accounts WHERE user_id = auth.uid()::text))'
    );

    RAISE NOTICE 'social_post_platforms RLS 策略已创建（通过 post_id → social_media_posts → account_id → social_accounts → user_id）';
  ELSE
    RAISE WARNING 'social_post_platforms 表不存在，跳过 RLS 设置';
  END IF;
END $$;

-- 清理辅助函数
DROP FUNCTION IF EXISTS create_social_policy;
