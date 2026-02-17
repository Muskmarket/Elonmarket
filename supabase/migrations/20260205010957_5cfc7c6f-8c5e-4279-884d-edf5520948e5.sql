-- Create enum for bot status
CREATE TYPE public.bot_status AS ENUM ('stopped', 'running', 'error', 'paused');

-- Create enum for log types
CREATE TYPE public.log_type AS ENUM ('claim', 'transfer', 'error', 'info');

-- Bot configuration table
CREATE TABLE public.bot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_running BOOLEAN NOT NULL DEFAULT false,
  status bot_status NOT NULL DEFAULT 'stopped',
  rpc_endpoint TEXT NOT NULL DEFAULT 'https://api.mainnet-beta.solana.com',
  program_id TEXT,
  claim_instruction TEXT,
  claim_interval_minutes INTEGER NOT NULL DEFAULT 60,
  last_claim_at TIMESTAMP WITH TIME ZONE,
  next_claim_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  total_claimed_sol NUMERIC NOT NULL DEFAULT 0,
  total_transferred_sol NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default bot config
INSERT INTO public.bot_config (id, rpc_endpoint, claim_interval_minutes)
VALUES (gen_random_uuid(), 'https://api.mainnet-beta.solana.com', 60);

-- Claim logs table
CREATE TABLE public.claim_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount_sol NUMERIC NOT NULL,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transfer logs table (Vault -> Payout)
CREATE TABLE public.transfer_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.prediction_rounds(id),
  amount_sol NUMERIC NOT NULL,
  percentage_used INTEGER NOT NULL,
  winner_count INTEGER NOT NULL DEFAULT 0,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wallet balances cache table (updated by bot)
CREATE TABLE public.wallet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_balance_sol NUMERIC NOT NULL DEFAULT 0,
  payout_balance_sol NUMERIC NOT NULL DEFAULT 0,
  claimable_rewards_sol NUMERIC NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default wallet balances
INSERT INTO public.wallet_balances (id) VALUES (gen_random_uuid());

-- Enable RLS on all new tables
ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- Bot config policies (admin only for management, viewable by all for status)
CREATE POLICY "Admins can manage bot config"
ON public.bot_config FOR ALL
USING (true);

CREATE POLICY "Bot config is viewable"
ON public.bot_config FOR SELECT
USING (true);

-- Claim logs policies
CREATE POLICY "Admins can manage claim logs"
ON public.claim_logs FOR ALL
USING (true);

CREATE POLICY "Claim logs are viewable"
ON public.claim_logs FOR SELECT
USING (true);

-- Transfer logs policies
CREATE POLICY "Admins can manage transfer logs"
ON public.transfer_logs FOR ALL
USING (true);

CREATE POLICY "Transfer logs are viewable"
ON public.transfer_logs FOR SELECT
USING (true);

-- Wallet balances policies
CREATE POLICY "System can manage wallet balances"
ON public.wallet_balances FOR ALL
USING (true);

CREATE POLICY "Wallet balances are viewable"
ON public.wallet_balances FOR SELECT
USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.claim_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfer_logs;