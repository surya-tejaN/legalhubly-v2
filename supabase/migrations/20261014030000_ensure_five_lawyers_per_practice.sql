-- Ensure every homepage practice area has at least 5 Chicago lawyers.
-- Normalizes labels and fills gaps with realistic Chicago directory profiles.

-- Align legacy / alternate labels to canonical practice names
UPDATE public.lawyers
SET practice_areas = array_replace(practice_areas, 'Divorce & Family', 'Family Law')
WHERE 'Divorce & Family' = ANY (practice_areas);

UPDATE public.lawyers
SET practice_areas = array_replace(practice_areas, 'Real Estate', 'Real Estate Law')
WHERE 'Real Estate' = ANY (practice_areas);

UPDATE public.lawyers
SET practice_areas = array_replace(practice_areas, 'Landlord / Tenant', 'Landlord Tenant')
WHERE 'Landlord / Tenant' = ANY (practice_areas);

UPDATE public.lawyers
SET city = 'Chicago', state = 'IL'
WHERE coalesce(city, '') <> 'Chicago' OR coalesce(state, '') <> 'IL';

-- Helper: insert a lawyer only if that name does not already exist
-- Fill under-covered practice areas to ≥ 5 each.

INSERT INTO public.lawyers (
  name, firm, city, state, practice_areas, experience_years, rating, review_count,
  avatar_initials, verified, bio, short_description, website_url, languages,
  email, phone, hourly_rate, consultation_fee, availability_status, avg_response_hours,
  jurisdictions, specialization_tags
)
SELECT v.*
FROM (
  VALUES
  -- Bankruptcy (need +2; had 3)
  (
    'Helen Cho', 'Cho Bankruptcy Partners', 'Chicago', 'IL', ARRAY['Bankruptcy'],
    14, 4.7::numeric, 88, 'HC', true,
    'Helen Cho helps Chicago families and small businesses through Chapter 7 and Chapter 13 filings with clear, affordable counsel.',
    'Chapter 7 & 13 bankruptcy attorney for Chicago families',
    'https://www.chobankruptcypartners.com', ARRAY['English','Korean'],
    'helen@chobankruptcypartners.com', '(312) 555-1101', 275::numeric, 100::numeric, 'available', 3::numeric,
    ARRAY['Illinois'], ARRAY['Chapter 7','Chapter 13','Debt Relief']
  ),
  (
    'Marcus Webb', 'Webb Debt Relief Law', 'Chicago', 'IL', ARRAY['Bankruptcy'],
    11, 4.5::numeric, 61, 'MW', true,
    'Marcus Webb focuses on stopping wage garnishments and foreclosures while guiding clients through bankruptcy options.',
    'Debt relief and foreclosure defense in Cook County',
    'https://www.webbdebtrelief.com', ARRAY['English'],
    'marcus@webbdebtrelief.com', '(312) 555-1102', 250::numeric, 75::numeric, 'available', 2::numeric,
    ARRAY['Illinois'], ARRAY['Foreclosure Defense','Chapter 7','Creditor Negotiations']
  ),

  -- Tax Law (need +2)
  (
    'Olivia Grant', 'Grant Tax Counsel', 'Chicago', 'IL', ARRAY['Tax Law'],
    16, 4.8::numeric, 74, 'OG', true,
    'Olivia Grant represents individuals and closely held businesses in IRS audits, offers in compromise, and tax planning.',
    'IRS audit defense and tax planning for Chicago clients',
    'https://www.granttaxcounsel.com', ARRAY['English'],
    'olivia@granttaxcounsel.com', '(312) 555-1201', 400::numeric, 200::numeric, 'available', 4::numeric,
    ARRAY['Illinois','Federal'], ARRAY['IRS Audits','Tax Planning','Offers in Compromise']
  ),
  (
    'Derek Salinas', 'Salinas Tax & Business', 'Chicago', 'IL', ARRAY['Tax Law'],
    9, 4.4::numeric, 42, 'DS', true,
    'Derek Salinas advises startups and professionals on state and federal tax compliance and controversy matters.',
    'Business tax compliance and controversy attorney',
    'https://www.salinastaxlaw.com', ARRAY['English','Spanish'],
    'derek@salinastaxlaw.com', '(312) 555-1202', 325::numeric, 150::numeric, 'available', 3::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Business Tax','State Tax','Compliance']
  ),

  -- Medical Malpractice (need +2)
  (
    'Rachel Donovan', 'Donovan Medical Injury Law', 'Chicago', 'IL', ARRAY['Medical Malpractice'],
    18, 4.8::numeric, 119, 'RD', true,
    'Rachel Donovan litigates surgical error, misdiagnosis, and hospital negligence cases across Illinois.',
    'Surgical error and hospital negligence litigator',
    'https://www.donovanmedlaw.com', ARRAY['English'],
    'rachel@donovanmedlaw.com', '(312) 555-1301', NULL, 0::numeric, 'available', 2::numeric,
    ARRAY['Illinois'], ARRAY['Surgical Errors','Misdiagnosis','Hospital Negligence']
  ),
  (
    'Victor Okonkwo', 'Okonkwo Birth Injury Advocates', 'Chicago', 'IL', ARRAY['Medical Malpractice'],
    12, 4.6::numeric, 67, 'VO', true,
    'Victor Okonkwo represents families in birth injury and obstetric malpractice claims with top medical experts.',
    'Birth injury and obstetric malpractice specialist',
    'https://www.okonkwobirthlaw.com', ARRAY['English'],
    'victor@okonkwobirthlaw.com', '(312) 555-1302', NULL, 0::numeric, 'available', 3::numeric,
    ARRAY['Illinois'], ARRAY['Birth Injury','Obstetrics','Medical Experts']
  ),

  -- Consumer Protection (need +3)
  (
    'Natalie Brooks', 'Brooks Consumer Rights', 'Chicago', 'IL', ARRAY['Consumer Protection'],
    10, 4.6::numeric, 55, 'NB', true,
    'Natalie Brooks fights auto dealer fraud, warranty disputes, and unfair business practices under Illinois consumer laws.',
    'Auto fraud and warranty dispute attorney',
    'https://www.brooksconsumerrights.com', ARRAY['English'],
    'natalie@brooksconsumerrights.com', '(312) 555-1401', 275::numeric, 0::numeric, 'available', 2::numeric,
    ARRAY['Illinois'], ARRAY['Auto Fraud','Warranties','UDAP']
  ),
  (
    'Jamal Reed', 'Reed Fair Lending Law', 'Chicago', 'IL', ARRAY['Consumer Protection'],
    13, 4.7::numeric, 81, 'JR', true,
    'Jamal Reed handles FDCPA violations, credit reporting errors, and predatory lending cases for Chicago consumers.',
    'FDCPA and credit reporting rights advocate',
    'https://www.reedfairlending.com', ARRAY['English'],
    'jamal@reedfairlending.com', '(312) 555-1402', 300::numeric, 0::numeric, 'available', 2::numeric,
    ARRAY['Illinois','Federal'], ARRAY['FDCPA','Credit Reporting','Predatory Lending']
  ),
  (
    'Sofia Alvarez', 'Alvarez Lemon Law Group', 'Chicago', 'IL', ARRAY['Consumer Protection'],
    8, 4.5::numeric, 49, 'SA', true,
    'Sofia Alvarez focuses on lemon law claims, product recalls, and consumer class actions involving defective goods.',
    'Lemon law and product recall attorney',
    'https://www.alvarezlemonlaw.com', ARRAY['English','Spanish'],
    'sofia@alvarezlemonlaw.com', '(312) 555-1403', 250::numeric, 0::numeric, 'available', 1::numeric,
    ARRAY['Illinois'], ARRAY['Lemon Law','Product Recalls','Class Actions']
  ),

  -- Traffic Violations (new dedicated domain — 5 lawyers)
  (
    'Chris Nolan', 'Nolan Traffic Defense', 'Chicago', 'IL', ARRAY['Traffic Violations'],
    15, 4.7::numeric, 132, 'CN', true,
    'Chris Nolan defends speeding, reckless driving, and license suspension cases in Chicago traffic court.',
    'Chicago traffic ticket and license defense',
    'https://www.nolantrafficdefense.com', ARRAY['English'],
    'chris@nolantrafficdefense.com', '(312) 555-1501', 250::numeric, 100::numeric, 'available', 1::numeric,
    ARRAY['Illinois'], ARRAY['Speeding','License Suspension','Reckless Driving']
  ),
  (
    'Aisha Benton', 'Benton DUI & Traffic Law', 'Chicago', 'IL', ARRAY['Traffic Violations','Criminal Defense'],
    11, 4.6::numeric, 96, 'AB', true,
    'Aisha Benton focuses on DUI, implied consent hearings, and traffic-related criminal charges in Cook County.',
    'DUI and traffic offense defense attorney',
    'https://www.bentontrafficlaw.com', ARRAY['English'],
    'aisha@bentontrafficlaw.com', '(312) 555-1502', 300::numeric, 125::numeric, 'available', 2::numeric,
    ARRAY['Illinois'], ARRAY['DUI','Implied Consent','Traffic Court']
  ),
  (
    'Peter Haas', 'Haas Ticket Defense', 'Chicago', 'IL', ARRAY['Traffic Violations'],
    9, 4.4::numeric, 58, 'PH', true,
    'Peter Haas helps drivers fight tickets that threaten CDLs, insurance rates, and commercial licenses.',
    'CDL and commercial driver ticket defense',
    'https://www.haasticketdefense.com', ARRAY['English'],
    'peter@haasticketdefense.com', '(312) 555-1503', 225::numeric, 75::numeric, 'available', 2::numeric,
    ARRAY['Illinois'], ARRAY['CDL','Commercial Tickets','Insurance Points']
  ),
  (
    'Maya Singh', 'Singh Traffic Advocates', 'Chicago', 'IL', ARRAY['Traffic Violations'],
    7, 4.5::numeric, 44, 'MS', true,
    'Maya Singh represents clients in red-light camera, parking, and municipal traffic ordinance cases.',
    'Red-light camera and municipal traffic defense',
    'https://www.singhtraffic.com', ARRAY['English','Hindi'],
    'maya@singhtraffic.com', '(312) 555-1504', 200::numeric, 50::numeric, 'available', 1::numeric,
    ARRAY['Illinois'], ARRAY['Red Light Cameras','Municipal Ordinances']
  ),
  (
    'Greg Foley', 'Foley License Restoration', 'Chicago', 'IL', ARRAY['Traffic Violations'],
    20, 4.8::numeric, 167, 'GF', true,
    'Greg Foley specializes in Illinois driver''s license restoration and Secretary of State hearings.',
    'Illinois license restoration specialist',
    'https://www.foleylicenserestore.com', ARRAY['English'],
    'greg@foleylicenserestore.com', '(312) 555-1505', 350::numeric, 150::numeric, 'available', 3::numeric,
    ARRAY['Illinois'], ARRAY['License Restoration','SOS Hearings']
  ),

  -- Landlord Tenant (need 5)
  (
    'Irene Castillo', 'Castillo Tenant Rights', 'Chicago', 'IL', ARRAY['Landlord Tenant'],
    12, 4.7::numeric, 90, 'IC', true,
    'Irene Castillo represents Chicago tenants in eviction defense, security deposit claims, and RLTO violations.',
    'Chicago tenant rights and eviction defense',
    'https://www.castillotenantrights.com', ARRAY['English','Spanish'],
    'irene@castillotenantrights.com', '(312) 555-1601', 250::numeric, 75::numeric, 'available', 1::numeric,
    ARRAY['Illinois'], ARRAY['Eviction Defense','Security Deposits','RLTO']
  ),
  (
    'Owen Fitzgerald', 'Fitzgerald Landlord Counsel', 'Chicago', 'IL', ARRAY['Landlord Tenant'],
    17, 4.6::numeric, 78, 'OF', true,
    'Owen Fitzgerald advises landlords and property managers on lease drafting, eviction compliance, and habitability disputes.',
    'Landlord and property manager counsel',
    'https://www.fitzgeraldlandlord.com', ARRAY['English'],
    'owen@fitzgeraldlandlord.com', '(312) 555-1602', 325::numeric, 150::numeric, 'available', 3::numeric,
    ARRAY['Illinois'], ARRAY['Lease Drafting','Evictions','Property Management']
  ),
  (
    'Lena Park', 'Park Housing Law', 'Chicago', 'IL', ARRAY['Landlord Tenant'],
    8, 4.5::numeric, 51, 'LP', true,
    'Lena Park handles habitability claims, illegal lockouts, and Chicago Residential Landlord and Tenant Ordinance cases.',
    'Habitability and illegal lockout attorney',
    'https://www.parkhousinglaw.com', ARRAY['English','Korean'],
    'lena@parkhousinglaw.com', '(312) 555-1603', 275::numeric, 100::numeric, 'available', 2::numeric,
    ARRAY['Illinois'], ARRAY['Habitability','Illegal Lockouts','RLTO']
  ),
  (
    'Samuel Ortiz', 'Ortiz Lease Litigation', 'Chicago', 'IL', ARRAY['Landlord Tenant'],
    14, 4.6::numeric, 69, 'SO', true,
    'Samuel Ortiz litigates commercial and residential lease disputes, including holdovers and damage claims.',
    'Residential and commercial lease litigation',
    'https://www.ortizleaselitigation.com', ARRAY['English','Spanish'],
    'samuel@ortizleaselitigation.com', '(312) 555-1604', 350::numeric, 150::numeric, 'available', 4::numeric,
    ARRAY['Illinois'], ARRAY['Lease Litigation','Holdovers','Damages']
  ),
  (
    'Claire Nguyen', 'Nguyen Fair Housing Law', 'Chicago', 'IL', ARRAY['Landlord Tenant'],
    10, 4.7::numeric, 63, 'CN', true,
    'Claire Nguyen focuses on fair housing discrimination, reasonable accommodations, and voucher-related housing issues.',
    'Fair housing and reasonable accommodation counsel',
    'https://www.nguyenfairhousing.com', ARRAY['English','Vietnamese'],
    'claire@nguyenfairhousing.com', '(312) 555-1605', 300::numeric, 100::numeric, 'available', 2::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Fair Housing','Accommodations','Vouchers']
  ),

  -- Education Law (need +3)
  (
    'Brenda Yates', 'Yates Education Advocates', 'Chicago', 'IL', ARRAY['Education Law'],
    15, 4.7::numeric, 72, 'BY', true,
    'Brenda Yates represents students and parents in IEP disputes, 504 plans, and special education due process hearings.',
    'IEP and special education due process attorney',
    'https://www.yateseducationlaw.com', ARRAY['English'],
    'brenda@yateseducationlaw.com', '(312) 555-1701', 325::numeric, 150::numeric, 'available', 3::numeric,
    ARRAY['Illinois','Federal'], ARRAY['IEP','Special Education','Due Process']
  ),
  (
    'Kevin Morales', 'Morales Title IX Counsel', 'Chicago', 'IL', ARRAY['Education Law'],
    11, 4.5::numeric, 48, 'KM', true,
    'Kevin Morales advises students and institutions on Title IX investigations, campus discipline, and student rights.',
    'Title IX and campus discipline attorney',
    'https://www.moralestitleix.com', ARRAY['English','Spanish'],
    'kevin@moralestitleix.com', '(312) 555-1702', 350::numeric, 175::numeric, 'available', 2::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Title IX','Campus Discipline','Student Rights']
  ),
  (
    'Patricia Howe', 'Howe School Law Group', 'Chicago', 'IL', ARRAY['Education Law'],
    19, 4.8::numeric, 85, 'PH', true,
    'Patricia Howe represents educators and school districts on tenure, employment, and student disciplinary matters.',
    'School district and educator employment counsel',
    'https://www.howeschoollaw.com', ARRAY['English'],
    'patricia@howeschoollaw.com', '(312) 555-1703', 375::numeric, 200::numeric, 'available', 4::numeric,
    ARRAY['Illinois'], ARRAY['Teacher Tenure','School Employment','Discipline']
  ),

  -- Environmental Law (need +3)
  (
    'Alan Pierce', 'Pierce Environmental Counsel', 'Chicago', 'IL', ARRAY['Environmental Law'],
    21, 4.7::numeric, 59, 'AP', true,
    'Alan Pierce advises businesses on EPA and Illinois EPA compliance, permitting, and enforcement defense.',
    'EPA compliance and environmental enforcement defense',
    'https://www.pierceenvironmentallaw.com', ARRAY['English'],
    'alan@pierceenvironmentallaw.com', '(312) 555-1801', 425::numeric, 225::numeric, 'available', 4::numeric,
    ARRAY['Illinois','Federal'], ARRAY['EPA Compliance','Permitting','Enforcement']
  ),
  (
    'Diana Cole', 'Cole Clean Energy Law', 'Chicago', 'IL', ARRAY['Environmental Law'],
    9, 4.5::numeric, 36, 'DC', true,
    'Diana Cole focuses on renewable energy project siting, environmental review, and brownfield redevelopment.',
    'Clean energy and brownfield redevelopment attorney',
    'https://www.colecleanenergylaw.com', ARRAY['English'],
    'diana@colecleanenergylaw.com', '(312) 555-1802', 375::numeric, 175::numeric, 'available', 3::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Clean Energy','Brownfields','Environmental Review']
  ),
  (
    'Harvey Lin', 'Lin Pollution Litigation', 'Chicago', 'IL', ARRAY['Environmental Law'],
    14, 4.6::numeric, 47, 'HL', true,
    'Harvey Lin litigates contamination, Superfund contribution, and community exposure claims in the Chicago area.',
    'Contamination and Superfund litigation counsel',
    'https://www.linpollutionlaw.com', ARRAY['English','Mandarin'],
    'harvey@linpollutionlaw.com', '(312) 555-1803', 400::numeric, 200::numeric, 'available', 5::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Contamination','Superfund','Toxic Tort']
  ),

  -- Military Law (need +4)
  (
    'Col. (Ret.) James Harlan', 'Harlan Military Defense', 'Chicago', 'IL', ARRAY['Military Law'],
    22, 4.9::numeric, 104, 'JH', true,
    'Retired Colonel James Harlan defends service members in court-martial and administrative separation proceedings.',
    'Court-martial and military justice defense',
    'https://www.harlanmilitarydefense.com', ARRAY['English'],
    'james@harlanmilitarydefense.com', '(312) 555-1901', 400::numeric, 200::numeric, 'available', 2::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Court-Martial','Administrative Separation','UCMJ']
  ),
  (
    'Capt. (Ret.) Laura Kim', 'Kim VA Benefits Law', 'Chicago', 'IL', ARRAY['Military Law'],
    13, 4.7::numeric, 77, 'LK', true,
    'Laura Kim helps veterans with VA disability claims, appeals, and discharge upgrades.',
    'VA disability claims and discharge upgrades',
    'https://www.kimvabenefits.com', ARRAY['English','Korean'],
    'laura@kimvabenefits.com', '(312) 555-1902', 300::numeric, 0::numeric, 'available', 3::numeric,
    ARRAY['Illinois','Federal'], ARRAY['VA Disability','Appeals','Discharge Upgrades']
  ),
  (
    'Maj. (Ret.) Andre Brooks', 'Brooks Military Family Law', 'Chicago', 'IL', ARRAY['Military Law','Family Law'],
    16, 4.6::numeric, 68, 'AB', true,
    'Andre Brooks advises military families on divorce, custody, and SCRA protections while on active duty.',
    'Military divorce and SCRA family law counsel',
    'https://www.brooksmilitaryfamily.com', ARRAY['English'],
    'andre@brooksmilitaryfamily.com', '(312) 555-1903', 350::numeric, 150::numeric, 'available', 3::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Military Divorce','SCRA','Custody']
  ),
  (
    'Sgt. (Ret.) Nora Ellis', 'Ellis Veterans Advocacy', 'Chicago', 'IL', ARRAY['Military Law'],
    10, 4.5::numeric, 52, 'NE', true,
    'Nora Ellis represents veterans in benefits denials, caregiver issues, and military medical board matters.',
    'Veterans advocacy and medical board representation',
    'https://www.ellisveterans.com', ARRAY['English'],
    'nora@ellisveterans.com', '(312) 555-1904', 275::numeric, 0::numeric, 'available', 2::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Veterans Benefits','MEB','Caregiver']
  ),

  -- International Law (need +4)
  (
    'Isabelle Laurent', 'Laurent Cross-Border Law', 'Chicago', 'IL', ARRAY['International Law'],
    18, 4.8::numeric, 71, 'IL', true,
    'Isabelle Laurent advises companies on cross-border contracts, trade compliance, and international dispute resolution.',
    'Cross-border contracts and trade compliance',
    'https://www.laurentcrossborder.com', ARRAY['English','French'],
    'isabelle@laurentcrossborder.com', '(312) 555-2001', 450::numeric, 225::numeric, 'available', 4::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Trade Compliance','Cross-Border Contracts','Arbitration']
  ),
  (
    'Hiro Tanaka', 'Tanaka International Trade', 'Chicago', 'IL', ARRAY['International Law'],
    14, 4.6::numeric, 54, 'HT', true,
    'Hiro Tanaka focuses on customs, export controls, and international supply-chain agreements for Midwest exporters.',
    'Customs, export controls, and trade counsel',
    'https://www.tanakatrade.com', ARRAY['English','Japanese'],
    'hiro@tanakatrade.com', '(312) 555-2002', 425::numeric, 200::numeric, 'available', 3::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Customs','Export Controls','Supply Chain']
  ),
  (
    'Amira Haddad', 'Haddad Global Disputes', 'Chicago', 'IL', ARRAY['International Law'],
    12, 4.7::numeric, 46, 'AH', true,
    'Amira Haddad handles international commercial arbitration and enforcement of foreign judgments.',
    'International arbitration and judgment enforcement',
    'https://www.haddadglobaldisputes.com', ARRAY['English','Arabic'],
    'amira@haddadglobaldisputes.com', '(312) 555-2003', 475::numeric, 250::numeric, 'available', 5::numeric,
    ARRAY['Illinois','Federal'], ARRAY['Arbitration','Foreign Judgments','Commercial Disputes']
  ),
  (
    'Lucas Bergstrom', 'Bergstrom Treaty & Sanctions Law', 'Chicago', 'IL', ARRAY['International Law'],
    20, 4.8::numeric, 63, 'LB', true,
    'Lucas Bergstrom counsels clients on sanctions, OFAC compliance, and international treaty-related business issues.',
    'Sanctions and OFAC compliance attorney',
    'https://www.bergstromsanctions.com', ARRAY['English'],
    'lucas@bergstromsanctions.com', '(312) 555-2004', 500::numeric, 250::numeric, 'available', 4::numeric,
    ARRAY['Illinois','Federal'], ARRAY['OFAC','Sanctions','Treaty Compliance']
  )
) AS v(
  name, firm, city, state, practice_areas, experience_years, rating, review_count,
  avatar_initials, verified, bio, short_description, website_url, languages,
  email, phone, hourly_rate, consultation_fee, availability_status, avg_response_hours,
  jurisdictions, specialization_tags
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.lawyers l WHERE l.name = v.name AND l.firm = v.firm
);

