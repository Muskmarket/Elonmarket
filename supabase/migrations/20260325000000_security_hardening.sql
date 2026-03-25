-- ============================================================
-- SECURITY HARDENING MIGRATION - 2026-03-25
-- Fixes critical vulnerability: vault_api_key was publicly readable
-- ============================================================

-- PART 1: Lock down backup tables (had NO RLS - full read/write for anon)
ALTER TABLE public.backup_legacy_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_legacy_prediction_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_legacy_prediction_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_legacy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_legacy_recent_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_legacy_tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_legacy_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_legacy_votes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.backup_legacy_leaderboard FROM anon, authenticated;
REVOKE ALL ON public.backup_legacy_prediction_options FROM anon, authenticated;
REVOKE ALL ON public.backup_legacy_prediction_rounds FROM anon, authenticated;
REVOKE ALL ON public.backup_legacy_profiles FROM anon, authenticated;
REVOKE ALL ON public.backup_legacy_recent_winners FROM anon, authenticated;
REVOKE ALL ON public.backup_legacy_tweets FROM anon, authenticated;
REVOKE ALL ON public.backup_legacy_user_roles FROM anon, authenticated;
REVOKE ALL ON public.backup_legacy_votes FROM anon, authenticated;

-- PART 2: Revoke INSERT/UPDATE/DELETE/TRUNCATE from anon on ALL tables
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wallet_config FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_roles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.transfer_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.claim_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.claims FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.votes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.tweets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.prediction_rounds FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.prediction_options FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leaderboard FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.recent_winners FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.payout_stats FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wallet_balances FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.game_config FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.platform_config FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bot_config FROM anon, authenticated;

-- PART 3: CRITICAL FIX - Secure wallet_config (was exposing vault_api_key)
REVOKE SELECT ON public.wallet_config FROM anon, authenticated;
DROP POLICY IF EXISTS "Wallet config is viewable" ON public.wallet_config;

-- Remove sensitive columns entirely
ALTER TABLE public.wallet_config DROP COLUMN IF EXISTS vault_api_key;
ALTER TABLE public.wallet_config DROP COLUMN IF EXISTS vault_api_url;

-- Create safe view exposing only non-sensitive fields
CREATE OR REPLACE VIEW public.wallet_config_public AS
SELECT
    id, vault_wallet_address, token_contract_address,
    min_token_balance, payout_percentage, twitter_user_id, twitter_username
FROM public.wallet_config;

ALTER VIEW public.wallet_config_public SET (security_invoker = true);
GRANT SELECT (id, vault_wallet_address, token_contract_address, min_token_balance, payout_percentage, twitter_user_id, twitter_username)
ON public.wallet_config TO anon, authenticated;
GRANT SELECT ON public.wallet_config_public TO anon, authenticated;

CREATE POLICY "Public can read safe wallet config columns"
ON public.wallet_config FOR SELECT USING (true);

-- PART 4: Lock down sensitive tables from public read
REVOKE SELECT ON public.user_roles FROM anon, authenticated;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

REVOKE SELECT ON public.transfer_logs FROM anon, authenticated;
DROP POLICY IF EXISTS "Transfer logs are viewable" ON public.transfer_logs;

REVOKE SELECT ON public.claim_logs FROM anon, authenticated;
DROP POLICY IF EXISTS "Claim logs are viewable" ON public.claim_logs;

-- PART 5: Performance indexes for unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON public.claims(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_config_updated_by ON public.platform_config(updated_by);
CREATE INDEX IF NOT EXISTS idx_prediction_options_round_id ON public.prediction_options(round_id);
CREATE INDEX IF NOT EXISTS idx_votes_round_id ON public.votes(round_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_option_id ON public.votes(option_id);

-- PART 6: Security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    action text NOT NULL,
    actor text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages audit log" ON public.security_audit_log
    FOR ALL USING (current_setting('role', true) = 'service_role');
REVOKE ALL ON public.security_audit_log FROM anon, authenticated;
