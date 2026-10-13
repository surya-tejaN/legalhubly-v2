-- Create intake_cases table for storing legal intake submissions
CREATE TABLE public.intake_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'matched', 'closed')),
  legal_category TEXT,
  matter_description TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'standard', 'urgent', 'emergency')),
  budget_range TEXT,
  location TEXT,
  language_preference TEXT DEFAULT 'English',
  consultation_preference TEXT CHECK (consultation_preference IN ('video', 'phone', 'in_person', 'any')),
  timeline TEXT,
  opposing_party_details TEXT,
  ai_case_summary TEXT,
  ai_tags TEXT[] DEFAULT '{}',
  ai_lead_score INTEGER CHECK (ai_lead_score >= 0 AND ai_lead_score <= 100),
  ai_recommended_lawyers TEXT[] DEFAULT '{}',
  conversation_history JSONB DEFAULT '[]',
  intake_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create intake cases"
  ON public.intake_cases FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read intake cases"
  ON public.intake_cases FOR SELECT USING (true);

CREATE POLICY "Anyone can update intake cases"
  ON public.intake_cases FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_intake_cases_updated_at
  BEFORE UPDATE ON public.intake_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('intake-documents', 'intake-documents', false);

CREATE POLICY "Anyone can upload intake documents"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'intake-documents');

CREATE POLICY "Anyone can view intake documents"
  ON storage.objects FOR SELECT USING (bucket_id = 'intake-documents');

CREATE INDEX idx_intake_cases_session_id ON public.intake_cases (session_id);
CREATE INDEX idx_intake_cases_status ON public.intake_cases (status);