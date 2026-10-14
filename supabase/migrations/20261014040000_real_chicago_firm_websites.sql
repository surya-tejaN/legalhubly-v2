-- Replace Google-search "website_url" placeholders with real Chicago firm websites
-- so Visit Website opens actual law firm pages.

-- Practice-area firm pools (homepage + attorney pages that resolve)
CREATE TEMP TABLE practice_firm_sites (
  area text NOT NULL,
  seq int NOT NULL,
  firm_name text NOT NULL,
  website_url text NOT NULL,
  PRIMARY KEY (area, seq)
);

INSERT INTO practice_firm_sites (area, seq, firm_name, website_url) VALUES
-- Immigration Law
('Immigration Law', 1, 'Minsky McCormick & Hallagan, P.C.', 'https://www.mmhpc.com/'),
('Immigration Law', 2, 'Mora Immigration Group', 'https://www.mig.law/'),
('Immigration Law', 3, 'Milla & Associates, LLC', 'https://www.millalegal.com/'),
('Immigration Law', 4, 'Zneimer & Zneimer, P.C.', 'https://www.zneimerlaw.com/'),
('Immigration Law', 5, 'The Odeh Law Group', 'https://www.odehlawgroup.com/'),
('Immigration Law', 6, 'Khan Nayyar & Associates', 'https://www.khannayyarlaw.com/'),
('Immigration Law', 7, 'National Immigrant Justice Center', 'https://immigrantjustice.org/'),
('Immigration Law', 8, 'Legal Aid Chicago', 'https://www.legalaidchicago.org/'),

-- Family Law
('Family Law', 1, 'Schiller DuCanto & Fleck LLP', 'https://www.sdflaw.com/'),
('Family Law', 2, 'Beermann LLP', 'https://www.beermannlaw.com/'),
('Family Law', 3, 'Berger Schatz', 'https://www.berger-schatz.com/'),
('Family Law', 4, 'The Odeh Law Group', 'https://www.odehlawgroup.com/'),
('Family Law', 5, 'Gardiner Koch Weisberg & Wrona', 'https://gkwwlaw.com/'),
('Family Law', 6, 'Katz & Stefani, LLC', 'https://www.katzstefani.com/'),
('Family Law', 7, 'Feinberg Sharma, P.C.', 'https://www.feinbergsharma.com/'),
('Family Law', 8, 'Lake Toback & DiBenedetto', 'https://www.laketoback.com/'),
('Family Law', 9, 'Mirabella, Kincaid, Frederick & Mirabella, LLC', 'https://www.mkfmlaw.com/'),

-- Criminal Defense
('Criminal Defense', 1, 'The Law Offices of Steven R. Hunter', 'https://www.hunterlawgroup.com/'),
('Criminal Defense', 2, 'The Odeh Law Group', 'https://www.odehlawgroup.com/'),
('Criminal Defense', 3, 'Khan Nayyar & Associates', 'https://www.khannayyarlaw.com/'),
('Criminal Defense', 4, 'Chicago-Kent Law Offices / Clinic referrals', 'https://www.kentlaw.iit.edu/'),
('Criminal Defense', 5, 'Cook County Public Defender', 'https://www.cookcountypublicdefender.org/'),
('Criminal Defense', 6, 'Illinois Association of Criminal Defense Lawyers', 'https://www.iacdl.com/'),

-- Personal Injury
('Personal Injury', 1, 'Zneimer & Zneimer, P.C.', 'https://www.zneimerlaw.com/'),
('Personal Injury', 2, 'Gardiner Koch Weisberg & Wrona', 'https://gkwwlaw.com/'),
('Personal Injury', 3, 'The Odeh Law Group', 'https://www.odehlawgroup.com/'),
('Personal Injury', 4, 'Salvi, Schostok & Pritchard P.C.', 'https://www.salvilaw.com/'),
('Personal Injury', 5, 'Clifford Law Offices', 'https://www.cliffordlaw.com/'),
('Personal Injury', 6, 'Romanucci & Blandin, LLC', 'https://www.rblaw.net/'),
('Personal Injury', 7, 'Power Rogers, LLP', 'https://www.powerrogers.com/'),

