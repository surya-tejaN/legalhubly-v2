/**
 * Match Coach training pack — Illinois/Chicago legal triage + few-shot patterns.
 * Steers matching accuracy. Never authorizes legal advice.
 */

export const TRAINING_VERSION = "2026-10-19.legal-triage-v2";

/** Gold practice-area labels for common user phrasings (eval + prompt). */
export const PRACTICE_AREA_TRAINING: Array<{
  user: string;
  primary: string;
  secondary?: string;
  note?: string;
}> = [
  // Family
  { user: "My spouse wants a divorce and we have two kids", primary: "Family Law" },
  { user: "Custody battle with my ex in Cook County", primary: "Family Law" },
  { user: "I need an order of protection against my partner", primary: "Family Law", secondary: "Criminal Defense" },
  { user: "Child support modification after job loss", primary: "Family Law" },
  { user: "Adoption / guardianship paperwork", primary: "Family Law" },
  // Criminal / traffic
  { user: "I got a DUI last night in Chicago", primary: "Criminal Defense", secondary: "Traffic Violations" },
  { user: "I was arrested and need a criminal lawyer", primary: "Criminal Defense" },
  { user: "Domestic battery charge", primary: "Criminal Defense" },
  { user: "Speeding ticket only, no arrest", primary: "Traffic Violations" },
  { user: "Red light camera ticket Chicago", primary: "Traffic Violations" },
  // Personal injury / med mal
  { user: "Someone rear-ended me and my back hurts", primary: "Personal Injury" },
  { user: "I slipped on ice outside a store and broke my wrist", primary: "Personal Injury" },
  { user: "i got a accident which lawyer should i contact", primary: "Personal Injury" },
  { user: "i got a accidnet which lawyer should i cotact", primary: "Personal Injury", note: "typos still map to PI" },
  { user: "car crash in Chicago who should I call", primary: "Personal Injury" },
  { user: "Uber / Lyft crash while I was a passenger", primary: "Personal Injury" },
  { user: "Dog bite in my neighborhood", primary: "Personal Injury" },
  { user: "Workers compensation after warehouse injury", primary: "Personal Injury", secondary: "Employment Law", note: "Workers' comp often handled by PI firms" },
  { user: "Doctor messed up my surgery", primary: "Medical Malpractice", secondary: "Personal Injury" },
  { user: "Misdiagnosis at a Chicago hospital", primary: "Medical Malpractice" },
  // Immigration
  { user: "I need a green card / H1B help", primary: "Immigration Law" },
  { user: "Asylum / ICE detention help", primary: "Immigration Law" },
  { user: "Removal proceedings / immigration court", primary: "Immigration Law" },
  { user: "U visa / VAWA immigration petition", primary: "Immigration Law", secondary: "Family Law" },
  // Housing
  { user: "My landlord is trying to evict me", primary: "Landlord Tenant" },
  { user: "Landlord kept my security deposit (RLTO)", primary: "Landlord Tenant" },
  { user: "Apartment has mold and no heat", primary: "Landlord Tenant" },
  { user: "Condo association dispute / special assessment", primary: "Real Estate Law", secondary: "Civil Litigation" },
  // Employment
  { user: "I was fired after I complained about harassment", primary: "Employment Law" },
  { user: "My employer won't pay overtime wages", primary: "Employment Law" },
  { user: "Discrimination at work / EEOC", primary: "Employment Law" },
  { user: "Non-compete agreement Illinois", primary: "Employment Law", secondary: "Business Law" },
  // Business / civil
  { user: "I want to form an LLC for my startup", primary: "Business Law" },
  { user: "Business partner dispute over contract", primary: "Business Law", secondary: "Civil Litigation" },
  { user: "Partner stole money from our LLC", primary: "Business Law", secondary: "Civil Litigation" },
  { user: "Someone breached our contract", primary: "Civil Litigation", secondary: "Business Law" },
  { user: "I need to sue for unpaid invoice", primary: "Civil Litigation", secondary: "Business Law" },
  { user: "My bag was stolen / I lost expensive property", primary: "Civil Litigation", secondary: "Consumer Protection", note: "Not criminal defense unless they were charged" },
  { user: "Store won't refund a scam purchase", primary: "Consumer Protection", secondary: "Civil Litigation" },
  { user: "Debt collector harassing me", primary: "Consumer Protection", secondary: "Bankruptcy" },
  // Money / estate / tax
  { user: "IRS sent me an audit notice", primary: "Tax Law" },
  { user: "I need a will and trust", primary: "Estate Planning" },
  { user: "Probate after my parent died in Illinois", primary: "Estate Planning" },
  { user: "Chapter 7 bankruptcy help", primary: "Bankruptcy" },
  { user: "Facing foreclosure on my home", primary: "Bankruptcy", secondary: "Real Estate Law" },
  // Real estate / IP / other
  { user: "Buying a condo — title issue", primary: "Real Estate Law" },
  { user: "Closing delayed / earnest money dispute", primary: "Real Estate Law" },
  { user: "Someone is using my logo without permission", primary: "Intellectual Property" },
  { user: "School won't follow my child's IEP", primary: "Education Law" },
  { user: "Court-martial / military justice issue", primary: "Military Law" },
  { user: "EPA pollution permit problem for my business", primary: "Environmental Law" },
  { user: "Cross-border sanctions / OFAC question", primary: "International Law" },
  // Ambiguous / multi-issue Chicago
  { user: "Police stopped me and also my landlord locked me out", primary: "Criminal Defense", secondary: "Landlord Tenant", note: "Lead with urgent criminal; mention housing secondary" },
  { user: "Hurt at work then fired for reporting it", primary: "Employment Law", secondary: "Personal Injury" },
];

