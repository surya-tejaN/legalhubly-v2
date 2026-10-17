-- Tighten conversation creation + intake storage; add safe DM RPC

-- ─── Direct conversation RPC (adds both participants server-side) ──────────
CREATE OR REPLACE FUNCTION public.create_direct_conversation(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_convo uuid;
  v_existing uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = v_me THEN
    RAISE EXCEPTION 'Invalid participant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = p_other_user_id
  ) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT cp1.conversation_id INTO v_existing
  FROM public.conversation_participants cp1
  INNER JOIN public.conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = v_me
    AND cp2.user_id = p_other_user_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO v_convo;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES
    (v_convo, v_me, 'member'),
    (v_convo, p_other_user_id, 'member');

  RETURN v_convo;
END;
$$;

REVOKE ALL ON FUNCTION public.create_direct_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated;

-- Participants: self-only (peer adds go through RPC / service role)
DROP POLICY IF EXISTS "participants_insert_self_or_peer" ON public.conversation_participants;
CREATE POLICY "participants_insert_self"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_platform_admin()
  );

-- Conversations: clients create via RPC (definer); block open insert
DROP POLICY IF EXISTS "conversations_insert_auth" ON public.conversations;
CREATE POLICY "conversations_insert_admin"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

-- ─── intake-documents: auth + own folder only ──────────────────────────────
DROP POLICY IF EXISTS "Anyone can upload intake documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view intake documents" ON storage.objects;

CREATE POLICY "intake_docs_insert_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'intake-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "intake_docs_select_own_folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'intake-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_platform_admin()
    )
  );

CREATE POLICY "intake_docs_delete_own_folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'intake-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
