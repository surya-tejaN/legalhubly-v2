import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Category-to-practice mapping ────────────────────────────────────────────
const CATEGORY_TO_PRACTICE: Record<string, string[]> = {
  "Personal Injury": ["Personal Injury", "Civil Litigation", "Medical Malpractice"],
  "Immigration": ["Immigration Law", "Asylum", "Visa Services"],
  "Family": ["Family Law", "Divorce", "Child Custody"],
  "Criminal": ["Criminal Defense", "DUI", "White Collar Crime"],
  "Employment": ["Employment Law", "Labor Law", "Workplace Discrimination"],
  "Business": ["Business Law", "Corporate Law", "Contract Law"],
  "Real Estate": ["Real Estate Law", "Property Law", "Land Use"],
  "Estate Planning": ["Estate Planning", "Trusts", "Probate"],
  "Civil Litigation": ["Civil Litigation", "Personal Injury"],
  "IP": ["Intellectual Property", "Patent Law", "Trademark Law"],
};

// ─── Ranking weights (total = 100) ───────────────────────────────────────────
const WEIGHTS = {
  years_experience: 20,
  rating: 25,
  review_count: 10,
  response_time: 15,
  profile_completion: 10,
  location_proximity: 20,
} as const;

// ─── Safe number helper ──────────────────────────────────────────────────────
function safeNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

// ─── Profile completeness scorer ─────────────────────────────────────────────
function computeProfileCompletion(lawyer: any): number {
  if (!lawyer) return 0;
  const fields = [
    { key: "bio", weight: 20 },
    { key: "consultation_fee", weight: 10, check: (v: any) => v != null },
    { key: "hourly_rate", weight: 10, check: (v: any) => v != null },
    { key: "practice_areas", weight: 15, check: (v: any) => Array.isArray(v) && v.length > 0 },
    { key: "languages", weight: 10, check: (v: any) => Array.isArray(v) && v.length > 0 },
    { key: "jurisdictions", weight: 10, check: (v: any) => Array.isArray(v) && v.length > 0 },
    { key: "specialization_tags", weight: 5, check: (v: any) => Array.isArray(v) && v.length > 0 },
    { key: "consultation_types", weight: 10, check: (v: any) => Array.isArray(v) && v.length > 0 },
    { key: "city", weight: 5 },
    { key: "state", weight: 5 },
  ];

  let earned = 0;
  let total = 0;
  for (const f of fields) {
    total += f.weight;
    const val = lawyer[f.key];
    const present = f.check ? f.check(val) : Boolean(val);
    if (present) earned += f.weight;
  }
  return total > 0 ? Math.round((earned / total) * 100) : 0;
}

// ─── Main ranking algorithm ──────────────────────────────────────────────────
function computeMatchScore(
  lawyer: any,
  criteria: any,
): { score: number; breakdown: Record<string, number>; is_top_match: boolean } {
  if (!lawyer) return { score: 0, breakdown: {}, is_top_match: false };

  const breakdown: Record<string, number> = {};

  // 1. Years of experience (weight: 20)
  const years = safeNum(lawyer.experience_years);
  if (years >= 25) breakdown.years_experience = 20;
  else if (years >= 15) breakdown.years_experience = 16;
  else if (years >= 10) breakdown.years_experience = 12;
  else if (years >= 5) breakdown.years_experience = 8;
  else if (years >= 2) breakdown.years_experience = 4;
  else breakdown.years_experience = 1;

  // 2. Rating (weight: 25)
  const rating = safeNum(lawyer.rating);
  if (rating >= 4.9) breakdown.rating = 25;
  else if (rating >= 4.7) breakdown.rating = 22;
  else if (rating >= 4.5) breakdown.rating = 18;
  else if (rating >= 4.0) breakdown.rating = 14;
  else if (rating >= 3.5) breakdown.rating = 8;
  else breakdown.rating = 2;

  // 3. Review count (weight: 10)
  const reviews = safeNum(lawyer.review_count);
  if (reviews >= 100) breakdown.review_count = 10;
  else if (reviews >= 50) breakdown.review_count = 8;
  else if (reviews >= 20) breakdown.review_count = 6;
  else if (reviews >= 5) breakdown.review_count = 4;
  else if (reviews >= 1) breakdown.review_count = 2;
  else breakdown.review_count = 0;

  // 4. Response time (weight: 15)
  const hours = safeNum(lawyer.avg_response_hours, 48);
  if (hours <= 1) breakdown.response_time = 15;
  else if (hours <= 2) breakdown.response_time = 13;
  else if (hours <= 4) breakdown.response_time = 10;
  else if (hours <= 8) breakdown.response_time = 7;
  else if (hours <= 24) breakdown.response_time = 4;
  else breakdown.response_time = 1;

  // 5. Profile completion (weight: 10)
  const completionPct = computeProfileCompletion(lawyer);
  breakdown.profile_completion = Math.round((completionPct / 100) * WEIGHTS.profile_completion);

  // 6. Location proximity (weight: 20)
  if (criteria?.location) {
    const loc = criteria.location.toLowerCase();
    const cityMatch = lawyer.city && loc.includes(lawyer.city.toLowerCase());
    const stateMatch = lawyer.state && loc.includes(lawyer.state.toLowerCase());
    const jurisdictionMatch = (lawyer.jurisdictions || []).some(
      (j: string) => loc.includes(j.toLowerCase()),
    );
    breakdown.location_proximity = cityMatch ? 20 : stateMatch || jurisdictionMatch ? 14 : 5;
  } else {
    breakdown.location_proximity = 10; // neutral when no location provided
  }

  // Sum
  const total = Object.values(breakdown).reduce((s, v) => s + safeNum(v), 0);
  const maxPossible = Object.values(WEIGHTS).reduce((s, v) => s + v, 0); // 100
  const score = Math.min(100, Math.round((total / maxPossible) * 100));
  const is_top_match = score >= 85;

  return { score, breakdown, is_top_match };
}

