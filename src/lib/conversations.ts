import { supabase } from "@/integrations/supabase/client";

/** Find existing 1:1 thread between two users, or create one. */
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

  const { data: myParts, error: myErr } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", myUserId);

  if (myErr) return { conversationId: null, error: myErr.message };

  const myConvoIds = (myParts || []).map((p) => p.conversation_id);
  if (myConvoIds.length > 0) {
    const { data: shared } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myConvoIds)
      .limit(1)
      .maybeSingle();

    if (shared?.conversation_id) {
      return { conversationId: shared.conversation_id };
    }
  }

  const { data: convo, error: convoErr } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (convoErr || !convo) {
    return { conversationId: null, error: convoErr?.message || "Could not start conversation." };
  }

  const { error: meErr } = await supabase.from("conversation_participants").insert({
    conversation_id: convo.id,
    user_id: myUserId,
    role: "client",
  });
  if (meErr) return { conversationId: null, error: meErr.message };

  const { error: themErr } = await supabase.from("conversation_participants").insert({
    conversation_id: convo.id,
    user_id: otherUserId,
    role: "lawyer",
  });
  if (themErr) return { conversationId: null, error: themErr.message };

  return { conversationId: convo.id };
}
