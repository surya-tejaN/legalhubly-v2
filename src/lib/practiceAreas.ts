/** Canonical practice-area labels used in the lawyers.practice_areas column. */

export const PRACTICE_AREAS = [
  "Immigration Law",
  "Family Law",
  "Criminal Defense",
  "Personal Injury",
  "Employment Law",
  "Business Law",
  "Real Estate Law",
  "Estate Planning",
  "Civil Litigation",
  "Bankruptcy",
  "Tax Law",
  "Intellectual Property",
  "Medical Malpractice",
  "Consumer Protection",
  "Traffic Violations",
  "Landlord Tenant",
  "Education Law",
  "Environmental Law",
  "Military Law",
  "International Law",
] as const;

export type PracticeArea = (typeof PRACTICE_AREAS)[number];

/** Homepage / marketing labels → DB practice area strings */
export const CATEGORY_TO_PRACTICE: Record<string, string> = {
  Immigration: "Immigration Law",
  "Divorce & Family": "Family Law",
  "Criminal Defense": "Criminal Defense",
  "Personal Injury": "Personal Injury",
  "Employment Law": "Employment Law",
  "Business Law": "Business Law",
  "Real Estate": "Real Estate Law",
  "Estate Planning": "Estate Planning",
  "Civil Litigation": "Civil Litigation",
  Bankruptcy: "Bankruptcy",
  "Tax Law": "Tax Law",
  "Intellectual Property": "Intellectual Property",
  "Medical Malpractice": "Medical Malpractice",
  "Consumer Protection": "Consumer Protection",
  "Traffic Violations": "Traffic Violations",
  "Landlord / Tenant": "Landlord Tenant",
  "Education Law": "Education Law",
  "Environmental Law": "Environmental Law",
  "Military Law": "Military Law",
  "International Law": "International Law",
};

export const KEYWORD_MAP: Record<string, string[]> = {
  "Immigration Law": [
    "visa", "immigration", "green card", "asylum", "deportation", "citizenship",
    "h1b", "work permit", "uscis", "daca", "tps",
  ],
  "Family Law": [
    "divorce", "custody", "child support", "adoption", "family", "separation",
    "alimony", "prenup", "marriage",
  ],
  "Criminal Defense": [
    "criminal", "crime", "arrest", "felony", "misdemeanor", "dui", "drug",
    "theft", "assault", "bail", "traffic", "ticket",
  ],
  "Personal Injury": [
    "injury", "injur", "accident", "accidnet", "acident", "accidents", "slip", "fall",
    "car accident", "car crash", "crash", "wreck", "collision", "negligence", "hurt",
    "damaged", "rear-ended", "whiplash", "hit by",
  ],
  "Employment Law": [
    "fired", "wrongful termination", "discrimination", "harassment", "employment",
    "workplace", "wage", "overtime", "employer",
  ],
  "Business Law": [
    "business", "contract", "llc", "corporation", "startup", "partnership",
    "merger", "acquisition", "commercial",
  ],
  "Real Estate Law": [
    "real estate", "property", "lease", "landlord", "tenant", "zoning",
    "eviction", "rent", "house", "mortgage", "closing",
  ],
  "Estate Planning": [
    "will", "trust", "probate", "estate", "inheritance", "beneficiary",
    "power of attorney",
  ],
  "Civil Litigation": [
    "lawsuit", "sue", "court", "dispute", "mediation", "arbitration",
    "litigation", "claim",
  ],
  Bankruptcy: [
    "bankruptcy", "debt", "chapter 7", "chapter 13", "foreclosure", "creditor",
    "collection",
  ],
  "Tax Law": ["tax", "irs", "audit", "tax planning", "tax dispute"],
  "Intellectual Property": [
    "patent", "trademark", "copyright", "intellectual property", "ip", "trade secret",
  ],
  "Medical Malpractice": [
    "medical malpractice", "surgical error", "hospital negligence", "birth injury",
  ],
  "Consumer Protection": ["fraud", "warranty", "recall", "consumer", "scam"],
  "Traffic Violations": [
    "traffic", "ticket", "speeding", "red light", "license suspension", "dui", "cdl",
  ],
  "Landlord Tenant": ["eviction", "security deposit", "landlord", "tenant", "lease", "rlto"],
  "Education Law": ["iep", "title ix", "school", "student rights", "504"],
  "Environmental Law": ["epa", "pollution", "environmental", "brownfield", "permit"],
  "Military Law": ["court-martial", "va benefits", "military", "veteran", "ucmj"],
  "International Law": ["international", "sanctions", "ofac", "customs", "cross-border", "treaty"],
};

/** Prefer more specific areas when several keywords fire. */
const AREA_PRIORITY = [
  "Personal Injury",
  "Medical Malpractice",
  "Immigration Law",
  "Family Law",
  "Criminal Defense",
  "Landlord Tenant",
  "Employment Law",
  "Traffic Violations",
  "Bankruptcy",
  "Estate Planning",
  "Real Estate Law",
  "Business Law",
  "Tax Law",
  "Intellectual Property",
  "Consumer Protection",
  "Education Law",
  "Environmental Law",
  "Military Law",
  "International Law",
  "Civil Litigation",
];

/** Map free-text issue → DB practice area labels for Smart Match. */
export function matchPracticeAreas(input: string): string[] {
  const lower = input.toLowerCase();
  const matches: string[] = [];
  for (const [area, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matches.push(area);
    }
  }
  // Typo-friendly PI signal even if keyword list missed it
  if (!matches.includes("Personal Injury") && /\baccid/.test(lower)) {
    matches.unshift("Personal Injury");
  }
  return matches.sort((a, b) => {
    const ia = AREA_PRIORITY.indexOf(a);
    const ib = AREA_PRIORITY.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

export function categoryLabelToPractice(label: string): string {
  return CATEGORY_TO_PRACTICE[label] || label;
}
