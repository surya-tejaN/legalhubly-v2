import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const MATCH_COACH_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_chicago_lawyers",
      description:
        "REQUIRED in Match Mode. Search real Chicago lawyers on Legalhubly by practice area. Returns directory rows with names, firms, ratings, and profile paths. Always call this before listing attorneys.",
      parameters: {
        type: "object",
        properties: {
          practice_area: {
            type: "string",
            description:
              "Exact directory practice area when possible, e.g. Family Law, Immigration Law, Criminal Defense, Civil Litigation, Consumer Protection",
          },
          query: {
            type: "string",
            description: "Optional keywords (used only to rank, not to exclude all results)",
          },
          limit: {
            type: "integer",
            description: "Max lawyers to return (default 3, max 5)",
            minimum: 1,
            maximum: 5,
          },
        },
        required: ["practice_area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_practice_areas",
      description: "List Legalhubly directory practice areas available in Chicago.",
      parameters: { type: "object", properties: {} },
    },
  },
] as const;

/** Heuristic practice-area guess so we can pre-fetch lawyers even if the model skips tools. */
export function inferPracticeArea(text: string): string {
  const t = text.toLowerCase();
  if (/\b(visa|green card|asylum|ice|immigration|deport)\b/.test(t)) return "Immigration Law";
  if (/\b(divorce|custody|child support|dcfs|alimony|spouse)\b/.test(t)) return "Family Law";
  if (/\b(dui|arrest|warrant|criminal|felony|misdemeanor|charged)\b/.test(t)) return "Criminal Defense";
  if (/\b(ticket|traffic|speeding)\b/.test(t)) return "Traffic Violations";
  if (/\b(injury|car crash|accident|slip|fall|hurt)\b/.test(t)) return "Personal Injury";
  if (/\b(fired|harassment|wage|employer|wrongful)\b/.test(t)) return "Employment Law";
  if (/\b(llc|contract|partner|business|startup)\b/.test(t)) return "Business Law";
  if (/\b(evict|landlord|tenant|rent|security deposit)\b/.test(t)) return "Landlord Tenant";
  if (/\b(will|trust|probate|estate)\b/.test(t)) return "Estate Planning";
  if (/\b(house|title|zoning|real estate|closing)\b/.test(t)) return "Real Estate Law";
  if (/\b(irs|tax)\b/.test(t)) return "Tax Law";
  if (/\b(stolen|theft|thief|lost|scam|fraud|refund|warranty|consumer)\b/.test(t)) {
    return "Civil Litigation";
  }
  return "Civil Litigation";
}

export function wantsLawyerMatch(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 8) return false;
  // Pure product FAQ — don't force search
  if (/^(how (do|does|can)|what is|explain|where is|help with (the )?app|sign ?up|login|book)/.test(t) &&
      !/\b(lawyer|attorney|case|stolen|theft|divorce|arrest|visa)\b/.test(t)) {
    return false;
  }
  return (
    /\b(lawyer|attorney|legal|sue|court|stolen|theft|lost|divorce|custody|arrest|visa|injury|fired|evict|help me|find|match)\b/.test(t) ||
    t.split(/\s+/).length >= 6
  );
}

