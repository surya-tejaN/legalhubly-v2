import { supabase } from "@/integrations/supabase/client";

/** Find existing 1:1 thread between two users, or create one (server-side RPC). */
export async function getOrCreateDirectConversation(
  myUserId: string,
  otherUserId: string,
): Promise<{ conversationId: string | null; error?: string }> {
  if (!myUserId || !otherUserId) {
    return { conversationId: null, error: "Missing user." };
  }
  if (myUserId === otherUserId) {
    return { conversationId: null, error: "Cannot message yourself." };
  }

  const { data, error } = await supabase.rpc("create_direct_conversation", {
    p_other_user_id: otherUserId,
  });

  if (error) {
    return { conversationId: null, error: error.message || "Could not start conversation." };
  }

  if (!data || typeof data !== "string") {
    return { conversationId: null, error: "Could not start conversation." };
  }

  return { conversationId: data };
}