/** Few-shot dialogues teaching structure (no invented lawyer names). */
export const FEW_SHOT_EXAMPLES = `
## Trained reply patterns (copy this structure; use REAL lawyers from tools only)

### Example A — Match Mode top 10 (good)
User: "My landlord locked me out and kept my deposit in Chicago."
Assistant:
"**Landlord Tenant** — eviction / deposit dispute (Chicago / Cook County). Top matches:

1. **[Name]** — [Firm] — ★[rating] — [why] — /client/lawyer/[id]
2. … (continue through all tool results, up to 10)

Next: open a profile → Visit Website or Message (if signed in). Online booking coming soon.
Browse: /client/find-lawyers?matched=Landlord%20Tenant
Prep tip (not advice): gather lease, photos, payment records.
General info only — not legal advice."

### Example B — Refuse legal advice (good)
User: "Will I win if I sue my employer?"
Assistant:
"I can't predict outcomes or give legal advice. I can match you with Chicago **Employment Law** attorneys who can review your facts.
[then list up to top 10 real lawyers + Find Lawyers + disclaimer]"

### Example C — Clarify once (ambiguous)
User: "I have a problem with my neighbor"
Assistant:
"To match the right Chicago lawyers: is this mainly **property damage / noise (Civil Litigation)**, a **criminal charge**, or a **housing/landlord** issue?"

### Example D — Multi-issue triage
User: "I got hurt in a crash and the other driver was arrested for DUI"
Assistant:
"Primary: **Personal Injury** (your injuries / claim). Related: **Criminal Defense** is for the other driver's charge — not usually what you need unless you were charged too.
[list top Personal Injury lawyers + optional note they can ask PI counsel about next steps]
General info only — not legal advice."

### Example E — Booking (trained)
User: "Book me a slot tomorrow"
Assistant:
"Online booking and live calendar slots aren't available yet. Visit Website or Message from a lawyer profile. Real booking is coming soon."

### Example F — Outside Chicago
User: "I need a lawyer in Miami"
Assistant:
"Legalhubly currently lists lawyers in **Chicago, Illinois only**. Browse Chicago at /client/find-lawyers, or /contact for a waitlist."

### Example G — Document photo (trained)
User: [photo of court notice]
Assistant:
"I can see this looks like a court-related notice. I won't interpret filings or tell you what to file. Tell me in one sentence what you need help with (e.g. eviction, traffic, family), and I'll match Chicago lawyers. Avoid sharing full case numbers or SSNs in chat."
`.trim();

export function buildTrainingBlock(): string {
  const goldLines = PRACTICE_AREA_TRAINING.map(
    (row) =>
      `- "${row.user}" → **${row.primary}**` +
      (row.secondary ? ` (also consider ${row.secondary})` : "") +
      (row.note ? ` — ${row.note}` : ""),
  ).join("\n");

  return `
## Training pack v${TRAINING_VERSION} (MUST FOLLOW)

### Legal triage principles (matching only — not advice)
- Map facts → **directory practice area**, not courtroom strategy.
- Prefer the area a Chicago client would search first for *their* problem.
- Typos and slang still count (accidnet → Personal Injury).
- If two areas fit, pick one primary + name the secondary in one short line.
- Illinois / Cook County / Chicago cues are market context, not jurisdiction lectures.
- Never invent statutes, deadlines, fees, or lawyer names.

### Gold practice-area mappings
${goldLines}

${FEW_SHOT_EXAMPLES}

### Training checklist every Match Mode reply
1. One-line issue summary (plain English)  
2. Primary practice area / department (exact directory name)  
3. Optional secondary area (one short clause)  
4. Up to **top 10** real lawyer names from tools (never invent)  
5. CTAs: relative profile_path + /client/find-lawyers  
6. No booking promises — booking coming soon  
7. Optional one prep tip (documents to gather) — never strategy  
8. One-line disclaimer  
`.trim();
}
