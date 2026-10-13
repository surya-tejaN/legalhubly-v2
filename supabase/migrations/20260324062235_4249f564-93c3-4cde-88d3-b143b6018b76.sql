
-- 1. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2. CONVERSATION_PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'participant' CHECK (role IN ('participant', 'admin')),
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);

-- 3. MESSAGES (with realtime)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 4. DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL DEFAULT 'documents',
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bucket, path)
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_path ON public.documents(bucket, path);

-- 5. RLS POLICIES for conversations
CREATE POLICY "Participants view conversations" ON public.conversations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);
CREATE POLICY "Anyone can create conversations" ON public.conversations FOR INSERT WITH CHECK (true);

-- 6. RLS POLICIES for conversation_participants
CREATE POLICY "Participants view participant list" ON public.conversation_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp 
    WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
  )
);
CREATE POLICY "Users can join conversations" ON public.conversation_participants FOR INSERT WITH CHECK (user_id = auth.uid());

-- 7. RLS POLICIES for messages
CREATE POLICY "Participants view messages" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT WITH CHECK (sender_user_id = auth.uid());

-- 8. RLS POLICIES for documents
CREATE POLICY "Users view own documents" ON public.documents FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY "Users upload documents" ON public.documents FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Users delete own documents" ON public.documents FOR DELETE USING (owner_user_id = auth.uid());

-- 9. Fix saved_lawyers to use user_id instead of session_id
DROP POLICY IF EXISTS "Anyone can manage saved lawyers" ON public.saved_lawyers;
ALTER TABLE public.saved_lawyers DROP COLUMN IF EXISTS session_id;
ALTER TABLE public.saved_lawyers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.saved_lawyers DROP CONSTRAINT IF EXISTS saved_lawyers_pkey;
ALTER TABLE public.saved_lawyers ADD CONSTRAINT saved_lawyers_user_lawyer_unique UNIQUE (user_id, lawyer_id);

CREATE INDEX IF NOT EXISTS idx_saved_lawyers_user ON public.saved_lawyers(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_lawyers_lawyer ON public.saved_lawyers(lawyer_id);

CREATE POLICY "Users view own saved" ON public.saved_lawyers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved" ON public.saved_lawyers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saved" ON public.saved_lawyers FOR DELETE USING (auth.uid() = user_id);

-- 10. Add profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 11. Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 12. Storage policies
CREATE POLICY "Users can upload to own folder" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own files" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 13. Update triggers
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
