-- Security upgrade: close remaining open intake/reviews policies
-- Project: Legalhubly-owned Supabase only (ubljuduaxtdojaaggqpw)

-- ─── Intake cases: bind to authenticated owner ─────────────────────────────
ALTER TABLE public.intake_cases
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_intake_cases_user ON public.intake_cases (user_id);

DROP POLICY IF EXISTS "intake_insert_auth" ON public.intake_cases;
DROP POLICY IF EXISTS "intake_select_own_session" ON public.intake_cases;
DROP POLICY IF EXISTS "intake_update_auth" ON public.intake_cases;
DROP POLICY IF EXISTS "Authenticated create intake" ON public.intake_cases;
DROP POLICY IF EXISTS "Authenticated read intake" ON public.intake_cases;
DROP POLICY IF EXISTS "Authenticated update intake" ON public.intake_cases;
DROP POLICY IF EXISTS "Anyone can create intake cases" ON public.intake_cases;
DROP POLICY IF EXISTS "Anyone can read intake cases" ON public.intake_cases;
DROP POLICY IF EXISTS "Anyone can update intake cases" ON public.intake_cases;

CREATE POLICY "intake_insert_owner"
  ON public.intake_cases FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "intake_select_owner"
  ON public.intake_cases FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "intake_update_owner"
  ON public.intake_cases FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

-- ─── Reviews: require signed-in reviewer identity ──────────────────────────
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews (reviewer_user_id);

DROP POLICY IF EXISTS "Authenticated create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can create reviews" ON public.reviews;

CREATE POLICY "reviews_insert_authenticated_owner"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_user_id = auth.uid());

-- Public read of reviews stays (marketplace)

-- ─── Conversations: only authenticated users can open threads ──────────────
DROP POLICY IF EXISTS "conversations_insert_auth" ON public.conversations;
CREATE POLICY "conversations_insert_authenticated"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── Ensure RLS is on for core tables ──────────────────────────────────────
ALTER TABLE public.intake_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;
