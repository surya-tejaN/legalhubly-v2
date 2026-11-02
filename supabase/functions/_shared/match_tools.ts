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
            description: "Max lawyers to return (default 10, max 10) — top nearby matches",
            minimum: 1,
            maximum: 10,
          },
          language: {
            type: "string",
            description: "Preferred language the client wants to speak with the lawyer (e.g. Spanish, Polish). Ranks speakers first; never excludes.",
          },
          budget_sensitive: {
            type: "boolean",
            description: "True when the client mentions cost limits — ranks free / low consultation fees first.",
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

export type PracticeTriage = { primary: string; secondary?: string; fallback?: boolean };

/** Heuristic practice-area guess aligned with TRAINING gold labels. */
export function inferPracticeTriage(text: string): PracticeTriage {
  const t = text.toLowerCase();

  // Common Chicago Spanish phrasings
  if (/(inmigraci|deportaci|asilo\b|residencia permanente)/.test(t)) return { primary: "Immigration Law" };
  if (/(divorcio|custodia|manutenci[oó]n)/.test(t)) return { primary: "Family Law" };
  if (/(accidente|choque|lesi[oó]n)/.test(t)) return { primary: "Personal Injury" };
  if (/(desalojo|casero|arrendador|dep[oó]sito de seguridad)/.test(t)) return { primary: "Landlord Tenant" };
  if (/(me despidieron|despido|salario|mi jefe)/.test(t)) return { primary: "Employment Law" };
  if (/(arrestad[oa]|me arrestaron|cargos criminales)/.test(t)) return { primary: "Criminal Defense" };

  // Immigration
  if (
    /\b(visa|green card|asylum|immigration|deport|h-?1b|uscis|daca|removal proceeding|u-?visa|vawa)\b/.test(t) ||
    /\bice (detention|hold|raid)\b/.test(t)
  ) {
    const secondary = /\b(divorce|custody|domestic|abuse)\b/.test(t) ? "Family Law" : undefined;
    return { primary: "Immigration Law", secondary };
  }

  // Family
  if (
    /\b(divorce|custody|child support|dcfs|alimony|spouse|prenup|adoption|guardianship|order of protection)\b/.test(t)
  ) {
    const secondary = /\b(arrest|charged|battery)\b/.test(t) ? "Criminal Defense" : undefined;
    return { primary: "Family Law", secondary };
  }

  // Military before civilian criminal (court-martial ≠ Cook County criminal)
  if (/\b(court-?martial|military justice|ucmj|va benefits)\b/.test(t)) {
    return { primary: "Military Law" };
  }

  // Criminal / traffic (order matters)
  const hasCriminalSignal =
    /\b(arrested|warrant|felony|misdemeanor|was charged|bail|assault|domestic battery)\b/.test(t) ||
    (/\barrest\b/.test(t) && !/\bno arrest\b/.test(t));
  if (hasCriminalSignal) {
    const secondary = /\b(evict|landlord|lockout)\b/.test(t) ? "Landlord Tenant" : undefined;
    return { primary: "Criminal Defense", secondary };
  }
  if (/\bdui\b/.test(t) && !/\bticket only\b/.test(t)) {
    return { primary: "Criminal Defense", secondary: "Traffic Violations" };
  }
  if (/\b(ticket|traffic|speeding|red light|camera ticket)\b/.test(t) && !/\bdui\b/.test(t)) {
    return { primary: "Traffic Violations" };
  }

  // Med mal before general PI
  if (
    /\b(medical malpractice|surgical error|hospital negligence|birth injury|botched surgery|messed up my surgery|misdiagnosis|doctor (errored|negligent))\b/.test(t) ||
    (/\b(surgery|surgeon|hospital)\b/.test(t) && /\b(messed up|malpractice|negligence|error)\b/.test(t))
  ) {
    return { primary: "Medical Malpractice", secondary: "Personal Injury" };
  }

  // Personal Injury — typos + crash language + workers' comp style
  const piHit =
    /\b(injury|injur|car crash|accident|accidnet|acident|accidents|slip|fall|hurt|rear-?ended|broke my|whiplash|car wreck|hit by|hit and run|dog bite|workers?\s*comp)\b/.test(t) ||
    /\baccid/.test(t) ||
    (/\b(crash|wreck|collision)\b/.test(t) && !/\b(plane|stock|data)\b/.test(t));
  if (piHit) {
    const secondary = /\b(fired|retaliat|reported)\b/.test(t) ? "Employment Law" : undefined;
    return { primary: "Personal Injury", secondary };
  }

  // Employment
  if (
    /\b(fired|harassment|wage|employer|wrongful|overtime|discrimination|eeoc|non-?compete)\b/.test(t)
  ) {
    const secondary = /\b(hurt|injur|accident|workers?\s*comp)\b/.test(t) ? "Personal Injury" : undefined;
    return { primary: "Employment Law", secondary };
  }

  // Housing
  if (/\b(evict|landlord|tenant|security deposit|rlto|lockout|no heat|mold)\b/.test(t)) {
    return { primary: "Landlord Tenant" };
  }

  // Estate / tax / bankruptcy
  if (/\b(will|trust|probate|estate planning|power of attorney)\b/.test(t)) {
    return { primary: "Estate Planning" };
  }
  if (/\b(irs|tax audit|tax debt)\b/.test(t)) return { primary: "Tax Law" };
  if (/\b(chapter\s*7|chapter\s*13|bankruptcy|foreclosure)\b/.test(t)) {
    const secondary = /\bforeclos/.test(t) ? "Real Estate Law" : undefined;
    return { primary: "Bankruptcy", secondary };
  }

  // Real estate / IP / niche
  if (/\b(condo|title|zoning|mortgage|closing|real estate|hoa|earnest money)\b/.test(t)) {
    return { primary: "Real Estate Law" };
  }
  if (/\b(patent|trademark|copyright|trade secret|\bip\b|logo)\b/.test(t)) {
    return { primary: "Intellectual Property" };
  }
  if (/\b(iep|title ix|504|student rights)\b/.test(t)) return { primary: "Education Law" };
  if (/\b(epa|pollution|environmental|brownfield)\b/.test(t)) {
    return { primary: "Environmental Law" };
  }
  if (/\b(ofac|sanctions|cross-border|international law|customs)\b/.test(t)) {
    return { primary: "International Law" };
  }

  // Consumer / business / civil
  if (/\b(refund|warranty|scam|recall|consumer|debt collector|debt collection)\b/.test(t)) {
    return { primary: "Consumer Protection", secondary: "Civil Litigation" };
  }
  if (/\b(llc|startup|partnership|shareholder|business|non-?compete)\b/.test(t)) {
    return { primary: "Business Law" };
  }
  if (/\b(contract|partner dispute|unpaid invoice)\b/.test(t)) {
    return { primary: "Business Law", secondary: "Civil Litigation" };
  }
  // Stolen/lost property without criminal charges → civil / consumer
  if (/\b(stolen|theft|thief|lost bag|lost property|purse stolen)\b/.test(t)) {
    return { primary: "Civil Litigation", secondary: "Consumer Protection" };
  }
  if (/\b(lawsuit|sue|litigation|dispute|mediation|breach)\b/.test(t)) {
    return { primary: "Civil Litigation" };
  }

  return { primary: "Civil Litigation", fallback: true };
}

export function inferPracticeArea(text: string): string {
  return inferPracticeTriage(text).primary;
}

/** Latest message wins; earlier user turns fill in when the latest has no legal signal. */
export function inferTriageFromConversation(userTexts: string[]): PracticeTriage {
  const latest = userTexts[userTexts.length - 1] || "";
  const direct = inferPracticeTriage(latest);
  if (!direct.fallback || userTexts.length < 2) return direct;
  return inferPracticeTriage(userTexts.slice(-4).join(" \n "));
}

export function isFollowUpMatchRequest(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t || t.length > 60) return false;
  return /^(yes|yeah|yep|ya|ok|okay|sure|please|pls|go ahead|do it|show (me )?(them|lawyers|more|options)|find (me )?(one|a lawyer|lawyers|someone)|more|next|who should i (call|contact)|s[ií]|por favor)\b/.test(t);
}

