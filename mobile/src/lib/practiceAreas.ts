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
