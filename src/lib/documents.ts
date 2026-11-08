import { supabase } from "@/integrations/supabase/client";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Upload to the user's storage folder and record it; removes the object if the row insert fails. */
export async function uploadUserDocument(userId: string, file: File): Promise<string | null> {
  if (file.size > MAX_DOCUMENT_BYTES) return "Max 10MB";
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
  if (uploadErr) return "Upload failed";

  const { error: insertErr } = await supabase.from("documents").insert({
    owner_user_id: userId,
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    path,
    bucket: "documents",
  });
  if (insertErr) {
    await supabase.storage.from("documents").remove([path]);
    return "Upload failed — please try again";
  }
  return null;
}
