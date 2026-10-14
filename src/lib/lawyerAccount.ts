import { supabase } from "@/integrations/supabase/client";

/** Resolve the lawyers.id row linked to the signed-in auth user. */
export async function fetchMyLawyerId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("lawyers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[lawyerAccount]", error.message);
    return null;
  }
  return data?.id ?? null;
}
