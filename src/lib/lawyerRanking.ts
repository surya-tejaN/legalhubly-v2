/** Deterministic Chicago lawyer ranking + human “why this match” reasons. */

export type RankableLawyer = {
  id: string;
  name: string;
  firm: string;
  practice_areas?: string[] | null;
  rating?: number | null;
  review_count?: number | null;
  experience_years?: number | null;
  avg_response_hours?: number | null;
  availability_status?: string | null;
  verified?: boolean | null;
  short_description?: string | null;
  bio?: string | null;
};

export type RankedLawyer<T extends RankableLawyer = RankableLawyer> = T & {
  match_score: number;
  why_match: string[];
};

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Score 0–100 for practice-area match + quality signals. */
export function scoreLawyer(
  lawyer: RankableLawyer,
  opts?: { practiceArea?: string; query?: string },
): { score: number; why: string[] } {
  const why: string[] = [];
  let score = 0;

  const areas = lawyer.practice_areas || [];
  const practiceArea = opts?.practiceArea?.trim();
  if (practiceArea && areas.includes(practiceArea)) {
    score += 40;
    why.push(`Practices ${practiceArea}`);
  } else if (practiceArea && areas.some((a) => a.toLowerCase().includes(practiceArea.toLowerCase()))) {
    score += 28;
    why.push("Related practice area");
  } else if (!practiceArea) {
    score += 15;
  }

  if (lawyer.verified) {
    score += 12;
    why.push("Verified listing");
  }

  const rating = safeNum(lawyer.rating);
  if (rating >= 4.8) {
    score += 18;
    why.push(`${rating.toFixed(1)}★ top rated`);
  } else if (rating >= 4.5) {
    score += 14;
    why.push(`${rating.toFixed(1)}★ rated`);
  } else if (rating >= 4.0) {
    score += 8;
  }

  const reviews = safeNum(lawyer.review_count);
  if (reviews >= 50) {
    score += 8;
    why.push(`${reviews} reviews`);
  } else if (reviews >= 10) {
    score += 5;
  }

  const years = safeNum(lawyer.experience_years);
  if (years >= 15) {
    score += 8;
    why.push(`${years}+ years experience`);
  } else if (years >= 8) {
    score += 5;
  }

  const hours = safeNum(lawyer.avg_response_hours, 48);
  if (hours > 0 && hours <= 4) {
    score += 6;
    why.push("Fast response");
  } else if (hours <= 24) {
    score += 3;
  }

  if (lawyer.availability_status === "available") {
    score += 6;
    why.push("Available to book");
  } else if (lawyer.availability_status === "busy") {
    score += 2;
  }

  const q = opts?.query?.toLowerCase().trim();
  if (q) {
    const hay = [lawyer.name, lawyer.firm, lawyer.short_description, lawyer.bio, ...areas]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const tokens = q.split(/\s+/).filter((t) => t.length > 2);
    const hits = tokens.filter((t) => hay.includes(t)).length;
    if (hits > 0) {
      score += Math.min(8, hits * 3);
      why.push("Matches your keywords");
    }
  }

  score = Math.min(100, Math.round(score));
  if (why.length === 0) why.push("Chicago directory match");
  return { score, why: why.slice(0, 3) };
}

export function rankLawyers<T extends RankableLawyer>(
  lawyers: T[],
  opts?: { practiceArea?: string; query?: string; limit?: number },
): RankedLawyer<T>[] {
  const ranked = lawyers.map((l) => {
    const { score, why } = scoreLawyer(l, opts);
    return { ...l, match_score: score, why_match: why };
  });
  ranked.sort((a, b) => b.match_score - a.match_score || safeNum(b.rating) - safeNum(a.rating));
  const limit = opts?.limit;
  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
