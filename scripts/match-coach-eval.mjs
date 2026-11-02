/**
 * Offline checks for Match Coach heuristics — imports the real edge-function code.
 * Run: node scripts/match-coach-eval.mjs   (Node 22.18+ for .ts type stripping)
 */
import {
  detectPreferences,
  detectUrgency,
  inferPracticeArea,
  inferTriageFromConversation,
  isFollowUpMatchRequest,
  wantsLawyerMatch,
} from "../supabase/functions/_shared/match_tools.ts";
import { TRAINING_VERSION } from "../supabase/functions/_shared/support_training.ts";

const AREA_CASES = [
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
  ["Necesito un abogado de inmigración", "Immigration Law"],
  ["Mi casero quiere un desalojo", "Landlord Tenant"],
  ["Tuve un accidente de carro", "Personal Injury"],
];

const CONVERSATION_CASES = [
  [["My landlord won't return my deposit", "yes find me one"], "Landlord Tenant"],
  [["I was rear-ended on Lake Shore Drive", "ok show me lawyers"], "Personal Injury"],
  [["My wife filed for divorce", "My bag was stolen"], "Civil Litigation"],
];

const checks = [];
const check = (ok, label) => checks.push([ok, label]);

for (const [user, expected] of AREA_CASES) {
  const got = inferPracticeArea(user);
  check(got === expected, `area   | ${expected.padEnd(22)} | got=${got.padEnd(22)} | ${user}`);
}
for (const [turns, expected] of CONVERSATION_CASES) {
  const got = inferTriageFromConversation(turns).primary;
  check(got === expected, `memory | ${expected.padEnd(22)} | got=${got.padEnd(22)} | ${turns.join(" → ")}`);
}

check(isFollowUpMatchRequest("yes find me one"), "followup | 'yes find me one' is a follow-up");
check(!isFollowUpMatchRequest("How do I change my password on the app?"), "followup | product FAQ is not a follow-up");
check(wantsLawyerMatch("I was in a car accident"), "match    | accident triggers Match Mode");

check(detectUrgency("My boyfriend is hitting me right now")?.level === "emergency", "urgency | abuse in progress → emergency");
check(detectUrgency("I want to kill myself")?.reasons.includes("self_harm"), "urgency | self-harm → 988");
check(detectUrgency("My court hearing is tomorrow")?.level === "time_sensitive", "urgency | hearing tomorrow → time-sensitive");
check(detectUrgency("ICE detained my brother")?.level === "time_sensitive", "urgency | ICE detention → time-sensitive");
check(detectUrgency("I got a 5-day notice from my landlord")?.level === "time_sensitive", "urgency | 5-day notice → time-sensitive");
check(detectUrgency("I want to form an LLC") === null, "urgency | LLC → none");

check(detectPreferences("I need a lawyer who speaks Spanish").language === "Spanish", "prefs | speaks Spanish");
check(detectPreferences("Necesito un abogado").language === "Spanish", "prefs | Spanish text → Spanish");
check(detectPreferences("I can't afford much, free consultation?").budgetSensitive, "prefs | budget-sensitive");
check(!detectPreferences("Divorce lawyer in Chicago").budgetSensitive, "prefs | no budget signal");

let pass = 0;
for (const [ok, label] of checks) {
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${label}`);
}
console.log(`\nFINAL: ${pass}/${checks.length} passed (training v${TRAINING_VERSION})`);
process.exit(pass === checks.length ? 0 : 1);
