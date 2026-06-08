-- ============================================================
-- ADD_MISSING_COLUMNS.sql — 给已存在的表添加缺失字段
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- ============ login_sessions — 添加缺失字段 ============
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

-- ============ file_versions ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_versions' AND table_schema = 'public') THEN
    EXECUTE '
    CREATE TABLE public.file_versions (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      file_id text NOT NULL,
      version_number integer NOT NULL DEFAULT 1,
      storage_path text NOT NULL,
      file_size bigint,
      mime_type text,
      uploaded_by text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      notes text
    );
    ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "file_versions_select_own" ON public.file_versions FOR SELECT USING (auth.uid()::text IN (SELECT uploaded_by FROM public.files WHERE id = file_id));
    CREATE POLICY "file_versions_insert_own" ON public.file_versions FOR INSERT WITH CHECK (auth.uid()::text = uploaded_by);
    CREATE POLICY "file_versions_delete_own" ON public.file_versions FOR DELETE USING (auth.uid()::text = uploaded_by);
    GRANT ALL ON public.file_versions TO authenticated;';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_versions' AND column_name = 'version_number') THEN
      ALTER TABLE public.file_versions ADD COLUMN version_number integer NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_versions' AND column_name = 'notes') THEN
      ALTER TABLE public.file_versions ADD COLUMN notes text;
    END IF;
    ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "file_versions_select_own" ON public.file_versions;
    CREATE POLICY "file_versions_select_own" ON public.file_versions FOR SELECT USING (auth.uid()::text IN (SELECT uploaded_by FROM public.files WHERE id = file_id));
    DROP POLICY IF EXISTS "file_versions_insert_own" ON public.file_versions;
    CREATE POLICY "file_versions_insert_own" ON public.file_versions FOR INSERT WITH CHECK (auth.uid()::text = uploaded_by);
  END IF;
END $$;

-- ============ customer_contacts ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_contacts' AND table_schema = 'public') THEN
    EXECUTE '
    CREATE TABLE public.customer_contacts (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      customer_id text NOT NULL,
      name text NOT NULL,
      email text,
      phone text,
      position text,
      is_primary boolean DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "customer_contacts_select_own" ON public.customer_contacts FOR SELECT USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
    CREATE POLICY "customer_contacts_insert_own" ON public.customer_contacts FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
    CREATE POLICY "customer_contacts_update_own" ON public.customer_contacts FOR UPDATE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
    CREATE POLICY "customer_contacts_delete_own" ON public.customer_contacts FOR DELETE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
    GRANT ALL ON public.customer_contacts TO authenticated;';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_contacts' AND column_name = 'is_primary') THEN
      ALTER TABLE public.customer_contacts ADD COLUMN is_primary boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_contacts' AND column_name = 'updated_at') THEN
      ALTER TABLE public.customer_contacts ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    END IF;
    ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "customer_contacts_select_own" ON public.customer_contacts;
    CREATE POLICY "customer_contacts_select_own" ON public.customer_contacts FOR SELECT USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
    DROP POLICY IF EXISTS "customer_contacts_insert_own" ON public.customer_contacts;
    CREATE POLICY "customer_contacts_insert_own" ON public.customer_contacts FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
    DROP POLICY IF EXISTS "customer_contacts_update_own" ON public.customer_contacts;
    CREATE POLICY "customer_contacts_update_own" ON public.customer_contacts FOR UPDATE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
    DROP POLICY IF EXISTS "customer_contacts_delete_own" ON public.customer_contacts;
    CREATE POLICY "customer_contacts_delete_own" ON public.customer_contacts FOR DELETE USING (auth.uid()::text IN (SELECT owner_id FROM public.customers WHERE id = customer_id));
  END IF;
END $$;

-- ============ 验证 ============
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('login_sessions', 'file_versions', 'customer_contacts')
ORDER BY table_name, ordinal_position;