export type Urgency = { level: "emergency" | "time_sensitive"; reasons: string[] } | null;

export function detectUrgency(text: string): Urgency {
  const t = text.toLowerCase();
  const emergency: string[] = [];
  if (/\b(kill myself|suicid\w*|end my life|want to die|hurt myself)\b/.test(t)) emergency.push("self_harm");
  if (
    /\b(hitting|beating|choking|strangl\w*|attacking|threatening to kill|going to kill|has a gun|with a knife)\b/.test(t) ||
    /\b(in danger|not safe|unsafe) (right now|at home|tonight)\b/.test(t)
  ) {
    emergency.push("physical_danger");
  }
  if (emergency.length) return { level: "emergency", reasons: emergency };

  const urgent: string[] = [];
  if (/\b(court|hearing|trial)\b.{0,25}\b(today|tomorrow|this week|monday|tuesday|wednesday|thursday|friday)\b/.test(t)) {
    urgent.push("court_date_soon");
  }
  if (/\b(detained|in custody|in jail|locked up|ice (took|picked up|detained|arrested))\b/.test(t)) {
    urgent.push("custody_or_detention");
  }
  if (/\b(eviction notice|\d+-?day notice|summons|served (with )?(papers|a lawsuit)|sheriff)\b/.test(t)) {
    urgent.push("notice_served");
  }
  if (/\b(deadline|statute of limitations|running out of time|expires? (today|tomorrow|soon))\b/.test(t)) {
    urgent.push("deadline_mentioned");
  }
  return urgent.length ? { level: "time_sensitive", reasons: urgent } : null;
}

