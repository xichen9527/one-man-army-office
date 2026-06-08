-- ============================================================
-- ADD_MISSING_COLUMNS_V3.sql — 适配现有表结构智能补全
-- 查询确认：file_versions 已有 created_by（而非 uploaded_by）
-- customer_contacts 已有 title（而非 position）、已含 is_primary/updated_at
-- ============================================================

-- ============ login_sessions ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_sessions' AND column_name = 'login_time') THEN
    ALTER TABLE public.login_sessions ADD COLUMN login_time timestamptz NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_sessions' AND column_name = 'logout_time') THEN
    ALTER TABLE public.login_sessions ADD COLUMN logout_time timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_sessions' AND column_name = 'session_token') THEN
    ALTER TABLE public.login_sessions ADD COLUMN session_token text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_sessions' AND column_name = 'is_active') THEN
    ALTER TABLE public.login_sessions ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_sessions_select_own" ON public.login_sessions;
CREATE POLICY "login_sessions_select_own" ON public.login_sessions FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "login_sessions_insert_own" ON public.login_sessions;
CREATE POLICY "login_sessions_insert_own" ON public.login_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);

GRANT ALL ON public.login_sessions TO authenticated;
GRANT SELECT, INSERT ON public.login_sessions TO anon;

-- ============ file_versions ============
DO $$
BEGIN
  -- 添加变化的列（mime_type 不存在则加）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_versions' AND column_name = 'mime_type') THEN
    ALTER TABLE public.file_versions ADD COLUMN mime_type text;
  END IF;
END $$;

ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "file_versions_select_own" ON public.file_versions;
CREATE POLICY "file_versions_select_own" ON public.file_versions FOR SELECT USING (auth.uid()::text IN (SELECT created_by FROM public.files WHERE id = file_id));
DROP POLICY IF EXISTS "file_versions_insert_own" ON public.file_versions;
CREATE POLICY "file_versions_insert_own" ON public.file_versions FOR INSERT WITH CHECK (auth.uid()::text = created_by);
DROP POLICY IF EXISTS "file_versions_delete_own" ON public.file_versions;
CREATE POLICY "file_versions_delete_own" ON public.file_versions FOR DELETE USING (auth.uid()::text = created_by);

GRANT ALL ON public.file_versions TO authenticated;

-- ============ customer_contacts ============
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_contacts_select_own" ON public.customer_contacts;
CREATE POLICY "customer_contacts_select_own" ON public.customer_contacts FOR SELECT USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
DROP POLICY IF EXISTS "customer_contacts_insert_own" ON public.customer_contacts;
CREATE POLICY "customer_contacts_insert_own" ON public.customer_contacts FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
DROP POLICY IF EXISTS "customer_contacts_update_own" ON public.customer_contacts;
CREATE POLICY "customer_contacts_update_own" ON public.customer_contacts FOR UPDATE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
DROP POLICY IF EXISTS "customer_contacts_delete_own" ON public.customer_contacts;
CREATE POLICY "customer_contacts_delete_own" ON public.customer_contacts FOR DELETE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));

GRANT ALL ON public.customer_contacts TO authenticated;

-- ============ 验证 ============
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('login_sessions', 'file_versions', 'customer_contacts')
ORDER BY tablename;