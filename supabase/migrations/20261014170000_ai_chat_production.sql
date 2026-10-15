-- Production AI / Match Coach: rate limits, persisted sessions, booking conflict guard

-- ─── AI usage + rate limits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  function_name text NOT NULL,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_fn_created_idx
  ON public.ai_usage_events (user_id, function_name, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_select_own" ON public.ai_usage_events;
CREATE POLICY "ai_usage_select_own"
  ON public.ai_usage_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

-- Service role inserts from edge functions; no client insert policy.

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_user_id uuid,
  p_function_name text,
  p_max_per_minute int DEFAULT 12,
  p_max_per_day int DEFAULT 120,
  p_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minute int;
  v_day int;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'missing_user');
  END IF;

  SELECT count(*)::int INTO v_minute
  FROM public.ai_usage_events
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND created_at > now() - interval '1 minute';

  IF v_minute >= p_max_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'per_minute',
      'retry_after_seconds', 60,
      'minute_count', v_minute,
      'day_count', NULL
    );
  END IF;

  SELECT count(*)::int INTO v_day
  FROM public.ai_usage_events
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND created_at > now() - interval '1 day';

  IF v_day >= p_max_per_day THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'per_day',
      'retry_after_seconds', 3600,
      'minute_count', v_minute,
      'day_count', v_day
    );
  END IF;

  INSERT INTO public.ai_usage_events (user_id, function_name, request_id)
  VALUES (p_user_id, p_function_name, p_request_id);

  RETURN jsonb_build_object(
    'allowed', true,
    'minute_count', v_minute + 1,
    'day_count', v_day + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_rate_limit(uuid, text, int, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid, text, int, int, text) TO service_role;

-- ─── Match Coach sessions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.support_chat_sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL DEFAULT '',
  has_image boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_chat_sessions_user_updated_idx
  ON public.support_chat_sessions (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS support_chat_messages_session_created_idx
  ON public.support_chat_messages (session_id, created_at);

ALTER TABLE public.support_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_sessions_own" ON public.support_chat_sessions;
CREATE POLICY "support_sessions_own"
  ON public.support_chat_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "support_messages_own" ON public.support_chat_messages;
CREATE POLICY "support_messages_own"
  ON public.support_chat_messages FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

-- ─── Booking double-book guard ────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS consultations_lawyer_slot_unique
  ON public.consultations (lawyer_id, scheduled_at)
  WHERE status IN ('scheduled', 'confirmed');
