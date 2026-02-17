
-- Add prediction time frame and vote locking to prediction_rounds
ALTER TABLE public.prediction_rounds 
ADD COLUMN IF NOT EXISTS prediction_start_time timestamptz,
ADD COLUMN IF NOT EXISTS vote_lock_minutes integer DEFAULT 60;

-- Add unclaimed rewards accumulation to profiles (SOL amount across rounds)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unclaimed_rewards_sol numeric DEFAULT 0;
