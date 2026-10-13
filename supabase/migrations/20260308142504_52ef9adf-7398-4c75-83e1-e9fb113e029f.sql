
-- Matters table
CREATE TABLE public.matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL DEFAULT 'M-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 9999 + 1)::text, 4, '0'),
  lawyer_id uuid REFERENCES public.lawyers(id),
  client_name text NOT NULL,
  client_email text,
  title text NOT NULL,
  description text,
  legal_category text,
  status text NOT NULL DEFAULT 'active',
  priority text NOT NULL DEFAULT 'medium',
  intake_case_id uuid REFERENCES public.intake_cases(id),
  next_deadline date,
  total_billed numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read matters" ON public.matters FOR SELECT USING (true);
CREATE POLICY "Anyone can insert matters" ON public.matters FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update matters" ON public.matters FOR UPDATE USING (true);

CREATE TRIGGER update_matters_updated_at BEFORE UPDATE ON public.matters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES public.matters(id) ON DELETE CASCADE,
  lawyer_id uuid REFERENCES public.lawyers(id),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Time entries table
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES public.matters(id) ON DELETE CASCADE,
  lawyer_id uuid REFERENCES public.lawyers(id),
  description text NOT NULL,
  hours numeric(5,2) NOT NULL,
  rate numeric(10,2) NOT NULL DEFAULT 0,
  billable boolean NOT NULL DEFAULT true,
  date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage time entries" ON public.time_entries FOR ALL USING (true) WITH CHECK (true);

-- Internal notes table
CREATE TABLE public.internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES public.matters(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Sarah Chen',
  content text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage internal notes" ON public.internal_notes FOR ALL USING (true) WITH CHECK (true);

-- Leads table (to replace static data)
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_case_id uuid REFERENCES public.intake_cases(id),
  lawyer_id uuid REFERENCES public.lawyers(id),
  client_name text NOT NULL,
  client_email text,
  issue text NOT NULL,
  legal_category text,
  lead_score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  urgency text NOT NULL DEFAULT 'standard',
  budget_range text,
  source text NOT NULL DEFAULT 'AI Intake',
  ai_summary text,
  conflict_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update leads" ON public.leads FOR UPDATE USING (true);

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Consultations / calendar events
CREATE TABLE public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES public.matters(id),
  lawyer_id uuid REFERENCES public.lawyers(id),
  client_name text NOT NULL,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  type text NOT NULL DEFAULT 'video',
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage consultations" ON public.consultations FOR ALL USING (true) WITH CHECK (true);

-- Payments tracking
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES public.matters(id),
  lawyer_id uuid REFERENCES public.lawyers(id),
  client_name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  description text,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
