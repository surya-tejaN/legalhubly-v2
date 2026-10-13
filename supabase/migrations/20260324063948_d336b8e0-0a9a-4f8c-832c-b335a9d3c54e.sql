CREATE POLICY "Anyone can view lawyer profiles" ON public.profiles
  FOR SELECT USING (role = 'lawyer'::app_role);