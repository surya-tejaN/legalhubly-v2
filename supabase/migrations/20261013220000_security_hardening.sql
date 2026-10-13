-- Security hardening: role allowlist, privileged column protection, auth-gated sensitive tables

-- 1) Signup: only client | lawyer from user metadata (never admin via client)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested_role text;
  safe_role public.app_role;
BEGIN
  requested_role := lower(coalesce(NEW.raw_user_meta_data ->> 'role', 'client'));
  IF requested_role IN ('client', 'lawyer') THEN
    safe_role := requested_role::public.app_role;
  ELSE
    safe_role := 'client';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, avatar_url, profile_photo, email, role, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', NULL),
    NEW.email,
    safe_role,
    COALESCE(NEW.raw_user_meta_data ->> 'city', NULL)
  );
  RETURN NEW;
END;
$$;

-- 2) Block self-escalation of role / stripe_customer_id
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Updating role is not allowed';
  END IF;
  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'Updating stripe_customer_id is not allowed';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Updating user_id is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileged ON public.profiles;
CREATE TRIGGER profiles_protect_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- 3) Sensitive tables: drop open policies; require authenticated users
-- (demo UI reads these while logged in; anon can no longer scrape PII)

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'matters', 'tasks', 'time_entries', 'internal_notes',
        'leads', 'consultations', 'payments', 'invoices',
        'lawyer_subscriptions', 'intake_cases'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "Authenticated read matters" ON public.matters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert matters" ON public.matters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update matters" ON public.matters FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated manage tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage time entries" ON public.time_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage internal notes" ON public.internal_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update leads" ON public.leads FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated manage consultations" ON public.consultations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read subscriptions" ON public.lawyer_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert subscriptions" ON public.lawyer_subscriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update subscriptions" ON public.lawyer_subscriptions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated create intake" ON public.intake_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated read intake" ON public.intake_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated update intake" ON public.intake_cases FOR UPDATE TO authenticated USING (true);

-- Reviews: public read OK; only signed-in users can create
DROP POLICY IF EXISTS "Anyone can create reviews" ON public.reviews;
CREATE POLICY "Authenticated create reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (true);

-- Conversations: only signed-in users can create
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
CREATE POLICY "Authenticated create conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (true);
