/**
 * Offline practice-area training checks for Match Coach heuristics.
 * Keep in sync with supabase/functions/_shared/match_tools.ts inferPracticeTriage.
 * Run: node scripts/match-coach-eval.mjs
 */

function inferPracticeArea(text) {
  const t = text.toLowerCase();

  if (
    /\b(visa|green card|asylum|immigration|deport|h-?1b|uscis|daca|removal proceeding|u-?visa|vawa)\b/.test(t) ||
    /\bice (detention|hold|raid)\b/.test(t)
  ) {
    return "Immigration Law";
  }
  if (
    /\b(divorce|custody|child support|dcfs|alimony|spouse|prenup|adoption|guardianship|order of protection)\b/.test(t)
  ) {
    return "Family Law";
  }
  if (/\b(court-?martial|military justice|ucmj|va benefits)\b/.test(t)) return "Military Law";
  const hasCriminalSignal =
    /\b(arrested|warrant|felony|misdemeanor|was charged|bail|assault|domestic battery)\b/.test(t) ||
    (/\barrest\b/.test(t) && !/\bno arrest\b/.test(t));
  if (hasCriminalSignal) return "Criminal Defense";
  if (/\bdui\b/.test(t) && !/\bticket only\b/.test(t)) return "Criminal Defense";
  if (/\b(ticket|traffic|speeding|red light|camera ticket)\b/.test(t) && !/\bdui\b/.test(t)) {
    return "Traffic Violations";
  }
  if (
    /\b(medical malpractice|surgical error|hospital negligence|birth injury|botched surgery|messed up my surgery|misdiagnosis|doctor (errored|negligent))\b/.test(t) ||
    (/\b(surgery|surgeon|hospital)\b/.test(t) && /\b(messed up|malpractice|negligence|error)\b/.test(t))
  ) {
    return "Medical Malpractice";
  }
  if (
    /\b(injury|injur|car crash|accident|accidnet|acident|accidents|slip|fall|hurt|rear-?ended|broke my|whiplash|car wreck|hit by|hit and run|dog bite|workers?\s*comp)\b/.test(t) ||
    /\baccid/.test(t) ||
    (/\b(crash|wreck|collision)\b/.test(t) && !/\b(plane|stock|data)\b/.test(t))
  ) {
    return "Personal Injury";
  }
  if (
    /\b(fired|harassment|wage|employer|wrongful|overtime|discrimination|eeoc|non-?compete)\b/.test(t)
  ) {
    return "Employment Law";
  }
  if (/\b(evict|landlord|tenant|security deposit|rlto|lockout|no heat|mold)\b/.test(t)) {
    return "Landlord Tenant";
  }
  if (/\b(will|trust|probate|estate planning|power of attorney)\b/.test(t)) {
    return "Estate Planning";
  }
  if (/\b(irs|tax audit|tax debt)\b/.test(t)) return "Tax Law";
  if (/\b(chapter\s*7|chapter\s*13|bankruptcy|foreclosure)\b/.test(t)) return "Bankruptcy";
  if (/\b(condo|title|zoning|mortgage|closing|real estate|hoa|earnest money)\b/.test(t)) {
    return "Real Estate Law";
  }
  if (/\b(patent|trademark|copyright|trade secret|\bip\b|logo)\b/.test(t)) {
    return "Intellectual Property";
  }
  if (/\b(iep|title ix|504|student rights)\b/.test(t)) return "Education Law";
  if (/\b(epa|pollution|environmental|brownfield)\b/.test(t)) return "Environmental Law";
  if (/\b(ofac|sanctions|cross-border|international law|customs)\b/.test(t)) {
    return "International Law";
  }
  if (/\b(refund|warranty|scam|recall|consumer|debt collector|debt collection)\b/.test(t)) {
    return "Consumer Protection";
  }
  if (/\b(llc|startup|partnership|shareholder|business|non-?compete)\b/.test(t)) {
    return "Business Law";
  }
  if (/\b(contract|partner dispute|unpaid invoice)\b/.test(t)) return "Business Law";
  if (/\b(stolen|theft|thief|lost bag|lost property|purse stolen)\b/.test(t)) {
    return "Civil Litigation";
  }
  if (/\b(lawsuit|sue|litigation|dispute|mediation|breach)\b/.test(t)) return "Civil Litigation";
  return "Civil Litigation";
}

const CASES = [
  ["My spouse wants a divorce and we have two kids", "Family Law"],
  ["Custody battle with my ex", "Family Law"],
  ["I got a DUI last night in Chicago", "Criminal Defense"],
  ["I was arrested and need a criminal lawyer", "Criminal Defense"],
  ["Someone rear-ended me and my back hurts", "Personal Injury"],
  ["I slipped on ice outside a store and broke my wrist", "Personal Injury"],
  ["i got a accidnet which lawyer should i cotact", "Personal Injury"],
  ["Uber / Lyft crash while I was a passenger", "Personal Injury"],
  ["I need a green card / H1B help", "Immigration Law"],
  ["Asylum / ICE detention help", "Immigration Law"],
  ["My landlord is trying to evict me", "Landlord Tenant"],
  ["Landlord kept my security deposit", "Landlord Tenant"],
  ["I was fired after I complained about harassment", "Employment Law"],
  ["My employer won't pay overtime wages", "Employment Law"],
  ["I want to form an LLC for my startup", "Business Law"],
  ["Business partner dispute over contract", "Business Law"],
  ["IRS sent me an audit notice", "Tax Law"],
  ["I need a will and trust", "Estate Planning"],
  ["Probate after my parent died", "Estate Planning"],
  ["Doctor messed up my surgery", "Medical Malpractice"],
  ["Speeding ticket only, no arrest", "Traffic Violations"],
  ["My bag was stolen", "Civil Litigation"],
  ["Store won't refund a scam purchase", "Consumer Protection"],
  ["Buying a condo — title issue", "Real Estate Law"],
  ["Chapter 7 bankruptcy help", "Bankruptcy"],
  ["Someone is using my logo without permission", "Intellectual Property"],
  ["School won't follow my child's IEP", "Education Law"],
  ["Court-martial / military justice issue", "Military Law"],
  ["EPA pollution permit problem for my business", "Environmental Law"],
  ["Cross-border sanctions / OFAC question", "International Law"],
];

let pass = 0;
for (const [user, expected] of CASES) {
  const got = inferPracticeArea(user);
  const ok = got === expected;
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${expected.padEnd(22)} | got=${got.padEnd(22)} | ${user}`);
}
console.log(`\nFINAL: ${pass}/${CASES.length} passed (training v2026-10-19.legal-triage-v2)`);
process.exit(pass === CASES.length ? 0 : 1);