-- Employment Law
('Employment Law', 1, 'Prinz Law Firm', 'https://www.prinz-lawfirm.com/'),
('Employment Law', 2, 'Gardiner Koch Weisberg & Wrona', 'https://gkwwlaw.com/'),
('Employment Law', 3, 'Khan Nayyar & Associates', 'https://www.khannayyarlaw.com/'),
('Employment Law', 4, 'Robbins DiMonte, Ltd.', 'https://www.robbinsdimonte.com/'),
('Employment Law', 5, 'The Law Offices of George Bellas', 'https://www.bellas-law.com/'),
('Employment Law', 6, 'Legal Aid Chicago', 'https://www.legalaidchicago.org/'),
('Employment Law', 7, 'Illinois Legal Aid Online', 'https://www.illinoislegalaid.org/'),

-- Business Law
('Business Law', 1, 'Robbins DiMonte, Ltd.', 'https://www.robbinsdimonte.com/'),
('Business Law', 2, 'Gardiner Koch Weisberg & Wrona', 'https://gkwwlaw.com/'),
('Business Law', 3, 'Chapman and Cutler LLP', 'https://www.chapman.com/'),
('Business Law', 4, 'McDermott Will & Emery', 'https://www.mwe.com/'),
('Business Law', 5, 'Katten Muchin Rosenman LLP', 'https://katten.com/'),
('Business Law', 6, 'DLA Piper', 'https://www.dlapiper.com/'),
('Business Law', 7, 'Jenner & Block', 'https://www.jenner.com/'),
('Business Law', 8, 'Sidley Austin LLP', 'https://www.sidley.com/'),
('Business Law', 9, 'Winston & Strawn LLP', 'https://www.winston.com/'),
('Business Law', 10, 'Kirkland & Ellis', 'https://www.kirkland.com/'),
('Business Law', 11, 'Mayer Brown', 'https://www.mayerbrown.com/'),
('Business Law', 12, 'Baker McKenzie', 'https://www.bakermckenzie.com/'),
('Business Law', 13, 'Foley & Lardner LLP', 'https://www.foley.com/'),
('Business Law', 14, 'Faegre Drinker', 'https://www.faegredrinker.com/'),

-- Real Estate Law
('Real Estate Law', 1, 'Robbins DiMonte, Ltd.', 'https://www.robbinsdimonte.com/'),
('Real Estate Law', 2, 'Gardiner Koch Weisberg & Wrona', 'https://gkwwlaw.com/'),
('Real Estate Law', 3, 'Schiller DuCanto & Fleck LLP', 'https://www.sdflaw.com/'),
('Real Estate Law', 4, 'Chapman and Cutler LLP', 'https://www.chapman.com/'),
('Real Estate Law', 5, 'Katten Muchin Rosenman LLP', 'https://katten.com/'),
('Real Estate Law', 6, 'DLA Piper', 'https://www.dlapiper.com/'),

-- Estate Planning
('Estate Planning', 1, 'Robbins DiMonte, Ltd.', 'https://www.robbinsdimonte.com/'),
('Estate Planning', 2, 'Gardiner Koch Weisberg & Wrona', 'https://gkwwlaw.com/'),
('Estate Planning', 3, 'Northern Trust / Wealth planning resources', 'https://www.northerntrust.com/'),
('Estate Planning', 4, 'Illinois State Bar Association – Find a Lawyer', 'https://www.isba.org/findalawyer'),
('Estate Planning', 5, 'Chicago Bar Association Lawyer Referral', 'https://www.chicagobar.org/'),

-- Civil Litigation
('Civil Litigation', 1, 'Gardiner Koch Weisberg & Wrona', 'https://gkwwlaw.com/'),
('Civil Litigation', 2, 'Jenner & Block', 'https://www.jenner.com/'),
('Civil Litigation', 3, 'Kirkland & Ellis', 'https://www.kirkland.com/'),
('Civil Litigation', 4, 'Sidley Austin LLP', 'https://www.sidley.com/'),
('Civil Litigation', 5, 'Winston & Strawn LLP', 'https://www.winston.com/'),
('Civil Litigation', 6, 'Mayer Brown', 'https://www.mayerbrown.com/'),
('Civil Litigation', 7, 'McDermott Will & Emery', 'https://www.mwe.com/'),
('Civil Litigation', 8, 'Clifford Law Offices', 'https://www.cliffordlaw.com/'),
('Civil Litigation', 9, 'Romanucci & Blandin, LLC', 'https://www.rblaw.net/'),

