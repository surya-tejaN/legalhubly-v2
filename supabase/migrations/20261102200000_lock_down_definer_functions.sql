-- Lock down SECURITY DEFINER functions that anon/authenticated could still execute.
-- REVOKE ... FROM PUBLIC does not remove Supabase's explicit default grants to anon/authenticated.

-- ─── Email queue: service_role only (edge functions) ─────────────────────────
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM anon, authenticated;

ALTER FUNCTION public.enqueue_email(TEXT, JSONB) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(TEXT, INT, INT) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(TEXT, BIGINT) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) SET search_path = public, pgmq;

-- ─── AI rate limiter: called only via service role in _shared/ai_guard.ts ────
REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid, text, integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid, text, integer, integer, text) TO service_role;

-- ─── Signed-in-only RPCs ─────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.apply_signup_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_signup_role(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.create_direct_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated, service_role;

-- ─── apply_signup_role: avoid reserved word "current_role", explicit enum casts ─
CREATE OR REPLACE FUNCTION public.apply_signup_role(requested text)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  safe_role public.app_role;
  existing_role public.app_role;
  created timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF lower(requested) = 'lawyer' THEN
    safe_role := 'lawyer'::public.app_role;
  ELSE
    safe_role := 'client'::public.app_role;
  END IF;

  SELECT p.role, p.created_at INTO existing_role, created
  FROM public.profiles p
  WHERE p.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Only upgrade client → lawyer within 1 hour of account creation
  IF safe_role = 'lawyer'::public.app_role
     AND existing_role = 'client'::public.app_role
     AND created > now() - interval '1 hour' THEN
    PERFORM set_config('legalhubly.bypass_profile_protect', 'on', true);
    UPDATE public.profiles SET role = 'lawyer'::public.app_role WHERE user_id = auth.uid();
    RETURN 'lawyer'::public.app_role;
  END IF;

  RETURN existing_role;
END;
$$;