// ─── Human-readable explanation ──────────────────────────────────────────────
function buildExplanation(lawyer: any, breakdown: Record<string, number>, criteria: any): string {
  const parts: string[] = [];

  if (breakdown.years_experience >= 16)
    parts.push(`${safeNum(lawyer.experience_years)}+ years of experience`);
  if (breakdown.rating >= 18)
    parts.push(`Highly rated (${safeNum(lawyer.rating).toFixed(1)}★)`);
  if (breakdown.review_count >= 6)
    parts.push(`${safeNum(lawyer.review_count)} verified reviews`);
  if (breakdown.response_time >= 10)
    parts.push(`Fast response (~${formatHours(safeNum(lawyer.avg_response_hours, 24))})`);
  if (breakdown.profile_completion >= 8)
    parts.push("Complete profile");
  if (breakdown.location_proximity >= 16)
    parts.push(`Located in ${[lawyer.city, lawyer.state].filter(Boolean).join(", ") || "your area"}`);
  else if (breakdown.location_proximity >= 10)
    parts.push(`Licensed in ${lawyer.state || "your region"}`);

  if (criteria?.language_preference) {
    const speaks = (lawyer.languages || []).some(
      (l: string) => l.toLowerCase() === criteria.language_preference.toLowerCase(),
    );
    if (speaks) parts.push(`Speaks ${criteria.language_preference}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "General match based on profile";
}

function formatHours(hours: number): string {
  if (hours < 1) return "< 1hr";
  if (hours <= 2) return `${hours}hr`;
  if (hours <= 24) return `${Math.round(hours)}hr`;
  return `${Math.round(hours / 24)}d`;
}

// ─── Server ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const criteria = body.criteria || {};
    const sort_by = body.sort_by || "best_match";
    const filters = body.filters || {};

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query with filters
    let query = supabase.from("lawyers").select("*");

    if (filters.practice_area && filters.practice_area !== "All") {
      query = query.contains("practice_areas", [filters.practice_area]);
    }
    if (filters.state) {
      query = query.eq("state", filters.state);
    }
    if (filters.verified === true) {
      query = query.eq("verified", true);
    }
    if (filters.max_consultation_fee != null) {
      query = query.lte("consultation_fee", filters.max_consultation_fee);
    }
    if (filters.language) {
      query = query.contains("languages", [filters.language]);
    }
    if (filters.availability === "available") {
      query = query.eq("availability_status", "available");
    }

    const { data: lawyers, error } = await query;
    if (error) throw error;

    // Empty dataset → return early with empty flag
    if (!lawyers || lawyers.length === 0) {
      return new Response(
        JSON.stringify({ lawyers: [], empty: true, message: "No lawyers available yet in this location." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Score & annotate
    const scored = lawyers.map((lawyer) => {
      const { score, breakdown, is_top_match } = computeMatchScore(lawyer, criteria);
      return {
        ...lawyer,
        match_score: score,
        score_breakdown: breakdown,
        is_top_match,
        profile_completion: computeProfileCompletion(lawyer),
        match_explanation: buildExplanation(lawyer, breakdown, criteria),
        ai_disclaimer: "Match scores are algorithm-generated estimates. Verify fit during consultation.",
      };
    });

    // Sort
    scored.sort((a, b) => {
      switch (sort_by) {
        case "fastest_response":
          return safeNum(a.avg_response_hours, 99) - safeNum(b.avg_response_hours, 99);
        case "lowest_fee":
          return safeNum(a.consultation_fee, 999) - safeNum(b.consultation_fee, 999);
        case "highest_experience":
          return safeNum(b.experience_years) - safeNum(a.experience_years);
        case "highest_rated":
          return safeNum(b.rating) - safeNum(a.rating);
        default: // best_match
          return b.match_score - a.match_score;
      }
    });

    return new Response(
      JSON.stringify({ lawyers: scored, empty: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("match-lawyers error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", lawyers: [], empty: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
