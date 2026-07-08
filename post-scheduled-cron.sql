-- ============================================================
-- 定时发布 SQL：创建 pg_cron job，每分钟调用 post-scheduled Edge Function
-- ============================================================
-- 使用说明：
--   1. 在 Supabase Dashboard → Database → SQL Editor 中执行本脚本
--   2. 或通过 supabase CLI: supabase db push
--   3. 验证 job 是否创建成功：
--      SELECT * FROM cron.job WHERE jobname = 'post-scheduled-cron';
--   4. 查看最近执行记录：
--      SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--   5. 删除 job（不再需要时）：
--      SELECT cron.unschedule('post-scheduled-cron');
-- ============================================================

-- ── 确保 pg_cron 扩展已启用 ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 安全：限制 cron job 使用 service_role 只能在 postgres schema 操作 ──
GRANT USAGE ON SCHEMA cron TO postgres, supabase_admin;
GRANT ALL ON TABLE cron.job TO postgres, supabase_admin;
GRANT ALL ON TABLE cron.job_run_details TO postgres, supabase_admin;

-- ── 清理旧的同名 job（幂等操作）──────────────────────────────────────
SELECT cron.unschedule('post-scheduled-cron');

-- ── 创建 cron job：每分钟调用一次 post-scheduled Edge Function ───────
--
-- Supabase Edge Function 通过 pg_net 扩展发起 HTTP 请求。
-- 如果 pg_net 不可用，可改用 webhook 触发（Supabase Dashboard → Edge Functions → Settings → Cron）
--
SELECT cron.schedule(
  'post-scheduled-cron',           -- job 名称（唯一标识）
  '* * * * *',                     -- cron 表达式：每分钟执行
  $$
    SELECT net.http_post(
      url     => 'https://' || current_setting('app.settings.external_url') || '/functions/v1/post-scheduled',
      headers => '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.supabase_service_role_key') || '"}',
      body    => '{"source":"cron"}'
    );
  $$
);

-- ── 备选方案：如果 pg_net 不可用，改用 Supabase Webhook（推荐）──────
-- 在 Supabase Dashboard → Database → Webhooks 中配置：
--   Table: social_media_posts
--   Events: Update
--   Webhook URL: https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/post-scheduled
--   Filter: status = 'scheduled' AND scheduled_at <= now()
--
-- ── 备选方案二：通过 Vault 存储 service_role key（更安全）────────────
-- CREATE OR REPLACE FUNCTION call_post_scheduled()
-- RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
-- DECLARE
--   service_key text;
-- BEGIN
--   SELECT decrypted_secret INTO service_key
--   FROM vault.decrypted_secrets
--   WHERE name = 'supabase_service_role_key';
--
--   PERFORM net.http_post(
--     url      => 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/post-scheduled',
--     headers  => jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || coalesce(service_key, '')
--     ),
--     body     => '{"source":"cron"}'
--   );
-- END;
-- $$;

-- ── 验证：检查 job 是否创建成功 ─────────────────────────────────────
SELECT
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'post-scheduled-cron';

-- ── 调试：查看最近执行记录（如果有 cron.job_run_details 权限）────────
-- SELECT
--   jobid,
--   runid,
--   job_pid,
--   status,
--   start_time,
--   end_time,
--   return_message
-- FROM cron.job_run_details
-- ORDER BY start_time DESC
-- LIMIT 10;