-- Top up any remaining shortfalls (idempotent safety net using generated names)
DO $$
DECLARE
  areas text[] := ARRAY[
    'Immigration Law','Family Law','Criminal Defense','Personal Injury','Employment Law',
    'Business Law','Real Estate Law','Estate Planning','Civil Litigation','Bankruptcy',
    'Tax Law','Intellectual Property','Medical Malpractice','Consumer Protection',
    'Traffic Violations','Landlord Tenant','Education Law','Environmental Law',
    'Military Law','International Law'
  ];
  area text;
  have int;
  need int;
  i int;
BEGIN
  FOREACH area IN ARRAY areas LOOP
    SELECT count(*) INTO have
    FROM public.lawyers
    WHERE city = 'Chicago' AND practice_areas @> ARRAY[area];

    need := GREATEST(0, 5 - have);
    FOR i IN 1..need LOOP
      INSERT INTO public.lawyers (
        name, firm, city, state, practice_areas, experience_years, rating, review_count,
        avatar_initials, verified, bio, short_description, website_url, languages,
        email, phone, hourly_rate, consultation_fee, availability_status, avg_response_hours,
        jurisdictions, specialization_tags
      ) VALUES (
        'Chicago ' || area || ' Counsel ' || i,
        area || ' Partners of Chicago ' || i,
        'Chicago',
        'IL',
        ARRAY[area],
        8 + i,
        4.3 + (i * 0.1),
        30 + i * 7,
        upper(substr(regexp_replace(area, '[^A-Za-z]', '', 'g'), 1, 2)),
        true,
        'Experienced Chicago attorney focusing on ' || area || ' matters for individuals and businesses in Cook County.',
        'Chicago ' || area || ' attorney',
        'https://www.chicago' || lower(regexp_replace(area, '[^a-zA-Z0-9]+', '', 'g')) || i || '.com',
        ARRAY['English'],
        'intake' || i || '@chicago' || lower(regexp_replace(area, '[^a-zA-Z0-9]+', '', 'g')) || '.com',
        '(312) 555-' || lpad((2100 + i)::text, 4, '0'),
        300,
        125,
        'available',
        3,
        ARRAY['Illinois'],
        ARRAY[area]
      );
    END LOOP;
  END LOOP;
END $$;
