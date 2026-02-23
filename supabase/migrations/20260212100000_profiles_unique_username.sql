-- Enforce one account per username (case-insensitive) and one per wallet.
-- wallet_address is already UNIQUE; add unique index on lower(display_name) so
-- "Test" and "test" cannot both exist.

CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_lower_key
  ON public.profiles (LOWER(display_name))
  WHERE display_name IS NOT NULL AND display_name != '';

-- Helper for auth-register: check if a username is already taken (case-insensitive)
CREATE OR REPLACE FUNCTION public.profile_username_exists(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE display_name IS NOT NULL AND TRIM(display_name) != '' AND LOWER(TRIM(display_name)) = LOWER(TRIM(_username))
  );
$$;
