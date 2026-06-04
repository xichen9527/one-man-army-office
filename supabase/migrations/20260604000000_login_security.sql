-- ============================================================
-- Login Security: account_locks & login_attempts
-- Date: 2026-06-04
-- Purpose: 5 failed logins (30min) → lock 30min
-- ============================================================

-- login_attempts: audit log for every login attempt
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_created
  ON public.login_attempts(user_identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created
  ON public.login_attempts(ip_address, created_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_attempts_insert_any" ON public.login_attempts;
CREATE POLICY "login_attempts_insert_any" ON public.login_attempts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "login_attempts_select_own" ON public.login_attempts;
CREATE POLICY "login_attempts_select_own" ON public.login_attempts FOR SELECT USING (true);

-- account_locks: locked accounts due to 5 failures within 30min
CREATE TABLE IF NOT EXISTS public.account_locks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  lock_type TEXT DEFAULT 'login_fail',
  is_active BOOLEAN NOT NULL DEFAULT true,
  locked_at TIMESTAMPTZ DEFAULT now(),
  locked_until TIMESTAMPTZ NOT NULL,
  unlock_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_locks_user_id
  ON public.account_locks(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_account_locks_identifier
  ON public.account_locks(user_identifier, is_active);
CREATE INDEX IF NOT EXISTS idx_account_locks_active
  ON public.account_locks(is_active, locked_until) WHERE is_active = true;

ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "account_locks_insert_any" ON public.account_locks;
CREATE POLICY "account_locks_insert_any" ON public.account_locks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "account_locks_select_any" ON public.account_locks;
CREATE POLICY "account_locks_select_any" ON public.account_locks FOR SELECT USING (true);
DROP POLICY IF EXISTS "account_locks_update_own" ON public.account_locks;
CREATE POLICY "account_locks_update_own" ON public.account_locks FOR UPDATE USING (true);