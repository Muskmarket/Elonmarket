-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.round_status AS ENUM ('upcoming', 'open', 'finalizing', 'finalized', 'paid', 'no_winner');
CREATE TYPE public.claim_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  total_wins INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  total_claimed_usd NUMERIC(20, 6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User roles table (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Platform configuration (admin settings)
CREATE TABLE public.platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES public.profiles(id)
);

-- Wallet configuration (admin settings for wallets)
CREATE TABLE public.wallet_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_wallet_address TEXT NOT NULL,
  payout_wallet_address TEXT NOT NULL,
  token_contract_address TEXT NOT NULL,
  min_token_balance NUMERIC(20, 6) DEFAULT 1,
  payout_percentage INTEGER DEFAULT 15 CHECK (payout_percentage >= 10 AND payout_percentage <= 20),
  twitter_user_id TEXT DEFAULT '44196397', -- Elon's Twitter ID
  twitter_username TEXT DEFAULT 'elonmusk',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Prediction rounds
CREATE TABLE public.prediction_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INTEGER NOT NULL,
  question TEXT NOT NULL DEFAULT 'What will Elon tweet about first?',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status round_status DEFAULT 'upcoming' NOT NULL,
  winning_option_id UUID,
  winning_tweet_id TEXT,
  winning_tweet_text TEXT,
  vault_balance_snapshot NUMERIC(20, 6),
  payout_amount NUMERIC(20, 6),
  payout_per_winner NUMERIC(20, 6),
  total_winners INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  refill_completed BOOLEAN DEFAULT FALSE,
  accumulated_from_previous NUMERIC(20, 6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  finalized_at TIMESTAMP WITH TIME ZONE
);

-- Prediction options for each round
CREATE TABLE public.prediction_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.prediction_rounds(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  vote_count INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#00FF88',
  icon TEXT DEFAULT 'zap',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Votes (one per user per round)
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.prediction_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.prediction_options(id) ON DELETE CASCADE NOT NULL,
  wallet_address TEXT NOT NULL,
  token_balance_at_vote NUMERIC(20, 6) NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (round_id, user_id)
);

-- Claims for winners
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.prediction_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  wallet_address TEXT NOT NULL,
  amount NUMERIC(20, 6) NOT NULL,
  status claim_status DEFAULT 'pending' NOT NULL,
  tx_signature TEXT,
  signed_message TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (round_id, user_id)
);

-- Live tweets cache
CREATE TABLE public.tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT UNIQUE NOT NULL,
  text TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_username TEXT NOT NULL,
  tweet_type TEXT NOT NULL CHECK (tweet_type IN ('post', 'quote')),
  quoted_tweet_id TEXT,
  quoted_tweet_text TEXT,
  matched_option_id UUID REFERENCES public.prediction_options(id),
  matched_keywords TEXT[],
  created_at_twitter TIMESTAMP WITH TIME ZONE NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Recent winners display
