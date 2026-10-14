-- Chicago-only launch market + lawyer account linking + listing ownership

-- 1) Ensure Chicago exists, re-point lawyers, then drop other cities
INSERT INTO public.cities (name, slug, state)
VALUES ('Chicago', 'chicago', 'IL')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, state = EXCLUDED.state;

UPDATE public.lawyers
SET
  city = 'Chicago',
  state = 'IL',
  city_id = (SELECT id FROM public.cities WHERE slug = 'chicago' LIMIT 1);

UPDATE public.profiles
SET city = 'Chicago'
WHERE city IS NULL OR lower(trim(city)) <> 'chicago';

-- Clear FKs from non-Chicago cities, then delete them
UPDATE public.lawyers
SET city_id = (SELECT id FROM public.cities WHERE slug = 'chicago' LIMIT 1)
WHERE city_id IS DISTINCT FROM (SELECT id FROM public.cities WHERE slug = 'chicago' LIMIT 1);

DELETE FROM public.cities WHERE slug <> 'chicago';

-- 2) Link lawyers table to auth users
ALTER TABLE public.lawyers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lawyers_user_id_uidx
  ON public.lawyers (user_id)
  WHERE user_id IS NOT NULL;

-- 3) On signup as lawyer, create a linked lawyers directory row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested_role text;
  safe_role public.app_role;
  display_name text;
  chicago_id uuid;
BEGIN
  requested_role := lower(coalesce(NEW.raw_user_meta_data ->> 'role', 'client'));
  IF requested_role IN ('client', 'lawyer') THEN
    safe_role := requested_role::public.app_role;
  ELSE
    safe_role := 'client';
  END IF;

  display_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1),
    'Lawyer'
  );

  SELECT id INTO chicago_id FROM public.cities WHERE slug = 'chicago' LIMIT 1;

  INSERT INTO public.profiles (user_id, full_name, avatar_url, profile_photo, email, role, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', NULL),
    NEW.email,
    safe_role,
    'Chicago'
  );

  IF safe_role = 'lawyer' THEN
    INSERT INTO public.lawyers (
      user_id, name, firm, city, state, city_id, practice_areas, avatar_initials,
      verified, availability_status, short_description
    )
    VALUES (
      NEW.id,
      display_name,
      coalesce(NEW.raw_user_meta_data ->> 'firm', display_name || ' Law'),
      'Chicago',
      'IL',
      chicago_id,
      ARRAY[]::text[],
      upper(left(regexp_replace(display_name, '[^A-Za-z]', '', 'g') || 'XX', 2)),
      false,
      'available',
      'Chicago attorney on Legalhubly'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Lawyers: public read; owners can update their own row
DROP POLICY IF EXISTS "Anyone can read lawyers" ON public.lawyers;
CREATE POLICY "Anyone can read lawyers" ON public.lawyers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lawyer update own listing" ON public.lawyers;
CREATE POLICY "Lawyer update own listing" ON public.lawyers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
