-- Fix remaining RLS policies that use USING (true) for ALL/UPDATE operations
-- These are "system" or "admin" policies that should only be used by service role

-- Fix leaderboard ALL policy
DROP POLICY IF EXISTS "System can manage leaderboard" ON public.leaderboard;
CREATE POLICY "Service role can manage leaderboard" ON public.leaderboard
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- Fix payout_stats ALL policy
DROP POLICY IF EXISTS "System can manage stats" ON public.payout_stats;
CREATE POLICY "Service role can manage stats" ON public.payout_stats
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- Fix recent_winners ALL policy
DROP POLICY IF EXISTS "System can manage winners" ON public.recent_winners;
CREATE POLICY "Service role can manage winners" ON public.recent_winners
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- Fix wallet_balances ALL policy
DROP POLICY IF EXISTS "System can manage wallet balances" ON public.wallet_balances;
CREATE POLICY "Service role can manage wallet balances" ON public.wallet_balances
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- Fix admin-managed tables to use is_admin_wallet check or service role

-- prediction_rounds - admin or service role
DROP POLICY IF EXISTS "Admins can manage rounds" ON public.prediction_rounds;
CREATE POLICY "Admins can manage rounds" ON public.prediction_rounds
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- prediction_options - admin or service role  
DROP POLICY IF EXISTS "Admins can manage options" ON public.prediction_options;
CREATE POLICY "Admins can manage options" ON public.prediction_options
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- platform_config - admin or service role
DROP POLICY IF EXISTS "Admins can manage config" ON public.platform_config;
CREATE POLICY "Admins can manage config" ON public.platform_config
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- wallet_config - admin or service role
DROP POLICY IF EXISTS "Admins can manage wallet config" ON public.wallet_config;
CREATE POLICY "Admins can manage wallet config" ON public.wallet_config
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- user_roles - admin or service role
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- bot_config - admin or service role
DROP POLICY IF EXISTS "Admins can manage bot config" ON public.bot_config;
CREATE POLICY "Admins can manage bot config" ON public.bot_config
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- claim_logs - admin or service role
DROP POLICY IF EXISTS "Admins can manage claim logs" ON public.claim_logs;
CREATE POLICY "Admins can manage claim logs" ON public.claim_logs
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- transfer_logs - admin or service role
DROP POLICY IF EXISTS "Admins can manage transfer logs" ON public.transfer_logs;
CREATE POLICY "Admins can manage transfer logs" ON public.transfer_logs
  FOR ALL USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- claims UPDATE - admin or service role
DROP POLICY IF EXISTS "Admins can update claims" ON public.claims;
CREATE POLICY "Service role can update claims" ON public.claims
  FOR UPDATE USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );