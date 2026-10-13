
-- Lawyers table
CREATE TABLE public.lawyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  firm text NOT NULL,
  email text,
  phone text,
  avatar_initials text NOT NULL DEFAULT 'XX',
  verified boolean NOT NULL DEFAULT false,
  practice_areas text[] NOT NULL DEFAULT '{}',
  experience_years integer NOT NULL DEFAULT 0,
  jurisdictions text[] NOT NULL DEFAULT '{}',
  city text,
  state text,
  languages text[] NOT NULL DEFAULT ARRAY['English'],
  consultation_fee numeric(10,2),
  hourly_rate numeric(10,2),
  consultation_types text[] NOT NULL DEFAULT ARRAY['video'],
  avg_response_hours numeric(5,1) NOT NULL DEFAULT 24,
  availability_status text NOT NULL DEFAULT 'available',
  next_available_date date,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  review_summary text,
  bio text,
  specialization_tags text[] NOT NULL DEFAULT '{}',
  complexity_levels text[] NOT NULL DEFAULT ARRAY['standard'],
  budget_ranges text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lawyers" ON public.lawyers FOR SELECT USING (true);

-- Saved shortlist table
CREATE TABLE public.saved_lawyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  lawyer_id uuid REFERENCES public.lawyers(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, lawyer_id)
);

ALTER TABLE public.saved_lawyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage saved lawyers" ON public.saved_lawyers FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_lawyers_updated_at
  BEFORE UPDATE ON public.lawyers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