export async function runMatchTool(
  serviceClient: SupabaseClient,
  name: string,
  argsJson: string,
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    args = {};
  }

  if (name === "list_practice_areas") {
    return JSON.stringify({
      practice_areas: [
        "Immigration Law", "Family Law", "Criminal Defense", "Personal Injury",
        "Employment Law", "Business Law", "Real Estate Law", "Estate Planning",
        "Civil Litigation", "Bankruptcy", "Tax Law", "Intellectual Property",
        "Medical Malpractice", "Consumer Protection", "Traffic Violations",
        "Landlord Tenant", "Education Law", "Environmental Law", "Military Law",
        "International Law",
      ],
      market: "Chicago, Illinois only",
    });
  }

  if (name === "search_chicago_lawyers") {
    const practiceArea = typeof args.practice_area === "string" ? args.practice_area.trim() : "";
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const limit = Math.min(5, Math.max(1, Number(args.limit) || 3));

    const fetchRows = async (area: string) => {
      let q = serviceClient
        .from("lawyers")
        .select(
          "id, name, firm, practice_areas, rating, review_count, experience_years, availability_status, short_description, website_url, consultation_fee, verified",
        )
        .eq("city", "Chicago")
        .order("rating", { ascending: false })
        .limit(40);

      if (area) {
        q = q.contains("practice_areas", [area]);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    };

    let rows: Awaited<ReturnType<typeof fetchRows>> = [];
    try {
      if (practiceArea) {
        rows = await fetchRows(practiceArea);
      }
      // Fallback areas for theft / consumer-ish issues
      if (rows.length === 0 && practiceArea === "Civil Litigation") {
        rows = await fetchRows("Consumer Protection");
      }
      if (rows.length === 0) {
        rows = await fetchRows("");
      }
    } catch (e) {
      return JSON.stringify({
        error: e instanceof Error ? e.message : "search failed",
        lawyers: [],
      });
    }

    // Soft rank by query tokens — never empty the list because of keywords
    if (query && rows.length) {
      const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
      if (tokens.length) {
        rows = [...rows].sort((a, b) => {
          const score = (l: typeof a) => {
            const hay = [l.name, l.firm, l.short_description, ...(l.practice_areas || [])]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return tokens.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
          };
          const d = score(b) - score(a);
          if (d !== 0) return d;
          return Number(b.verified) - Number(a.verified) || (b.rating || 0) - (a.rating || 0);
        });
      }
    } else {
      rows.sort((a, b) => {
        const v = Number(b.verified) - Number(a.verified);
        if (v !== 0) return v;
        return (b.rating || 0) - (a.rating || 0);
      });
    }

    const scored = rows.map((l) => {
      let score = 0;
      const why: string[] = [];
      if (practiceArea && (l.practice_areas || []).includes(practiceArea)) {
        score += 40;
        why.push(`Practices ${practiceArea}`);
      }
      if (l.verified) {
        score += 12;
        why.push("Verified listing");
      }
      const rating = Number(l.rating) || 0;
      if (rating >= 4.5) {
        score += 14;
        why.push(`${rating.toFixed(1)}★ rated`);
      }
      if ((l.review_count || 0) >= 10) {
        score += 5;
        why.push(`${l.review_count} reviews`);
      }
      if ((l.experience_years || 0) >= 8) {
        score += 5;
        why.push(`${l.experience_years}+ years`);
      }
      if (l.availability_status === "available") {
        score += 6;
        why.push("Available to book");
      }
      score = Math.min(100, Math.round(score));
      if (!why.length) why.push("Chicago directory match");
      return { l, score, why };
    });

    scored.sort((a, b) => b.score - a.score || (Number(b.l.rating) || 0) - (Number(a.l.rating) || 0));

    const lawyers = scored.slice(0, limit).map(({ l, score, why }) => ({
      id: l.id,
      name: l.name,
      firm: l.firm,
      practice_areas: l.practice_areas,
      rating: l.rating,
      review_count: l.review_count,
      experience_years: l.experience_years,
      availability_status: l.availability_status,
      short_description: l.short_description,
      website_url: l.website_url,
      consultation_fee: l.consultation_fee,
      match_score: score,
      why_match: why.slice(0, 3),
      profile_path: `/client/lawyer/${l.id}`,
      profile_url: `https://www.legalhubly.com/client/lawyer/${l.id}`,
      find_path: practiceArea
        ? `/client/find-lawyers?matched=${encodeURIComponent(practiceArea)}&sort=best_match`
        : "/client/find-lawyers?sort=best_match",
      landing_path: practiceArea
        ? `/chicago/${practiceArea.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`
        : "/client/find-lawyers",
    }));

    return JSON.stringify({
      count: lawyers.length,
      practice_area: practiceArea || null,
      lawyers,
      instruction:
        lawyers.length > 0
          ? "REQUIRED: List these lawyers by NAME and FIRM. For each include rating, one why_match reason, and profile_url. Do not skip names."
          : "No matches — suggest /client/find-lawyers browse.",
    });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}
