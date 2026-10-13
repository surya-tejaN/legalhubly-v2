
-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  lead_fee NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  ai_credits_monthly INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON public.subscription_plans FOR SELECT USING (true);

-- Lawyer subscriptions table
CREATE TABLE public.lawyer_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES public.lawyers(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_mvp_free BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lawyer_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read subscriptions" ON public.lawyer_subscriptions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert subscriptions" ON public.lawyer_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update subscriptions" ON public.lawyer_subscriptions FOR UPDATE USING (true);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL DEFAULT ('INV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random() * 9999 + 1))::text, 4, '0')),
  matter_id UUID REFERENCES public.matters(id),
  lawyer_id UUID REFERENCES public.lawyers(id),
  client_name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  is_mvp_simulated BOOLEAN NOT NULL DEFAULT true,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

-- Add is_mvp_free column to consultations
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS is_mvp_free BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0;

-- Seed subscription plans
INSERT INTO public.subscription_plans (name, tier, price_monthly, price_yearly, features, lead_fee, commission_rate, ai_credits_monthly) VALUES
('Starter', 'free', 0, 0, '["5 leads/month", "Basic profile", "Email support", "Standard AI tools"]'::jsonb, 0, 0, 50),
('Professional', 'professional', 149, 1490, '["Unlimited leads", "Featured profile", "Priority support", "Advanced AI tools", "Analytics dashboard", "Custom branding"]'::jsonb, 25, 10, 500),
('Enterprise', 'enterprise', 399, 3990, '["Everything in Pro", "White-label portal", "API access", "Dedicated account manager", "Custom integrations", "Unlimited AI credits"]'::jsonb, 15, 5, 0);
