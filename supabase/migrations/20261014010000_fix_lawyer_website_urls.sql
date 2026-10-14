-- Seed firm websites were placeholders that do not resolve.
-- Point every lawyer CTA at a Google search for name + firm so Visit Website always works.
UPDATE public.lawyers
SET website_url =
  'https://www.google.com/search?q=' ||
  replace(
    trim(both from coalesce(name, '') || ' ' || coalesce(firm, '') || ' attorney'),
    ' ',
    '+'
  );
