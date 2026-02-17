-- Fix the remaining 2 RLS policies on profiles table
-- These need service role check since profiles are managed via edge functions

-- Fix profiles INSERT policy
DROP POLICY IF EXISTS "Anyone can create profile" ON public.profiles;
CREATE POLICY "Service role can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    (SELECT current_setting('role', true)) = 'service_role'
  );

-- Fix profiles UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Service role can update profiles" ON public.profiles
  FOR UPDATE USING (
    (SELECT current_setting('role', true)) = 'service_role'
  );