CREATE TABLE public.recent_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.prediction_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  wallet_address TEXT NOT NULL,
  amount NUMERIC(20, 6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Leaderboard view
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  display_name TEXT,
  total_wins INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  win_rate NUMERIC(5, 2) DEFAULT 0,
  total_claimed_usd NUMERIC(20, 6) DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Total payout tracking
CREATE TABLE public.payout_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_paid_usd NUMERIC(20, 6) DEFAULT 0,
  total_predictions_made INTEGER DEFAULT 0,
  total_rounds_completed INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_stats ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user by wallet
CREATE OR REPLACE FUNCTION public.get_user_by_wallet(_wallet TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE wallet_address = _wallet LIMIT 1
$$;

-- Function to check if user is admin by wallet
CREATE OR REPLACE FUNCTION public.is_admin_wallet(_wallet TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.wallet_address = _wallet
      AND ur.role = 'admin'
  )
$$;

-- RLS Policies

-- Profiles: public read, self update
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can create profile" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- User roles: admins can manage
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (true);

-- Platform config: public read, admin write
CREATE POLICY "Config is viewable by everyone" ON public.platform_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage config" ON public.platform_config
  FOR ALL USING (true);

-- Wallet config: public read (only addresses), admin write
CREATE POLICY "Wallet config is viewable" ON public.wallet_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage wallet config" ON public.wallet_config
  FOR ALL USING (true);

-- Prediction rounds: public read
CREATE POLICY "Rounds are viewable by everyone" ON public.prediction_rounds
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage rounds" ON public.prediction_rounds
  FOR ALL USING (true);

-- Prediction options: public read
CREATE POLICY "Options are viewable by everyone" ON public.prediction_options
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage options" ON public.prediction_options
  FOR ALL USING (true);

-- Votes: public read counts, insert own
CREATE POLICY "Votes are viewable" ON public.votes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can vote" ON public.votes
  FOR INSERT WITH CHECK (true);

-- Claims: users see own, admins see all
CREATE POLICY "Claims are viewable" ON public.claims
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create claim" ON public.claims
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update claims" ON public.claims
  FOR UPDATE USING (true);

-- Tweets: public read
CREATE POLICY "Tweets are viewable by everyone" ON public.tweets
  FOR SELECT USING (true);

CREATE POLICY "System can insert tweets" ON public.tweets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update tweets" ON public.tweets
  FOR UPDATE USING (true);

-- Recent winners: public read
CREATE POLICY "Winners are viewable by everyone" ON public.recent_winners
  FOR SELECT USING (true);

CREATE POLICY "System can manage winners" ON public.recent_winners
  FOR ALL USING (true);

-- Leaderboard: public read
CREATE POLICY "Leaderboard is viewable by everyone" ON public.leaderboard
  FOR SELECT USING (true);

CREATE POLICY "System can manage leaderboard" ON public.leaderboard
  FOR ALL USING (true);

-- Payout stats: public read
CREATE POLICY "Stats are viewable by everyone" ON public.payout_stats
  FOR SELECT USING (true);

CREATE POLICY "System can manage stats" ON public.payout_stats
  FOR ALL USING (true);

-- Function to increment vote count
CREATE OR REPLACE FUNCTION public.increment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.prediction_options
  SET vote_count = vote_count + 1
  WHERE id = NEW.option_id;
  
  UPDATE public.prediction_rounds
  SET total_votes = total_votes + 1
  WHERE id = NEW.round_id;
  
  UPDATE public.profiles
  SET total_predictions = total_predictions + 1
  WHERE id = NEW.user_id;
  
  UPDATE public.payout_stats
  SET total_predictions_made = total_predictions_made + 1
  WHERE id = (SELECT id FROM public.payout_stats LIMIT 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_vote_inserted
AFTER INSERT ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.increment_vote_count();

-- Function to update leaderboard
CREATE OR REPLACE FUNCTION public.update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.leaderboard (user_id, wallet_address, display_name, total_wins, total_predictions, win_rate, total_claimed_usd)
  SELECT 
    p.id,
    p.wallet_address,
    p.display_name,
    p.total_wins,
    p.total_predictions,
    CASE WHEN p.total_predictions > 0 THEN (p.total_wins::NUMERIC / p.total_predictions * 100) ELSE 0 END,
    p.total_claimed_usd
  FROM public.profiles p
  WHERE p.id = NEW.id
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    total_wins = EXCLUDED.total_wins,
    total_predictions = EXCLUDED.total_predictions,
    win_rate = EXCLUDED.win_rate,
    total_claimed_usd = EXCLUDED.total_claimed_usd,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_updated
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_leaderboard();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prediction_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prediction_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tweets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recent_winners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_stats;

-- Insert default wallet config
INSERT INTO public.wallet_config (vault_wallet_address, payout_wallet_address, token_contract_address, payout_percentage)
VALUES ('', '', '', 15);

-- Insert default payout stats
INSERT INTO public.payout_stats (total_paid_usd, total_predictions_made, total_rounds_completed)
VALUES (0, 0, 0);

-- Insert default platform config
INSERT INTO public.platform_config (key, value, description) VALUES
('platform_name', '"MuskMarket"', 'Platform display name'),
('platform_tagline', '"Predict what Elon tweets next. Win rewards."', 'Platform tagline'),
('prediction_question', '"What will Elon tweet about first?"', 'Default prediction question'),
('round_duration_hours', '24', 'Duration of each round in hours'),
('ai_matching_enabled', 'true', 'Use AI for tweet matching'),
('ai_similarity_threshold', '0.8', 'AI similarity threshold for matching');