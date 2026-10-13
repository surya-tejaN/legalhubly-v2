CREATE TABLE public.email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified BOOLEAN DEFAULT false,
  attempts INT DEFAULT 0
);

CREATE INDEX idx_verification_user ON public.email_verification_codes(user_id);
CREATE INDEX idx_verification_email ON public.email_verification_codes(email);

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage verification codes"
ON public.email_verification_codes
FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);