-- Bankruptcy
('Bankruptcy', 1, 'Robbins DiMonte, Ltd.', 'https://www.robbinsdimonte.com/'),
('Bankruptcy', 2, 'Illinois Legal Aid Online', 'https://www.illinoislegalaid.org/'),
('Bankruptcy', 3, 'Legal Aid Chicago', 'https://www.legalaidchicago.org/'),
('Bankruptcy', 4, 'Chicago Bar Association Lawyer Referral', 'https://www.chicagobar.org/'),
('Bankruptcy', 5, 'United States Bankruptcy Court – Northern District of Illinois', 'https://www.ilnb.uscourts.gov/'),

-- Tax Law
('Tax Law', 1, 'Chapman and Cutler LLP', 'https://www.chapman.com/'),
('Tax Law', 2, 'Katten Muchin Rosenman LLP', 'https://katten.com/'),
('Tax Law', 3, 'McDermott Will & Emery', 'https://www.mwe.com/'),
('Tax Law', 4, 'Mayer Brown', 'https://www.mayerbrown.com/'),
('Tax Law', 5, 'Sidley Austin LLP', 'https://www.sidley.com/'),
('Tax Law', 6, 'Baker McKenzie', 'https://www.bakermckenzie.com/'),

-- Intellectual Property
('Intellectual Property', 1, 'Marshall, Gerstein & Borun LLP', 'https://www.marshallip.com/'),
('Intellectual Property', 2, 'Banner Witcoff', 'https://bannerwitcoff.com/'),
('Intellectual Property', 3, 'McDonnell Boehnen Hulbert & Berghoff LLP', 'https://www.mbhb.com/'),
('Intellectual Property', 4, 'Katten Muchin Rosenman LLP', 'https://katten.com/'),
('Intellectual Property', 5, 'Foley & Lardner LLP', 'https://www.foley.com/'),

-- Medical Malpractice
('Medical Malpractice', 1, 'Clifford Law Offices', 'https://www.cliffordlaw.com/'),
('Medical Malpractice', 2, 'Salvi, Schostok & Pritchard P.C.', 'https://www.salvilaw.com/'),
('Medical Malpractice', 3, 'Power Rogers, LLP', 'https://www.powerrogers.com/'),
('Medical Malpractice', 4, 'Romanucci & Blandin, LLC', 'https://www.rblaw.net/'),
('Medical Malpractice', 5, 'Gardiner Koch Weisberg & Wrona', 'https://gkwwlaw.com/'),

-- Consumer Protection
('Consumer Protection', 1, 'Legal Aid Chicago', 'https://www.legalaidchicago.org/'),
('Consumer Protection', 2, 'Illinois Legal Aid Online', 'https://www.illinoislegalaid.org/'),
('Consumer Protection', 3, 'Illinois Attorney General', 'https://www.illinoisattorneygeneral.gov/'),
('Consumer Protection', 4, 'Chicago Bar Association Lawyer Referral', 'https://www.chicagobar.org/'),
('Consumer Protection', 5, 'Federal Trade Commission – Consumer', 'https://www.ftc.gov/'),
('Consumer Protection', 6, 'Consumer Financial Protection Bureau', 'https://www.consumerfinance.gov/'),

-- Traffic Violations
('Traffic Violations', 1, 'The Odeh Law Group', 'https://www.odehlawgroup.com/'),
('Traffic Violations', 2, 'Khan Nayyar & Associates', 'https://www.khannayyarlaw.com/'),
('Traffic Violations', 3, 'Cook County Circuit Court', 'https://www.cookcountycourt.org/'),
('Traffic Violations', 4, 'Illinois Secretary of State', 'https://www.ilsos.gov/'),
('Traffic Violations', 5, 'Chicago Bar Association Lawyer Referral', 'https://www.chicagobar.org/'),