const LANGUAGE_PATTERNS: Array<[string, RegExp]> = [
  ["Spanish", /\b(spanish|espa[ñn]ol|abogad[oa]s?|necesito|ayuda|tengo un|mi (esposo|esposa|casero|jefe))\b/],
  ["Polish", /\b(polish|polski|prawnik)\b/],
  ["Chinese", /\b(chinese|mandarin|cantonese)\b/],
  ["Arabic", /\b(arabic)\b/],
  ["Hindi", /\b(hindi)\b/],
  ["Urdu", /\b(urdu)\b/],
  ["Korean", /\b(korean)\b/],
  ["Tagalog", /\b(tagalog|filipino)\b/],
  ["Russian", /\b(russian)\b/],
  ["Ukrainian", /\b(ukrainian)\b/],
  ["Vietnamese", /\b(vietnamese)\b/],
  ["French", /\b(french)\b/],
  ["Gujarati", /\b(gujarati)\b/],
  ["Telugu", /\b(telugu)\b/],
];

export type ClientPreferences = { language?: string; budgetSensitive: boolean };

export function detectPreferences(text: string): ClientPreferences {
  const t = text.toLowerCase();
  const language = LANGUAGE_PATTERNS.find(([, re]) => re.test(t))?.[0];
  const budgetSensitive =
    /\b(free consult\w*|cheap|afford|low[- ]cost|low income|no money|pro bono|can'?t pay|broke|budget|legal aid|sin dinero|gratis)\b/.test(t);
  return { language, budgetSensitive };
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
    /\b(lawyer|attorney|legal|sue|court|stolen|theft|lost|divorce|custody|arrest|visa|injury|injur|accident|accid|crash|wreck|fired|evict|help me|find|match|contact)\b/.test(t) ||
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
    const limit = Math.min(10, Math.max(1, Number(args.limit) || 10));
    const language = typeof args.language === "string" ? args.language.trim().toLowerCase() : "";
    const budgetSensitive = args.budget_sensitive === true;

    const fetchRows = async (area: string) => {
      let q = serviceClient
        .from("lawyers")
        .select(
          "id, name, firm, practice_areas, rating, review_count, experience_years, availability_status, short_description, website_url, consultation_fee, verified, languages",
        )
        .eq("city", "Chicago")
        .order("rating", { ascending: false })
        .limit(80);

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
        why.push("Actively listed");
      }
      const speaks = (l.languages || []).find((x: string) => x.toLowerCase() === language);
      if (language && speaks) {
        score += 20;
        why.unshift(`Speaks ${speaks}`);
      }
      const fee = l.consultation_fee == null ? null : Number(l.consultation_fee);
      if (budgetSensitive && fee !== null) {
        if (fee === 0) {
          score += 12;
          why.unshift("Free consultation");
        } else if (fee <= 100) {
          score += 6;
          why.push(`$${fee} consultation`);
        }
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
      languages: l.languages,
      match_score: score,
      why_match: why.slice(0, 3),
      profile_path: `/client/lawyer/${l.id}`,
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
      language_requested: language || null,
      language_matches: language
        ? lawyers.filter((l) => (l.languages || []).some((x: string) => x.toLowerCase() === language)).length
        : null,
      lawyers,
      instruction:
        lawyers.length > 0
          ? `REQUIRED: List ALL ${lawyers.length} lawyers (up to top 10) numbered 1–${lawyers.length} by NAME and FIRM. For each: ★rating, one short why_match, profile_path (/client/lawyer/{id}). Compact bullets. End with Find Lawyers CTA + one-line disclaimer. No booking promises.`
          : "No matches — suggest /client/find-lawyers browse.",
    });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}
