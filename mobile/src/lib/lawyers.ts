import { supabase } from "./supabase";

export const LAWYER_PAGE_SIZE = 40;

export type LawyerListItem = {
  id: string;
  name: string;
  firm: string;
  avatar_initials: string;
  verified: boolean;
  practice_areas: string[];
  experience_years: number;
  city: string | null;
  state: string | null;
  languages: string[];
  avg_response_hours: number;
  availability_status: string;
  rating: number;
  review_count: number;
  short_description: string | null;
  consultation_fee: number | null;
};

export type LawyerProfile = LawyerListItem & {
  bio: string | null;
  website_url: string | null;
  hourly_rate: number | null;
  user_id: string | null;
  specialization_tags: string[];
  jurisdictions: string[];
};

const LIST_COLS =
  "id, name, firm, avatar_initials, verified, practice_areas, experience_years, city, state, languages, avg_response_hours, availability_status, rating, review_count, short_description, consultation_fee";

const PROFILE_COLS = `${LIST_COLS}, bio, website_url, hourly_rate, user_id, specialization_tags, jurisdictions`;

export async function fetchChicagoLawyers(opts: {
  page: number;
  practiceArea?: string | null;
  query?: string;
}): Promise<{ rows: LawyerListItem[]; hasMore: boolean }> {
  const from = opts.page * LAWYER_PAGE_SIZE;
  const to = from + LAWYER_PAGE_SIZE - 1;

  let q = supabase
    .from("lawyers")
    .select(LIST_COLS)
    .eq("city", "Chicago")
    .order("rating", { ascending: false })
    .range(from, to);

  if (opts.practiceArea) {
    q = q.contains("practice_areas", [opts.practiceArea]);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows = (data || []) as LawyerListItem[];
  const needle = opts.query?.trim().toLowerCase();
  if (needle && !opts.practiceArea) {
    const tokens = needle.split(/\s+/).filter((t) => t.length > 2);
    rows = rows.filter((l) => {
      const hay = [l.name, l.firm, ...(l.practice_areas || []), l.short_description || ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle) || tokens.some((t) => hay.includes(t));
    });
  }

  return { rows, hasMore: (data || []).length === LAWYER_PAGE_SIZE };
}

export async function fetchLawyer(id: string): Promise<LawyerProfile | null> {
  const { data, error } = await supabase.from("lawyers").select(PROFILE_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LawyerProfile | null) ?? null;
}

export async function fetchSavedLawyerIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("saved_lawyers").select("lawyer_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data || []).map((r: { lawyer_id: string }) => r.lawyer_id);
}

export async function toggleSavedLawyer(userId: string, lawyerId: string, currentlySaved: boolean) {
  if (currentlySaved) {
    const { error } = await supabase.from("saved_lawyers").delete().eq("user_id", userId).eq("lawyer_id", lawyerId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("saved_lawyers").insert({ user_id: userId, lawyer_id: lawyerId });
  if (error) throw new Error(error.message);
}

export async function fetchSavedLawyers(userId: string): Promise<LawyerListItem[]> {
  const ids = await fetchSavedLawyerIds(userId);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("lawyers").select(LIST_COLS).in("id", ids);
  if (error) throw new Error(error.message);
  const byId = new Map((data || []).map((l) => [l.id, l as LawyerListItem]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as LawyerListItem[];
}