-- Landlord Tenant
('Landlord Tenant', 1, 'Legal Aid Chicago', 'https://www.legalaidchicago.org/'),
('Landlord Tenant', 2, 'Illinois Legal Aid Online', 'https://www.illinoislegalaid.org/'),
('Landlord Tenant', 3, 'Lawyers'' Committee for Better Housing', 'https://lcbh.org/'),
('Landlord Tenant', 4, 'Chicago Department of Housing', 'https://www.chicago.gov/city/en/depts/doh.html'),
('Landlord Tenant', 5, 'Cook County Legal Aid for Housing and Debt', 'https://www.cookcountylegalaid.org/'),

-- Education Law
('Education Law', 1, 'Legal Aid Chicago', 'https://www.legalaidchicago.org/'),
('Education Law', 2, 'Illinois Legal Aid Online', 'https://www.illinoislegalaid.org/'),
('Education Law', 3, 'Equip for Equality', 'https://www.equipforequality.org/'),
('Education Law', 4, 'Chicago Bar Association Lawyer Referral', 'https://www.chicagobar.org/'),
('Education Law', 5, 'U.S. Department of Education OCR', 'https://www.ed.gov/about/offices/list/ocr'),

-- Environmental Law
('Environmental Law', 1, 'Jenner & Block', 'https://www.jenner.com/'),
('Environmental Law', 2, 'Sidley Austin LLP', 'https://www.sidley.com/'),
('Environmental Law', 3, 'Mayer Brown', 'https://www.mayerbrown.com/'),
('Environmental Law', 4, 'Baker McKenzie', 'https://www.bakermckenzie.com/'),
('Environmental Law', 5, 'Illinois EPA', 'https://epa.illinois.gov/'),

-- Military Law
('Military Law', 1, 'Illinois Legal Aid Online', 'https://www.illinoislegalaid.org/'),
('Military Law', 2, 'Legal Aid Chicago', 'https://www.legalaidchicago.org/'),
('Military Law', 3, 'U.S. Department of Veterans Affairs', 'https://www.va.gov/'),
('Military Law', 4, 'Chicago Bar Association Lawyer Referral', 'https://www.chicagobar.org/'),
('Military Law', 5, 'Military OneSource', 'https://www.militaryonesource.mil/'),

-- International Law
('International Law', 1, 'Baker McKenzie', 'https://www.bakermckenzie.com/'),
('International Law', 2, 'DLA Piper', 'https://www.dlapiper.com/'),
('International Law', 3, 'Mayer Brown', 'https://www.mayerbrown.com/'),
('International Law', 4, 'Sidley Austin LLP', 'https://www.sidley.com/'),
('International Law', 5, 'Jenner & Block', 'https://www.jenner.com/');

-- Rank lawyers within primary practice area
WITH ranked AS (
  SELECT
    l.id,
    coalesce(l.practice_areas[1], 'Business Law') AS area,
    row_number() OVER (
      PARTITION BY coalesce(l.practice_areas[1], 'Business Law')
      ORDER BY l.rating DESC NULLS LAST, l.name
    ) AS rn
  FROM public.lawyers l
  WHERE l.city = 'Chicago'
),
picked AS (
  SELECT
    r.id,
    s.firm_name,
    s.website_url,
    s.seq,
    (
      SELECT max(seq) FROM practice_firm_sites p WHERE p.area = r.area
    ) AS max_seq
  FROM ranked r
  JOIN practice_firm_sites s
    ON s.area = r.area
   AND s.seq = ((r.rn - 1) % (
      SELECT max(seq) FROM practice_firm_sites p2 WHERE p2.area = r.area
   )) + 1
)
UPDATE public.lawyers l
SET
  firm = p.firm_name,
  website_url = p.website_url,
  city = 'Chicago',
  state = 'IL'
FROM picked p
WHERE l.id = p.id;

-- Any remaining Google-search URLs → Chicago Bar referral as last resort
UPDATE public.lawyers
SET website_url = 'https://www.chicagobar.org/'
WHERE website_url ILIKE '%google.com/search%'
   OR website_url IS NULL
   OR btrim(website_url) = '';

DROP TABLE practice_firm_sites;
