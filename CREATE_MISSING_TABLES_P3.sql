-- ============================================================
-- CREATE_MISSING_TABLES_P3.sql — 补充 3 张缺失表
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- ============ login_sessions（登录会话追踪） ============
CREATE TABLE IF NOT EXISTS public.login_sessions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id text NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address text,
    user_agent text,
    login_time timestamptz NOT NULL DEFAULT now(),
    logout_time timestamptz,
    session_token text,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON public.login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_is_active ON public.login_sessions(is_active);

ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_sessions_select_own" ON public.login_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "login_sessions_insert_own" ON public.login_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "login_sessions_update_own" ON public.login_sessions FOR UPDATE USING (auth.uid()::text = user_id);

GRANT ALL ON public.login_sessions TO authenticated;
GRANT SELECT, INSERT ON public.login_sessions TO anon;

-- ============ file_versions（文件版本历史） ============
CREATE TABLE IF NOT EXISTS public.file_versions (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    file_id text NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    version_number integer NOT NULL DEFAULT 1,
    storage_path text NOT NULL,
    file_size bigint,
    mime_type text,
    uploaded_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    notes text
);

CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON public.file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_version_number ON public.file_versions(file_id, version_number);

ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "file_versions_select_own" ON public.file_versions FOR SELECT USING (auth.uid()::text IN (SELECT uploaded_by FROM public.files WHERE id = file_id));
CREATE POLICY "file_versions_insert_own" ON public.file_versions FOR INSERT WITH CHECK (auth.uid()::text = uploaded_by);
CREATE POLICY "file_versions_delete_own" ON public.file_versions FOR DELETE USING (auth.uid()::text = uploaded_by);

GRANT ALL ON public.file_versions TO authenticated;

-- ============ customer_contacts（客户联系人） ============
CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    position text,
    is_primary boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_email ON public.customer_contacts(email) WHERE email IS NOT NULL;

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_contacts_select_own" ON public.customer_contacts FOR SELECT USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
CREATE POLICY "customer_contacts_insert_own" ON public.customer_contacts FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
CREATE POLICY "customer_contacts_update_own" ON public.customer_contacts FOR UPDATE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
CREATE POLICY "customer_contacts_delete_own" ON public.customer_contacts FOR DELETE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));

GRANT ALL ON public.customer_contacts TO authenticated;

-- ============ 验证 ============
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('login_sessions', 'file_versions', 'customer_contacts')
ORDER BY tablename;
