-- ============================================================
-- AUDIT_RLS.sql — 全面 RLS 审计
-- 在 Supabase SQL Editor 中执行
--
-- 功能：
--   1. 列出所有 public 表的 RLS 状态和策略数量
--   2. 列出所有 profile 相关表的具体策略
--   3. 列出所有表的 RLS 策略明细（用于排查是否所有表都有合适的策略）
--   4. 提供修复建议
-- ============================================================

-- ============================================================
-- 1. 所有 public 表的 RLS 状态概览
-- ============================================================
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY rls_enabled, tablename;

-- ============================================================
-- 2. 所有 RLS 策略明细（展示完整策略列表）
-- ============================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- 3. 识别没有 RLS 策略的表
-- ============================================================
SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  CASE 
    WHEN t.rowsecurity = false THEN 'RLS 未启用'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t.tablename) THEN 'RLS 已启用但无策略'
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t.tablename) THEN '正常'
    ELSE '未知'
  END as rls_status
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
ORDER BY rls_status, t.tablename;

-- ============================================================
-- 4. 识别 RLS 未启用或缺少策略的表
-- ============================================================
SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND (t.rowsecurity = false OR p.policy_count IS NULL OR p.policy_count = 0)
ORDER BY t.tablename;

-- ============================================================
-- 5. 检查 profiles 表是否有 email_change 相关的列
-- ============================================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('email_change_pending', 'email_change_token', 'email_change_token_exp', 'email_change_count', 'last_email_change_at')
ORDER BY column_name;

-- ============================================================
-- 6. 检查已存在的索引
-- ============================================================
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
  AND indexname LIKE '%email%'
ORDER BY indexname;
