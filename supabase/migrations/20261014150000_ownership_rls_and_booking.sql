-- P0: ownership columns + RLS; signup role helper for OAuth

-- ─── Columns ───────────────────────────────────────────────────────────────
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_client_user
  ON public.consultations (client_user_id);

CREATE INDEX IF NOT EXISTS idx_consultations_lawyer
  ON public.consultations (lawyer_id);

ALTER TABLE public.matters
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_matters_client_user ON public.matters (client_user_id);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── Helpers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'platform_admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.my_lawyer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.lawyers WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- Allow one-time lawyer role claim shortly after OAuth signup
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('legalhubly.bypass_profile_protect', true) = 'on' THEN
    RETURN NEW;
  END IF;
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

CREATE OR REPLACE FUNCTION public.apply_signup_role(requested text)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  safe_role public.app_role;
  current_role public.app_role;
  created timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF lower(requested) = 'lawyer' THEN
    safe_role := 'lawyer';
  ELSE
    safe_role := 'client';
  END IF;

  SELECT role, created_at INTO current_role, created
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Only upgrade client → lawyer within 1 hour of account creation
  IF safe_role = 'lawyer'
     AND current_role = 'client'
     AND created > now() - interval '1 hour' THEN
    PERFORM set_config('legalhubly.bypass_profile_protect', 'on', true);
    UPDATE public.profiles SET role = 'lawyer' WHERE user_id = auth.uid();
    RETURN 'lawyer';
  END IF;

  RETURN current_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_signup_role(text) TO authenticated;

-- ─── Drop open policies ────────────────────────────────────────────────────
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
        'lawyer_subscriptions', 'intake_cases',
        'conversations', 'conversation_participants', 'messages',
        'lawyers'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ─── Consultations ─────────────────────────────────────────────────────────
CREATE POLICY "consultations_select_own"
  ON public.consultations FOR SELECT TO authenticated
  USING (
    client_user_id = auth.uid()
    OR lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "consultations_insert_client"
  ON public.consultations FOR INSERT TO authenticated
  WITH CHECK (client_user_id = auth.uid());

CREATE POLICY "consultations_update_parties"
  ON public.consultations FOR UPDATE TO authenticated
  USING (
    client_user_id = auth.uid()
    OR lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
  );

-- ─── Matters ───────────────────────────────────────────────────────────────
CREATE POLICY "matters_select_own"
  ON public.matters FOR SELECT TO authenticated
  USING (
    client_user_id = auth.uid()
    OR lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "matters_insert_authenticated"
  ON public.matters FOR INSERT TO authenticated
  WITH CHECK (
    client_user_id = auth.uid()
    OR lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "matters_update_own"
  ON public.matters FOR UPDATE TO authenticated
  USING (
    client_user_id = auth.uid()
    OR lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
  );

-- ─── Tasks / notes / time (via matter ownership) ────────────────────────────
CREATE POLICY "tasks_via_matter"
  ON public.tasks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
        AND (m.client_user_id = auth.uid() OR m.lawyer_id = public.my_lawyer_id() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
        AND (m.client_user_id = auth.uid() OR m.lawyer_id = public.my_lawyer_id() OR public.is_platform_admin())
    )
  );

CREATE POLICY "time_entries_via_matter"
  ON public.time_entries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
        AND (m.lawyer_id = public.my_lawyer_id() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
        AND (m.lawyer_id = public.my_lawyer_id() OR public.is_platform_admin())
    )
  );

CREATE POLICY "internal_notes_via_matter"
  ON public.internal_notes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
        AND (m.lawyer_id = public.my_lawyer_id() OR public.is_platform_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
        AND (m.lawyer_id = public.my_lawyer_id() OR public.is_platform_admin())
    )
  );

-- ─── Leads ─────────────────────────────────────────────────────────────────
CREATE POLICY "leads_select_own"
  ON public.leads FOR SELECT TO authenticated
  USING (
    client_user_id = auth.uid()
    OR lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "leads_insert"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    client_user_id = auth.uid()
    OR lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "leads_update"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    client_user_id = auth.uid()
    OR lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
  );

-- ─── Payments / invoices ───────────────────────────────────────────────────
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT TO authenticated
  USING (
    client_user_id = auth.uid()
    OR lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "payments_manage_lawyer"
  ON public.payments FOR ALL TO authenticated
  USING (lawyer_id = public.my_lawyer_id() OR public.is_platform_admin())
  WITH CHECK (lawyer_id = public.my_lawyer_id() OR public.is_platform_admin());

CREATE POLICY "invoices_select_own"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    lawyer_id = public.my_lawyer_id()
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id AND m.client_user_id = auth.uid()
    )
  );

CREATE POLICY "invoices_manage_lawyer"
  ON public.invoices FOR ALL TO authenticated
  USING (lawyer_id = public.my_lawyer_id() OR public.is_platform_admin())
  WITH CHECK (lawyer_id = public.my_lawyer_id() OR public.is_platform_admin());

-- ─── Subscriptions / intake ────────────────────────────────────────────────
CREATE POLICY "subscriptions_own_lawyer"
  ON public.lawyer_subscriptions FOR SELECT TO authenticated
  USING (lawyer_id = public.my_lawyer_id() OR public.is_platform_admin());

CREATE POLICY "subscriptions_insert_own"
  ON public.lawyer_subscriptions FOR INSERT TO authenticated
  WITH CHECK (lawyer_id = public.my_lawyer_id() OR public.is_platform_admin());

CREATE POLICY "subscriptions_update_own"
  ON public.lawyer_subscriptions FOR UPDATE TO authenticated
  USING (lawyer_id = public.my_lawyer_id() OR public.is_platform_admin());

CREATE POLICY "intake_insert_auth"
  ON public.intake_cases FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "intake_select_own_session"
  ON public.intake_cases FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "intake_update_auth"
  ON public.intake_cases FOR UPDATE TO authenticated
  USING (true);

-- ─── Conversations / messages ──────────────────────────────────────────────
CREATE POLICY "conversations_select_participant"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id) OR public.is_platform_admin());

CREATE POLICY "conversations_insert_auth"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "conversations_update_participant"
  ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(id) OR public.is_platform_admin());

CREATE POLICY "participants_select_own"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_conversation_participant(conversation_id) OR public.is_platform_admin());

-- Self first, then peer once you're already in the thread
CREATE POLICY "participants_insert_self_or_peer"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_conversation_participant(conversation_id)
    OR public.is_platform_admin()
  );

CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id) OR public.is_platform_admin());

CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND public.is_conversation_participant(conversation_id)
  );

-- ─── Lawyers: public read stays; owners can update listing ─────────────────
CREATE POLICY "lawyers_public_read"
  ON public.lawyers FOR SELECT
  USING (true);

CREATE POLICY "lawyers_update_own"
  ON public.lawyers FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "lawyers_insert_own"
  ON public.lawyers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());
