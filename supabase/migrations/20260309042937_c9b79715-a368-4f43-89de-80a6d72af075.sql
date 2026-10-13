
-- 1. Cities table
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cities" ON public.cities FOR SELECT USING (true);
CREATE INDEX idx_cities_slug ON public.cities (slug);
CREATE INDEX idx_cities_state ON public.cities (state);

-- 2. Practice areas table
CREATE TABLE public.practice_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read practice areas" ON public.practice_areas FOR SELECT USING (true);
CREATE INDEX idx_practice_areas_slug ON public.practice_areas (slug);

-- 3. Add foreign keys to existing lawyers table
ALTER TABLE public.lawyers
  ADD COLUMN city_id UUID REFERENCES public.cities(id),
  ADD COLUMN practice_area_id UUID REFERENCES public.practice_areas(id);

CREATE INDEX idx_lawyers_city_id ON public.lawyers (city_id);
CREATE INDEX idx_lawyers_practice_area_id ON public.lawyers (practice_area_id);

-- 4. Reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL REFERENCES public.lawyers(id) ON DELETE CASCADE,
  rating NUMERIC NOT NULL DEFAULT 0,
  review_text TEXT,
  reviewer_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can create reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE INDEX idx_reviews_lawyer_id ON public.reviews (lawyer_id);
CREATE INDEX idx_reviews_rating ON public.reviews (rating);
