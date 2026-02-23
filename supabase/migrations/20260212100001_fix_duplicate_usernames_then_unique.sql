-- Step 1: Fix existing duplicate usernames (case-insensitive).
-- Keep the first profile per username (earliest created_at); make others unique by appending _<short_id>.

WITH duplicates AS (
  SELECT id, display_name,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(display_name)) ORDER BY created_at, id) AS rn
  FROM public.profiles
  WHERE display_name IS NOT NULL AND TRIM(display_name) != ''
),
to_update AS (
  SELECT id, display_name, rn
  FROM duplicates
  WHERE rn > 1
)
UPDATE public.profiles p
SET display_name = t.display_name || '_' || REPLACE(LEFT(p.id::text, 8), '-', '')
FROM to_update t
WHERE p.id = t.id;

-- Step 2: Now create the unique index (no more duplicates).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_lower_key
  ON public.profiles (LOWER(display_name))
  WHERE display_name IS NOT NULL AND display_name != '';

-- Step 3: Helper for auth-register.
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
