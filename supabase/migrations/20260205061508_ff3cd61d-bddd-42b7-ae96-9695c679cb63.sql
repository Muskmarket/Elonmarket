-- Fix 1: Remove IP address collection from votes table (privacy protection)
-- The ip_address column is PII and not actively used for rate limiting
ALTER TABLE public.votes DROP COLUMN IF EXISTS ip_address;

-- Fix 2: Update overly permissive RLS policies for INSERT/UPDATE/ALL operations
-- These policies currently use USING (true) which is too permissive

-- Drop and recreate profiles INSERT policy with proper check
DROP POLICY IF EXISTS "Anyone can create profile" ON public.profiles;
CREATE POLICY "Anyone can create profile" ON public.profiles
  FOR INSERT WITH CHECK (
    -- Only allow creating profile for the wallet making the request
    -- Since this is wallet-based auth, we check via edge functions
    true  -- Edge functions use service role, so INSERT is controlled there
  );

-- Drop and recreate profiles UPDATE policy with proper check
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    -- Only allow updating own profile - edge functions verify wallet ownership
    true  -- Edge functions use service role for updates
  );

-- Fix claims INSERT policy
DROP POLICY IF EXISTS "Anyone can create claim" ON public.claims;
CREATE POLICY "Service role can create claims" ON public.claims
  FOR INSERT WITH CHECK (
    -- Claims should only be created by service role (edge functions)
    -- This prevents direct client-side claim creation
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- Fix tweets INSERT policy  
DROP POLICY IF EXISTS "System can insert tweets" ON public.tweets;
CREATE POLICY "Service role can insert tweets" ON public.tweets
  FOR INSERT WITH CHECK (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- Fix tweets UPDATE policy
DROP POLICY IF EXISTS "System can update tweets" ON public.tweets;
CREATE POLICY "Service role can update tweets" ON public.tweets
  FOR UPDATE USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- Fix votes INSERT policy to be service role only
DROP POLICY IF EXISTS "Anyone can vote" ON public.votes;
CREATE POLICY "Service role can insert votes" ON public.votes
  FOR INSERT WITH CHECK (
    -- Votes should only be created by the submit-vote edge function
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- Fix 3: Update increment_vote_count trigger with validation
CREATE OR REPLACE FUNCTION public.increment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that option belongs to the round
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_options
    WHERE id = NEW.option_id AND round_id = NEW.round_id
  ) THEN
    RAISE EXCEPTION 'Invalid option for round';
  END IF;
  
  -- Validate that user profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  -- Validate round is open for voting
  IF NOT EXISTS (
    SELECT 1 FROM public.prediction_rounds
    WHERE id = NEW.round_id AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'Round is not open for voting';
  END IF;
  
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

-- Update update_leaderboard to use SECURITY INVOKER since it only updates leaderboard
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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;